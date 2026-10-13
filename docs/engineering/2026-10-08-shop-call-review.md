# Review of the two shop calls — 8 October 2026

Both shops answered and provided useful information. The strongest observed improvements concern asking the right questions, completing the catalogue follow-up, and keeping the saved answers faithful to what the shop actually confirmed.

## Evidence and limits

- Task: `ks7fzd4wr6b6jtrh1ttnjy3gkx8fwt3s`.
- MiAmore Gifts & Hampers: attempt `k174ehs0c4skxqx5yvehbb3j1h8fwjpm`, 74.74 seconds, 8 agent turns and 7 shop turns.
- BBR Gifting Matrix – Corporate Gifts Hyderabad: attempt `k170enhdzb3xgk4j1wdvzn6erx8fx1sm`, 94.43 seconds, 7 agent turns and 6 shop turns.
- Both private WAV files were retrieved successfully. Their measured durations match the provider's call durations. Both calls used Sarvam agent `Conversatio-a86d995b-df0d`, version **2**, and ended with provider reason `AGENT_ENDS`.
- Reviewed the saved provider transcripts, the bridge's extracted answers, database outcomes, the code that supplies call instructions, and the committed-v2 dashboard prompt/settings.
- After the user explicitly approved “Send it,” both complete recordings were processed with OpenAI `gpt-audio-1.5`, with request storage disabled. Short disputed passages were also processed with `gpt-4o-transcribe`. This is an automated audio review, not a human listening assessment. The analyses and original transcripts are preserved separately; uncertain words are not treated as settled facts.
- No calls placed, live prompt changed, result corrected, or charge changed during this review.

Private source files, including the original Hindi/English transcripts, are in [the local evidence folder](../../call-bridge/.state/shop-review-2026-10-08/). They are excluded from Git. Readable English translations appear below; they preserve ambiguities rather than resolve them.

## Audio findings

- The automated audio pass describes both calls as understandable, with natural short pauses, little background noise, no noticeable overlapping speech, and no premature ending. MiAmore's delivery was described as occasionally slightly hurried; BBR's pace as moderate. These are model assessments, not measured performance or proof the same settings work in noisier calls.
- It supports the Hindi conversation at MiAmore and the Hindi-to-English transition at BBR.
- **MiAmore's first price response is disputed.** Sarvam records “OK, available”; the full audio model hears “2000.” The targeted speech-transcription pass omitted the shop replies and did not resolve this disagreement. Therefore the earlier claim that repeating the price question was definitely necessary is withdrawn. It may have been useful clarification, or a repeated question caused by missing an answer.
- **BBR's item name is disputed.** Sarvam records “earring”; the audio model hears “keychain.” The short independent transcription returned only an agent question and did not settle the shop's item name. Do not automatically rewrite a product list using either uncertain word.
- The models also render business/customer names differently. This alone does not establish a pronunciation defect. Avoid claiming exact proper-name fidelity without a further listening check.
- The broad audio analysis treated some bundled-question answers and the ₹2,000 quote too confidently in its own summary. The stricter evidence limits below still apply: an audio model's interpretation is not an additional statement made by the shop.

The main improvements remain task preparation, asking one clear question at a time, making follow-up practical, and honest result extraction. There is no demonstrated audio-transport or interruption defect in these two recordings.

## What the customer wanted

The exact request supplied to both calls was:

> Altir corporate Diwali gift hampers, 60 boxes, INR 1500 to 2000 each; explore supplier catalogue and festive options, customization and Hyderabad delivery; HR will follow up

This is a supplier enquiry for configurable gift hampers. No particular hamper, contents, catalogue item or delivery deadline was selected. The immediate goal is to find suitable options and obtain a usable next step for HR. Asking for the final price of an unspecified box is premature.

The bridge nevertheless prepends “Ask about this exact product” and a fixed checklist of availability, exact variant, final price including taxes, and offers to the request. That framing fits a selected phone or printer cartridge better than this enquiry. See [the call payload](../../call-bridge/sarvam.cjs:10).

## MiAmore: readable transcript

| Turn | Speaker | English translation of saved transcript |
|---|---|---|
| 1 | Agent | Hello, I am Gayatri, an AI assistant. I am calling MiAmore Gifts & Hampers on behalf of a customer with a small question. Is this a good time? |
| 2 | Shop | Yes. |
| 3 | Agent | Thank you. I wanted to ask about Altir corporate Diwali gift hampers for Akhilesh. Do you have sixty boxes available? |
| 4 | Shop | Yes. |
| 5 | Agent | What would be the final price of one box including taxes? Our budget is approximately fifteen hundred to two thousand rupees. |
| 6 | Shop | OK, available. |
| 7 | Agent | Thank you, but could you tell me the final price of one box, including taxes? |
| 8 | Shop | 2000. |
| 9 | Agent | OK, two thousand rupees. Are any offers available, and can you customize it? |
| 10 | Shop | Yes. |
| 11 | Agent | Can you deliver these sixty boxes to Hyderabad? |
| 12 | Shop | Yes. |
| 13 | Agent | Can you send your catalogue or festive options for Akhilesh to review? His HR will contact you afterwards. |
| 14 | Shop | OK. |
| 15 | Agent | Thank you for your help. Have a good day. |

