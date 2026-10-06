# PRODUCT.md

Sprint draft updated 4 October 2026. Paste a product link, see nearby stores, select stores and start calls. The website and service have not been verified end to end. The detailed current flow and gaps are in [MVP_FLOW.md](docs/project/MVP_FLOW.md).

## 1. The job

When I need a particular product soon and online stores cannot deliver it in time, I want someone to check nearby shops for stock and the final price, so I can choose where to buy without spending my time calling stores.

**Who, by situation:** An urgent buyer who knows the product they want, has checked online options, and now needs answers from physical shops.

**Today they hire:** Google, online shopping sites, store websites, their own phone calls and sometimes help from friends and family. They may settle for a convenient store or delay the purchase. They do calling by themselves.

**What needs doing:** Check the exact model, variant and colour; ask about stock, final price, discounts and relevant credit-card offers; compare the answers.

**How they want to feel — hypothesis:** Confident they have enough current information to choose, without chasing shops themselves.

**How they want to look to others:** Someone who made a smart purchase by finding the product at a lower price in an offline store. This applies to the iPhone scenario; the desired impression may differ for other purchases. It is a desired outcome, not a promise that offline prices will be lower.

**The one we serve first:** An urgent buyer opening our website on their phone. They do not need an AI assistant or an installed connector. The customer approves work and chooses where to buy.

Saving money can be an outcome. The main benefit is saving the effort of finding and calling shops. Time saved has not been measured.

## 2. The switch

**What they'd fire:** Looking up shop numbers, repeating the same questions, retrying unanswered calls and keeping their own comparison notes.

**Push:** “Online doesn't have what I need in time. Now I have to call several shops.”

**Pull:** “Show me nearby shops, then check stock and prices for me.”

**Anxiety — hypothesis from userflow.md:** “Will it still be in stock when I get there?” A further concern to test: “Am I paying for answers I can trust?”

**Habit — hypothesis:** Calling is familiar, feels free and lets the buyer ask follow-up questions directly. Free credit is a proposed incentive, not an existing habit.

**The one worry onboarding must remove:** “Is this call real and genuine, and am I paying for information that's actually right?” Show call evidence beside the captured answers. A recording demonstrates what was said; it does not guarantee that the shop's claim is accurate or stock stays available.

**How I know:** The founder reports checking online and calling multiple shops for an urgently needed iPhone. Their father reportedly faced the same problem buying a printer and cartridges. This supports the existence of the problem; payment and repeat use have not been demonstrated. The reported launch and price-increase details are not verified market facts.

## 3. The core flow

**The story:** “Find nearby shops that have my exact product and tell me what I would actually pay.”

1. The customer needs the product soon; online options do not meet the need.
2. They open the website on their phone, paste a product URL, such as an Amazon link, and enter the pincode. The website extracts product details for confirmation or correction. No login or invitation is needed to search. Manual entry on extraction failure is a recommended fallback, not yet selected or tested.
3. They confirm fetched item details and add optional comments. They see relevant nearby shops sorted highest-rated first, with rating sources, review counts, contact details and known hours. They select shops one by one. This is first value; listings and ratings do not confirm stock.
4. They tap “Start calls” without login and review requirements. Two successful calls are allowed per visitor across all searches, not per product or task; a new search or refresh does not reset the allowance. The store must answer and provide some product-related details; immediate disconnect does not count. After two successes, pause new calls and request email login for eligible $5 credit and approved continuation. Preserve the task and answers. Minimum detail fields, visitor tracking and guest attempt limits remain unresolved or untested; partial answers must not appear complete.
5. They review selected shops, confirmed product, questions, cost rules and cap, then approve. Create one saved task with a call queued for each selected store; repeated clicks must not duplicate calls. Exact billing and call concurrency remain open.
6. The website shows real per-store status: queued, AI calling, connected, retry scheduled, waiting for a human, human calling, completed or unresolved. Handoff and human call start are separate events. This is intended behaviour, not a tested capability.
7. If nobody picks up the AI call, AI retries once after five minutes. If answered then disconnected, pass directly to a human with requirements and attempt history. The human gets up to two attempts, stopping on a sufficient answer. Calls still unanswered after AI retry, refusal to speak to AI and incomplete answers also pass to a human. Human retry spacing and technical call failures remain open.
8. The website returns a shop-by-shop shortlist with exact product, stock, price, offer conditions, contact time and caller notes. Human forms have shop names prefilled. Missing details remain unconfirmed. Notes-only answers can be delivered and charged. Transcripts and available post-call recordings are later evidence improvements; missing evidence is marked.
9. The customer compares the options and chooses where to buy. Buying and reserving stock are outside this task.

