# V1: product link → nearby stores → calls → answers

Recorded 4 October 2026. Agreed direction, not a tested service.

**8 October 2026 calling preparation update:** The agreed [call task flow](CALL_TASK_FLOW.md) adds understanding intent, asking for missing required details and preparing a five-field brief before authorised calls, then returning a factual summary. It complements the shop discovery, selection and call-start rules below. Use `memory.md` for later pricing, access and implementation decisions; this document's original rollout details are historical.

## Customer flow

1. **Paste the product link and enter a pincode.** The customer opens the website on their phone. An Amazon product link is the example starting input. No login is needed to discover stores.
2. **Check the extracted product and add comments.** Fetch the available item details from the Amazon link, including name, brand, model and relevant variant. Let the customer confirm or correct these and add optional requirements. Do not invent missing details or promise every field can be fetched.
3. **See relevant nearby stores, highest-rated first.** Filter for shops relevant to the product and pincode, then order by highest rating. Show rating source and review count alongside addresses, numbers and known hours. Mark unrated shops honestly. Ratings describe the shop, not confirmed product stock. This is first value.
4. **Select stores to contact.** The customer chooses the shops in the list. Only selected stores enter the calling task.
5. **Tap “Start calls” without login.** Review the confirmed product, comments, selected stores and questions. Allow two successful calls before requiring login. Success means the store answers and gives at least some product-related details. An immediate disconnect after answering, an unanswered call or a conversation with no product details does not count. A counted call may still have incomplete fields; show those honestly. More selected stores must wait when the allowance is exhausted; do not launch calls that can exceed it.
   **Continue after the allowance:** Pause further calls and ask the customer to verify their email to receive automatic approval and one-time $1 test credit (D97), review the remaining work and cap, and approve continuation. Preserve the same task, results, comments and selection. Existing welcome grants and balances are preserved.
6. **Create one task and queue its calls.** After approval, create a saved task containing the confirmed product, selected stores and questions. Repeated taps must not create duplicate tasks or calls. Each selected store starts queued; show calling only when an actual attempt starts. Simultaneous versus sequential calling is not selected yet.
7. **Watch each store's progress on the same page.** Show clear statuses: queued, AI calling, connected, retry scheduled, waiting for a human, human calling, completed or unresolved. Handoff does not mean a human has started calling. Status reflects real events, not a simulated timer.
8. **Read answers as they arrive.** Each store row shows the exact product match, stock, final price, discounts, card-offer conditions, contact time and caller notes. Keep partial and unknown fields visible. Show a task summary distinguishing fully completed, partly completed and unresolved work.
9. **Choose where to buy.** The customer compares the returned answers. The task neither purchases nor holds stock. Reopening the task restores its state and answers without restarting calls.

## Existing call rules

- Start testing with English calls.
- If an AI call is unanswered, retry once after five minutes. If still unanswered, pass it to a human.
- If answered then disconnected, pass directly to a human without an AI retry. Refusal to speak to AI or incomplete answers also need handoff.
- The human gets up to two attempts, stopping once the required answer is obtained. Pass product requirements, questions and attempt history with the task.
- If no human accepts promptly, offer waiting longer or cancellation with no charge. Billing after work starts still needs a policy.
- Caller notes suffice for delivery and charging. Transcripts and recordings are later enhancements; available recording playback is after the call ends.
- If credit cannot cover further work, pause new calls and ask for payment. Never exceed the approved cap.
- An unanswered call is not an out-of-stock result. Use “No stock found at the stores we checked” only for actual checked-store answers.

## Gaps to settle or handle

**Guest allowance:** Two successful calls per visitor across searches, shared by AI calls and included human follow-up. Handoff does not create extra allowance. Neither a new search nor refresh renews it. Success means answered plus some product-related details, not connection alone. Minimum detail fields remain open. Visitor tracking must preserve this allowance; cross-browser/device identification is not established. Failed attempts need a separate limit to prevent unlimited calls. Funding for work already underway remains open. Guest success does not settle paid-answer completeness or price. These limits are not implemented.

**Product-link failure:** Recommended fallback: let the customer type or edit the product details if the page cannot be read. Never guess an exact model or variant. Supported sites have not been selected or tested; an Amazon example does not imply every product URL works.

**Call questions:** Recommended default is exact-product availability, final price and discounts. Ask for relevant card type only if card offers matter; do not request full card numbers. Confirm the questions before starting.

**Usable stores:** Missing contact numbers, closed stores and no search results need clear handling. Mark unknown hours honestly; do not promise that a store is open or carries stock from a listing alone. The search area and closed-store scheduling rule remain open.

**Charging and limits:** Define a billable answer, price, partial completion and refunds before paid use. Also settle funding for calls already underway, maximum stores per task and call concurrency. These are open choices, not new agreed policies.

**Human operations:** Set who receives handoffs, acceptance time, retry spacing and what happens on technical calling failures. Distinguish awaiting assignment from active human work.

## Minimum scope

Product link and pincode → confirmed product → selectable store list → authorised task → real per-store call status → returned notes and comparison. The exact product confirmation and visible answers complete the proposed flow. Assistant connections, live transcripts, recordings, stock reservations and a wider task catalogue can follow.

Next verification: one real product link, one pincode and one selected store, through a real call to a returned answer. Also exercise a failed extraction and a human handoff. None has been verified yet.