### What worked

- The shop stayed engaged through seven replies. The AI introduction did not produce an objection in this transcript.
- The agent retained quantity, budget and delivery city.
- The agent asked for price again after the first reply. That is useful if the first reply did not answer price; the two transcript passes disagree about that reply, so whether this was necessary remains unresolved.
- The conversation included customization, delivery and catalogue, then closed with a goodbye.

### What did not work

- “Offers available?” and “Can you customize it?” were combined. A single “yes” does not establish which question was answered. The saved answer nevertheless declares customization available.
- Nothing establishes what is inside a ₹2,000 box. Treat ₹2,000 as a per-box amount quoted in response to a tax-inclusive question, with the selected hamper and price applicability still unresolved. The agent should briefly confirm the contents and tax treatment before presenting an exact final quote.
- The catalogue request has no agreed destination: no WhatsApp number, email address, public link or other way to obtain it. “OK” establishes agreement in principle, not that a catalogue was sent or received.
- No production lead time or delivery date was established. With 60 Diwali boxes this is a useful follow-up; the customer must supply an actual deadline before the agent claims it can be met.
- The saved result says `variantMatch: confirmed`. No specific variant was selected or described. That label overstates the evidence.

### More accurate customer-facing result

> MiAmore says it can supply 60 boxes and deliver to Hyderabad. It quoted ₹2,000 per box after a question about taxes; the hamper contents and applicable final quote still need confirmation. Its “yes” to the combined offers/customization question is ambiguous. It agreed to send a catalogue, but no receiving channel was established. Delivery timing is unconfirmed.

## BBR: readable transcript

| Turn | Speaker | English translation, or original English from saved transcript |
|---|---|---|
| 1 | Agent | Hello, I am Gayatri, an AI assistant. I am calling BBR Gifting Matrix – Corporate Gifts Hyderabad on behalf of a customer with a small question. Is this a good time? |
| 2 | Shop | Yes, please. |
| 3 | Agent | I wanted to ask about Altir corporate Diwali gift hampers for Akhilesh. Do you have sixty boxes available? |
| 4 | Shop | Yes, available. |
| 5 | Agent | What would be the final price of one box including taxes? Our budget is fifteen hundred to two thousand rupees. |
| 6 | Shop | “Okay, that depends on product selection. We have a multiple option in starting from 2 in 1 to 7 in 1. Price range.” |
| 7 | Agent | “I see. Could you tell me which variants would fit in the fifteen hundred to two thousand rupees range?” |
| 8 | Shop | “Yes, stationery like pen, earring, card holder, diary.” |
| 9 | Agent | “That sounds great. Since we need sixty boxes, are there any special offers or discounts available for a bulk order like this?” |
| 10 | Shop | “Yeah, yeah, once after the select selecting the final product, we can discuss about the <uh> discounts and all.” |
| 11 | Agent | “That makes sense. Also, do you provide customization options for these hampers, and can you deliver them within Hyderabad?” |
| 12 | Shop | “Yes, yes, yes, we do.” |
| 13 | Agent | “Perfect. Since this is just an inquiry, our HR team will follow up with you soon to finalize everything. Thank you so much for your time.” |

“Earring” is the provider's transcription, not a verified product name. Do not silently correct it to another item without checking the recording.

### What worked

- The agent switched to English after the shop's longer English answer, and continued in English.
- It accepted that price depends on selection and asked about options within budget, instead of inventing an exact price.
- It asked about bulk discounts and retained that discounts depend on the final selection. No discount amount was fabricated.
- The call remained an enquiry; the transcript contains no purchase, reservation or payment commitment.

### What did not work

- The shop mentioned stationery sets. The agent did not check which options were festive Diwali hampers or ask about contents appropriate to the request.
- Customization and Hyderabad delivery were combined into one question. The broad yes should be retained as a broad confirmation, with the details still to be clarified.
- The agent omitted the requested catalogue completely.
- It did not ask about preparation time. No deadline was supplied, so meeting a deadline remains unconfirmed.
- “Our HR team … soon to finalize everything” goes beyond relaying that the customer's HR will follow up. It introduces a timing promise and implies finalization. Keep the agent clearly in the role of the customer's representative.
- The saved `variantMatch: confirmed` is unsupported: no exact hamper or combination was chosen.

### More accurate customer-facing result

> BBR says it can supply the quantity and offers combinations from two items to seven items. It mentioned stationery options within ₹1,500–₹2,000; the transcript's item names need checking. Final price and any bulk discount depend on selection. It broadly agreed to customization and Hyderabad delivery. Catalogue access, festive contents, detailed customization and lead time remain unconfirmed. This was a useful supplier response, not a refusal.

## A separate result-handling defect