**Things they do today:** A fixed count is not established. For N shops, the customer looks up N contact details, makes N or more call attempts, repeats questions and compares notes, in addition to online research.

**Things they do with the product:** Paste link and pincode, confirm details/add comments, select stores, start guest calls and compare answers. Login follows only when continuing beyond the guest allowance. Measure actual effort in a trial.

**What can go wrong:**

| Step | Failure | What must happen |
|---|---|---|
| 2–3 | Invalid pincode, missing shop details or search failure | Ask for corrections; distinguish no results from a failed search. Mark missing hours or numbers unknown, and link listing sources. Do not infer stock from listings. |
| 4–5 | Ambiguous product or card variant | Ask for missing details before calls. Never request full card numbers. |
| 4–5 | Duplicate request or spending above the cap | Proposed requirement: keep one task per approved request and prevent charges beyond its cap. |
| 6 | No worker accepts promptly | Offer waiting longer or cancellation with no charge. |
| 6–7 | Nobody picks up the AI call | AI retries once after five minutes, then passes to a human if still unanswered. Preserve requirements and attempt history. |
| 6–7 | Store picks up, then disconnects | Pass directly to a human; do not retry with AI. Human gets up to two attempts, stopping on a sufficient answer. |
| 6–7 | Technical failure prevents the call | Show the actual failure. The retry or handoff rule for technical failures is not settled. |
| 7 | Retry and human follow-up overlap | Proposed requirement: one caller owns the next attempt; show its status and avoid simultaneous duplicate calls. |
| 8 | Recording or transcript is missing | Show the evidence gap; never invent evidence. Notes-only answers can be delivered and charged. |
| 7 | Shop does not answer or gives an incomplete answer | Mark the unanswered fields unconfirmed. Do not convert silence into “out of stock.” |
| 7 | Shop offers a different model or conditional discount | Label the difference and conditions clearly; do not present it as the requested match. |
| 8 | No checked shop has stock | Say “No stock found at the stores we checked.” Do not imply every nearby shop was checked. |
| 8–9 | Stock changes after the call | Show the contact time and state that stock is not reserved. Holding stock is a separate possible task. |
| 7–8 | Work is late, disputed or only partly complete | Show the actual status. Charges and refunds after work starts require an agreed policy before paid use. |

**Next story:** After the customer selects a shop, ask it to confirm and hold the exact product at the agreed price. Separate approval and terms are needed.

## 4. Onboarding

**First value:** The nearby-store list, before login or calls: shops, phone numbers, addresses and listed opening status. Show unknown hours honestly. The list helps the buyer find shops; it does not establish stock.

**The worry it removes first:** “Will this help before I sign up?” The store list demonstrates the first part of the job. Later, call status and returned notes address “is the call real?” Transcripts and recordings can strengthen the evidence when added.

**Entry point:** A public, mobile-friendly website. A stranger can use store search without help, login, invitation or an assistant connector. The sprint submission target is a live .convex.site link, as stated in the supplied feedback; deployment is not verified.

**The flow in four lines:**

1. I open the website, paste the product link, enter my pincode and check the extracted product, without logging in.
2. I see nearby shops and select which ones I want called; stock is not confirmed yet.
3. I add any comments, choose stores from the highest-rated relevant shops and tap “Start calls”; I can get two successful calls without login.
4. I get each shop's stock and price answers with notes, then choose where to buy.

**Login:** Required to continue beyond two successful guest calls, using an email login link. Carry the task and results into the account. Prior invite/approval eligibility still applies to the $5 credit; opening up credit to every new account is not settled by this change.

**Build order:** Build public store search first. Login, invitation checks, welcome credit and calls follow; they do not block the first useful page. The customer-assistant connection comes after the sprint.

**Trial incentive:** Invited or approved customers receive $5 credit covering AI calling and human follow-up under answer-based billing. Credit belongs to the customer's account. Insufficient credit pauses new calls for payment. Prices, repeat-signup prevention and funding for work already underway remain open.

