# Task intake and call brief: design

Date: 9 October 2026. Status: draft design from a brainstorming session; not implemented, not tested on a live call.

Builds on the agreed flow (D142), the five-field brief (D139) and the lessons in [the 8 October call review](../../engineering/2026-10-08-shop-call-review.md). Worked examples live in [the scenario briefs](2026-10-09-scenario-briefs.md).

## Problem

The two trial calls missed nuances: bundled questions got one "yes", a price arrived without a clear basis, a catalogue was promised with nowhere to send it, and the agent promised follow-up it could not control. The five-field brief says *what* to collect but not *which details each field must carry* for the call to be useful, and the agent had no rules for reacting to vague or conditional answers.

## Core rule

**Ask the customer only what the recipient will ask the agent before giving a useful answer.** Everything else stays with the recipient (supplier facts) or stays unknown.

For a painter that is area, scope, wall condition, who buys the paint, room size. For a phone it is exact model, colour, storage. The assistant works this list out per task type, not from a fixed checklist.

## The intake prompt: four steps

### 1. Outcome

Establish what counts as a useful answer. Offer concrete choices, for example: availability only, a rough price, a visit arranged. Everything downstream is judged against this outcome (D142). Do not collect details the outcome does not need.

### 2. Recipient's questions

List what this type of business asks before it can answer the outcome. Ask the customer those, one at a time, with concrete choices where possible.

- Use context already supplied; never re-ask.
- Accept "don't know". Record the fallback the agent will use on the call (for example: no room size, so ask for a per square foot rate instead of an estimate).
- Stop when the recipient's likely questions are covered. Unknown supplier facts are call questions, not customer questions.

### 3. Authority and follow-up

Confirm the limits before calling:

- Enquiry only. No booking, holding, ordering, payment or visit scheduled unless the customer explicitly authorises it (none authorised today).
- Customer contact details are not shared. The customer or their team calls back; the agent does not promise when.
- The agent cannot send or receive SMS, email or files. If the outcome needs a catalogue or document, ask the customer how they will receive it before the call, or record that receipt is unconfirmed.

### 4. In-call rules

These travel with every brief as shared guidance, outside the five fields:

- **Share the minimum.** Tell the recipient only what changes their answer (for example "labour only"). Everything else, including names, addresses, reasons and who else is involved, only if asked. Never share customer contact details.
- **State assumptions before asking price.** Say the conditions that change the number first (labour only, quantity, area). Otherwise the quote answers a different question.
- **Confirm the unit of any number.** Per square foot, per room, per box, total; with or without tax or material. Record the dependency if the recipient says "depends on selection"; do not press for an invented final figure.
- **One question per turn.** If one answer covers several facts, keep only what was actually said and clarify what matters.
- **Fit before price.** Check the recipient serves the area and does the work before asking cost.
- **Record conditions, not conclusions.** "Needs a site visit", "discount after selection", "available next week" are answers. Do not upgrade a broad yes into a confirmed match.
- **Role accuracy.** Relay only the follow-up the customer authorised. No timing promises, no "we will finalize".
- **Short recap, then end.** Repeat the one or two key facts, let the recipient correct them, thank them, end.
- Existing rules remain: truthful answer about automation, follow the recipient's language, respect a request to stop, no personal-call flag unless the recipient asks for a person.

## How a task becomes a brief

```
customer request
  -> step 1: outcome (one question with choices)
  -> step 2: recipient's questions, one at a time, accept unknowns
  -> step 3: confirm authority and follow-up channel
  -> fill the five fields (D139)
  -> attach shared in-call rules (step 4)
  -> calls -> summary (D142)
```

The five fields map as follows:

| Field | Comes from |
|---|---|
| Task context | step 2 answers plus known unknowns and their fallbacks |
| Call purpose | step 1 outcome, phrased as what to find out |
| Possible expected outcome | step 1, with the acceptable fallback answers |
| Who the agent represents | customer name or organisation; first name only for personal enquiries |
| Call recipient details | selected provider record; one per call |

## Summary rules

The post-call summary must separate confirmed facts, conditions, unanswered questions and the next step. A number is reported with its unit and conditions. Follow-up the agent proposed is not evidence of refusal or a personal-call request.

## Open questions

- How the assistant derives the recipient's likely questions for a task type it has not seen: a per-category list, or reasoning on the spot. Start with reasoning plus the worked examples; add lists if calls show gaps.
- Whether step 3 is asked every time or assumed from product defaults with a one-line notice. Default today: assume enquiry only and state it.
- How much of this belongs in the chat assistant prompt versus the calling agent prompt. The intake steps belong to the chat side; the in-call rules and the brief go to the caller.

## Not covered

No change to shop selection, sign-in, credit or call-start rules. No new outbound call authorised. Service-provider discovery is not part of the live product; these examples are design input only.

## Update 2026-10-12: home-visit location (D159)

For home-visit services the intake asks the area or locality ("Gachibowli, near DLF") and, optionally, the apartment or building name ("Skip" allowed). The call states the area only; the building name is shared only if the business asks for more location detail. Never a house or flat number, street address or the customer's full name, and never "come to <pincode>". Products and in-store enquiries are unchanged. Implemented in `convex/intake.ts` (`location` on the brief, `locationLines`); see [the intake prompt](../../prompts/task-intake-prompt.md).