The bridge marked BBR's result `personalCallNeeded: true`. The transcript contains **no shop request to speak with a person**. The agent itself introduced HR follow-up; that is not evidence that the shop refused the AI.

The backend then maps any true `personalCallNeeded` flag to `refused`, producing the attempt status `refused`, shop state `personal_call_needed`, and wording “Prefers a personal call.” See [result mapping](../../convex/calls.ts:359).

The extractor already says “If the shop asks for a person set personalCallNeeded true,” but its validation only checks that evidence quotes occur somewhere in shop speech. It does not require a quote that supports this particular flag. Generic availability and price-selection quotes passed validation. See [answer extraction](../../call-bridge/answer.cjs:8).

**Recommendation:** distinguish a requested personal call, an actual refusal, and a normal next-step enquiry. Require field-specific evidence for a personal-call flag. Catalogue selection or planned customer follow-up must not become refusal. This affects workflow and charge classification, so assess that path alongside the prompt rather than attempting to solve it with conversational wording alone. No historical status or charge was changed in this review.

## What the active prompt explains

The dashboard explicitly showed **v2 · Committed**, separate from **v3 · Draft**. Both reviewed attempt records also identify version 2.

The browser inspection saved [the complete committed-v2 prompt and settings](</Users/akhilesh/.aside/u/0/sessions/2026-10-08_FRFu3Zm9UEFzRv1F/artifacts/sarvam-v2-prompt.md>) as a local Aside artifact.

- It already says “one question … at a time” and “under 25 words per turn.” Both calls nevertheless bundled questions. Adding that same rule again is unlikely to be enough; give short concrete examples and prioritize it over the checklist.
- It describes a broad everyday-business caller, including service providers and requests to book or hold items. The bridge separately prohibits booking, reserving or holding. Remove that contradiction for the existing enquiry-only product.
- It says never to share customer contact details. A workable catalogue follow-up therefore needs a public catalogue link, the supplier's preferred contact details, or a separately approved receiving channel. Do not assume the telephone caller ID is the customer's WhatsApp number.
- It instructs the agent to acknowledge prices and proceed, rather than checking unresolved price meaning. These calls show why price basis, selected option and tax treatment sometimes need a short clarification.
- Starting language: Hindi; automatic language switching: enabled; voice: Roopa Hindi Conversational; speed: 1.15×; interruptions: enabled; response eagerness: Balanced; volume threshold: Normal; maximum length: five minutes. These are settings, not measured audio quality.
- Committed v2 currently displays voicemail **enabled**, three silence nudges at eight seconds each, and hangup after unanswered nudges. This differs from the earlier memory entry that reported voicemail switched off. Both present calls ended `AGENT_ENDS`, so there is no evidence that voicemail handling caused a defect in these two calls. No setting was changed.

## Priorities for improving the prompt

These are proposals, not deployed behavior or newly agreed product decisions.

1. **Recognize the enquiry type.** For a selected item, ask about its exact variant and stock. For configurable gift boxes, ask what the supplier can provide for the quantity and budget, then identify suitable contents/options. Do not assert that an unspecified hamper is a confirmed exact variant.
2. **Ask one answerable question per turn.** Separate customization, offers and delivery. If one answer covers several facts, retain what was actually stated and clarify only what matters and remains ambiguous.
3. **Close the catalogue loop.** If the request asks for a catalogue, obtain a usable public link or ask how the customer can get it. Without an approved receiving destination or messaging tool, tell the customer that sending/receipt is not confirmed.
4. **Make the price meaningful.** Confirm the amount is per box, what option it refers to, and whether taxes are included when unclear. For selection-dependent pricing, record that dependency; do not keep pressing for an invented final number.
5. **Ask about preparation time when relevant.** For a 60-box seasonal order, establish lead time. Ask about an actual delivery deadline only if supplied by the customer.
6. **Keep role and future actions accurate.** Relay that the customer's HR plans to follow up. Do not promise timing, catalogue delivery, finalization, orders, holds or bookings the agent cannot perform.
7. **Finish with a short evidence-based recap.** State the one or two key confirmed facts and the next step, give the shop a chance to correct them, then thank it and end. Avoid reciting a long checklist.
8. **Tighten post-call extraction alongside the conversation.** Use a quote supporting each important claim, preserve uncertainty, and keep ordinary follow-up separate from personal-call preference/refusal.

## Next verification

The authorised automated audio review is complete; the two disputed shop replies still need a listening check before being treated as exact quotations. Next define the task brief (purpose, outcome, representation, recipient, context, constraints, priority questions, authority, tools/channels, speaking style, exception rules and result/evidence), then use it to revise a draft Sarvam version and result-extraction rules before a separately authorised personal test call. Useful cases: a bare yes to two questions; price depending on selection; catalogue promised without a destination; a shop actually requesting a person; a fixed-product enquiry; and a Hindi-to-English switch. These recordings demonstrate useful real conversations, but do not establish all prompts, language behavior or result classifications are correct.
