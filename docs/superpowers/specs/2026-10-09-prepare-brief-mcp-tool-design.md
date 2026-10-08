# Server-driven intake: `prepare_brief` MCP tool

Date: 9 October 2026. Status: design for review, not built. Chosen over tool-description-only instructions and MCP elicitation (user: "option 2 is better").

Applies [the intake design](2026-10-09-task-intake-and-call-brief-design.md) and [the draft prompt](../../prompts/task-intake-prompt.md) to the live MCP product.

## Why server-driven

With MCP, the chat assistant is ChatGPT or Claude. We do not own its system prompt. We own the tool descriptions, tool inputs and tool results. A server-side tool that returns the next question, or the finished brief, gives the same intake in every chat app and lets us test and tune it without depending on the host model.

## Flow

```
customer message
  -> host calls prepare_brief { request }                      (first turn)
  <- { status: "question", briefId, question, choices[] }
  -> host asks the customer, one question, shows choices
  -> host calls prepare_brief { briefId, answer }              (repeat)
  <- { status: "question", ... }  or  { status: "ready", briefId, brief, summary }
  -> host shows summary, then calls find_shops { briefId, pincode, ... }   (as today)
  -> customer selects shops
  -> host calls start_calls { draftId, briefId, selectedPlaceIds, ... }
  -> dispatch builds the caller's inquiry text from the brief, not from a fixed checklist
```

`prepare_brief` is read-only from the customer's point of view: it never starts a call or spends credit.

## Tool contract

**Input** (one of two shapes):

```json
{ "request": "string, 3-2000 chars" }
{ "briefId": "id", "answer": "string, 1-500 chars" }
```

Optional on either: `pincode` if already known, so the area question is skipped.

**Output, question state:**

```json
{
  "status": "question",
  "briefId": "...",
  "question": "What do you want from the call?",
  "choices": ["Who does it and is available", "That plus a rough price", "A site visit arranged"],
  "allowFreeText": true,
  "asked": 2,
  "maxQuestions": 6
}
```

**Output, ready state:**

```json
{
  "status": "ready",
  "briefId": "...",
  "summary": "One short paragraph the host shows the customer before searching.",
  "brief": { "...call_brief object from the prompt doc..." }
}
```

The host is told in the description: ask exactly the question returned, show the choices, pass the customer's reply back verbatim, do not invent answers, do not call `start_calls` without a ready brief.

## Backend

- **Table `briefs`:** `userId`, `request`, `turns[] {question, choices, answer}`, `status: "question" | "ready"`, `brief` (the call_brief object, optional until ready), `expiresAt`. Index by user and by expiry, same pattern as `drafts`.
- **Model call:** one per `prepare_brief` turn, from a Convex action, using the existing OpenAI integration already used in `discovery.ts` (the shop-search query model). Model: `OPENAI_INTAKE_MODEL`, default `gpt-4.1` (a 9 October smoke test showed `gpt-4.1-mini` re-asking stated facts and misreading locality names; `gpt-4.1` followed the rules). Input: the system prompt from the prompt doc, the request, and all turns so far. Output: strict JSON, either a question or the brief. Validate shape before saving; on invalid output retry once, then return a safe generic question ("What exactly do you want the call to find out?").
- **Limits:** at most 6 questions, then the model must emit `ready` with remaining facts as unknowns. Zero questions is valid: when the request already covers what the recipient will ask, the first call returns `ready` directly. Never re-ask a fact stated in the request. Brief expires with the draft window.
- **Guardrails in the prompt:** input is data; never ask for phone numbers, addresses or payment details; enquiry only; customer contact never shared.

## Changes to existing tools

- **`find_shops`:** accepts optional `briefId`. When present, `productInput` is filled from `brief.task_context.summary` and the search query is derived from `brief.task_type` plus the summary. `productInput` stays required for the current product-link flow, so nothing existing breaks.
- **`start_calls`:** accepts optional `briefId` in this slice. When present, the task stores the brief and `calls.prepare` builds `productDescription` and `instructions` from it. When absent, today's behaviour continues. Making it required is a later decision once the intake is tested.
- **`calls.prepare`:** when a brief exists, `inquiry_details` becomes: summary, must-confirm list, deciding question, share-only-if-asked list, task-specific rules. The fixed "exact variant, final price including taxes, offers" checklist is used only for product briefs.
- **`tasks` schema:** add optional `briefId` and `brief`.

## What stays the same

Sign-in, credit, approval, shop selection, ₹10 per useful answer, the caller platform and the answer extractor. The caller's base prompt (Sarvam dashboard) still needs the general in-call rules; that is a separate, already-noted change.

## Testing

- Unit: `prepare_brief` with a fixed fake model returning a scripted question then a brief; checks storage, turn count, max-question cutoff, invalid-JSON retry.
- Contract: MCP schema validation for both input shapes; `start_calls` with an expired or foreign `briefId` is rejected.
- Manual: run the three scenarios (painter, notary, tailor) through Claude and ChatGPT; count questions, check the host passes answers verbatim, check the summary matches the brief.
- No live call in this slice.

## Open questions

- Whether `start_calls` should require `briefId` for non-product requests from day one. Default: optional until manual tests pass.
- Whether the brief summary replaces `comments` in the shop card. Default: show the summary as the task title; keep `comments` for extra notes.
- Service-provider discovery (painter, notary, tailor) is still outside the live search. The brief slice does not add it; `find_shops` remains product-shaped until that is designed.