**What we don't ask on day one:** Login before search, an invitation to view stores, an assistant connector, a biography, unrelated permissions or a general task catalogue.

**What we ask later, and when — proposal:** Ask whether they want a stock hold after they choose a shop, once the initial workflow works.

## 5. v1

**Does:** A stranger pastes an Amazon product URL and pincode, checks extracted details, adds optional comments and selects relevant shops ordered highest-rated first. They start a saved calling task without login and see real per-store progress and answers. Human follow-up is included in the guest trial; successful AI and human calls share the same two-call allowance per visitor across searches. Further calls require login and eligible credit. Exact billing remains open; none of this calling behaviour is verified yet.

**Doesn't:** Buy the product, guarantee the lowest price, guarantee future stock, reserve inventory, provide expert second opinions or launch a general catalogue of human services. It does not promise answers in seconds or a guaranteed fifteen-minute delivery.

**Nice to have, only after the must-haves work:** Live transcripts, post-call recording playback, reusable preferences and a separate stock-hold task. Integration through MCP, the connection that lets customers' assistants request the service, comes after the sprint.

**How I'll know it worked — proposed:** A customer pays for useful answers, uses the shortlist to choose a shop, and returns for another qualifying purchase without needing the founder to persuade them. Record whether the product was actually available and whether the quoted conditions held. No numerical success threshold is agreed yet.

## 6. The riskiest guess

**Riskiest build guesses selected by the user:**

1. The website can find relevant real nearby stores with usable phone numbers and opening information, then initiate a real call and return useful feedback.
2. An unsuccessful AI call can pass to a human, who can finish the work and return the result without losing context.
3. The calling AI can capture the correct product, price and offers in English. Other languages remain later untested risks.

**Separate product-demand guess:** Customers will trust and pay for these answers because avoiding the calls is worth the price. Even working calls do not establish demand.

**How I tested it, and what happened:** Personal experiences identify the pain. A store-call trial is prepared, but completed calls, paid demand and repeat use are not recorded. No working end-to-end service has been verified.

**Proposed test:** Give a stranger the public website link. Watch whether they can search on their phone unaided; check store relevance, numbers and hours against sources. Then test a real English call and human handoff, and observe whether the customer acts on the returned notes. Compare call evidence where available. Agree charging terms before paid use. Tests and building can proceed together.

**What changed in the plan:** Public store discovery now includes optional comments and highest-rated relevant shops first. Customers can get two successful calls before login; continuing the same task requires login and eligible credit. This replaces pre-call login. Assistant integration stays after the sprint; store discovery remains first value.

## 7. Milestones

Build sequence based on the user's first three milestones. No milestone is marked complete.

1. I can paste a product URL and enter a pincode on my phone, confirm the extracted product and get a relevant store list without login.
2. I can show real addresses, phone numbers, sources and listed opening status, marking unknown details and handling empty or failed searches.
3. I can share a live .convex.site link and watch a stranger search without my help.
4. I can add comments, select stores from a relevance-filtered, highest-rating-first list and start one guest task without duplicate calls.
5. I can start a real English call and show its status and captured answers on the website.
6. I can retry unanswered AI calls, hand disconnected or incomplete calls to a human and return notes with the original context preserved.
7. I can enforce the two-successful-call guest allowance, request login for eligible $5 credit to continue the same task and enforce spending limits. Agree success counting, guest attempt limits, billing and refunds before real use.
8. I can close the website, reopen it and recover an authenticated task's requirements, approval, status and answers without submitting or charging twice.

## Remaining details before paid use

First build slice: Amazon URL and pincode → product confirmation/comments → selectable relevant stores ordered by rating. Guest calls follow; login and eligible credit are required after two successes. Customer-assistant integration follows the sprint. See [MVP_FLOW.md](docs/project/MVP_FLOW.md) for the full flow and open rules.

The product-definition interview can stop here. Before paid use, settle the billable answer definition, prices, partial completion, disputes and refunds, and funding for work already underway. Human retry spacing and technical-failure handling need operating rules. Regional-language priorities are later choices. Account access, widgets, calls, evidence and payments require implementation and testing; this document does not establish that they work.
