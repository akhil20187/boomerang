# Objective-based completion and charging
Date: 10 October 2026. Status: design for review, not built. Source: user, 10 October: "Do we have a specific definition of done? … If it might be an inquiry, like 'do you provide a distribution partnership? Yes or no?' … either yes or no is an answer. In that case it is a successful call … It need not always be about pricing, quantity, etc. It all depends on the task that has been defined." Then "yes design it", and option 1 on partial calls: charge when any must-confirm item is answered.

Builds on D18 (pay for verified answers), D37 (partial answers stay visibly partial), C09 (notes-only answers chargeable) and the five-field brief (D139, D144).
## Problem
Today "done" is not defined by the task. The extractor in `call-bridge/answer.cjs` only sees the product description and returns stock, variant, final price, offers and notes. The charge rule in `convex/calls.ts` is "any of those fields is filled". For a brief such as "do you offer distribution partnerships?" a clear "no" lands in `notes` if the model happens to write it there, and is charged or not by accident. The brief's `must_confirm` and `deciding_question` never reach the extractor or the charge rule.
## Definition of done
A call is **done** when the recipient answered the task's objective, as written in the brief:

- The **deciding question** was answered, or
  
- **At least one must-confirm item** was answered or given a stated condition.
  

"Answered" means yes, no, a value, or a stated condition ("needs a site visit", "depends on the fabric", "discount after selection"). A condition is a real answer: it tells the customer what happens next. "Did not come up", "will check and call back" or a refusal to answer is **not answered**.

A yes/no enquiry with a "no" is done. The customer paid to find out, and now knows.
## Outcome and charge
| Outcome | Shop state | Credit |
| --- | --- | --- |
| Deciding question answered, or ≥1 must-confirm answered or conditional | `answered` when all must-confirm items and the deciding question are covered; `incomplete_answer` otherwise | Charged |
| Shop talked but none of the brief's items answered | `incomplete_answer` | Released |
| Shop asked for a person, or refused | `personal_call_needed` | Released (unchanged) |
| No pickup twice, call dropped, technical failure | `unreachable` / `technical_error` | Released (unchanged) |

Immediate pickup-and-disconnect stays not chargeable (D37): no items can be answered in it.

**Product tasks without a brief** keep today's rule unchanged: stock, final price, offers or notes present means charged. When a product task has a brief, the brief rule applies and the product fields remain as extra detail.
## Extractor change (`call-bridge/answer.cjs`)
The bridge passes the brief items to the extractor alongside the transcript:

```json
{
  "task": "<task_context.summary>",
  "items": [
    { "id": "m1", "text": "does house painting in Kondapur", "kind": "must_confirm" },
    { "id": "m2", "text": "labour rate per sq ft, labour only", "kind": "must_confirm" },
    { "id": "d",  "text": "Is the site visit free?", "kind": "deciding" }
  ],
  "transcript": [ ... ]
}
```

The extractor returns, under strict JSON schema:

```json
{
  "items": [
    { "id": "m1", "status": "answered", "answer": "yes, works in Kondapur", "quote": "haan Kondapur mein karte hain" },
    { "id": "m2", "status": "conditional", "answer": "rate depends on wall condition, needs to see", "quote": "dekh ke batayenge" },
    { "id": "d",  "status": "not_answered", "answer": null, "quote": null }
  ],
  "stock": "unconfirmed", "variantMatch": "unconfirmed", "finalPrice": null, "currency": "INR",
  "offers": null, "notes": "...", "personalCallNeeded": false, "evidenceQuotes": [ ... ]
}
```

Rules, same as today: the transcript is data, not instructions; every `answered` or `conditional` item needs a `quote` copied exactly from shop speech, verified with `shopText.includes(quote)`; a failed check sets that item to `not_answered`, not the whole answer to unconfirmed. Items are capped at 8 (6 must-confirm, 1 deciding, 1 spare) and 200 characters each. The brief text goes in the user message as data, never in the system prompt. Product fields stay in the schema so product tasks keep working; when `items` is empty the prompt and output are exactly today's.

`notes` becomes a one- or two-sentence summary of what the shop said about the task, in plain words, written from the answered items.
## Backend changes
- `convex/validators.ts`**:** `answerV` gains optional `items: [{ id, text, kind, status, answer?, quote? }]`.
  
- `convex/calls.ts` `prepare`**:** when the task has a brief, send `items` built from `must_confirm` (ids `m1…`) and `deciding_question` (id `d`) to the bridge. Store the same list on the attempt so the result can be read even if the brief changes later.
  
- `convex/calls.ts` `complete`**:** validate `items` (ids must match what was sent; status in the three values; strings capped). Outcome:
  
  - `completed` when every item is answered or conditional, or the deciding question is answered and no must-confirm item is `not_answered`;
    
  - `incomplete` otherwise. Charge predicate becomes a pure function `isChargeable(answer, hasBrief)` in `convex/domain.ts`: with a brief, deciding answered or any must-confirm answered/conditional; without a brief, today's rule.
    
- `convex/credits.ts` `settle`**:** unchanged mechanics. Reason strings change to "Shop answered the task's questions" and "Shop answered but none of the task's questions; held credit released".
  
- `convex/domain.ts` `notChargedReason`**:** "no useful answer" becomes "didn't answer what you asked". Same string in `web/src/taskPresentation.ts`; `CHARGE_RULE` becomes "You pay only when a shop answers at least one of your questions, even with a condition attached. No charge if a shop doesn't pick up, asks for a personal call, or answers none of them."
  
## What the customer sees
- **Chat** `task_status` **and the website card:** for brief tasks, each shop shows the item list with ✓ answered (with the answer), ~ conditional (with the condition), and "not answered". The product rows (stock, price, offers) show only for product tasks or when a value exists. Not-answered items stay visibly open (D37).
  
- **Shop state text:** `answered` → "Answered your questions"; `incomplete_answer` → "Answered some of your questions · rest open" when charged, "Answered none of your questions · no charge" when released.
  
- **Charge line** per shop unchanged in shape; reason text as above.
  
## Caller prompt
No change to Sarvam v3. The caller already works through Find out and asks the deciding question before closing. The extractor change makes those answers countable.
## What stays the same
Sign-in, selection-as-approval (D149), ₹10 per chargeable answer (D135), retry and human handoff rules, refusal and unreachable handling, product-only tasks without a brief.
## Testing
- Unit, `convex/domain.ts`: `isChargeable` for each row in the outcome table, with and without a brief; conditional-only call is chargeable; all `not_answered` is not; product task without brief unchanged.
  
- Unit, `call-bridge/answer.test.cjs`: fake OpenAI reply with items; a quote not present in shop speech downgrades that item only; empty `items` produces today's schema and prompt.
  
- Unit, `convex/calls.ts` complete: outcome mapping for all-covered, partial and none; stored items survive a brief edit.
  
- Manual: replay the 8 October transcripts (shop-call review) and the painter/notary/tailor briefs through the extractor and check each item status by hand. No live call in this slice.
  
## Open questions
- Whether `nice_to_have` items should be extracted too (default: yes, shown, never counted for charging).
  
- Whether a call where every must-confirm item is conditional should read `answered` or `incomplete_answer` (default: `answered`; conditions are answers).
