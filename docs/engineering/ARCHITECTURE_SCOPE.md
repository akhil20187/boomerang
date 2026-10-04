# Human MCP architecture scope

5 October 2026. Proposal for discussion, not an approved implementation specification. No application code changed.

## Recommendation

Use one Convex backend for the database, task control, scheduled retries, integration requests and live results. Use one separate always-on server for Vobiz ↔ OpenAI call audio, as approved in D61. ChatGPT, Claude and the website use the same saved tasks and answers.

Alternatives considered:

| Approach | Trade-off |
|---|---|
| Convex plus one audio server — recommended | Small system; keeps long phone conversations separate from saved task control. |
| Put everything in Convex | Fewer deployments, but conflicts with the already identified need for a persistent phone audio bridge. |
| Separate services for search, calls, billing and workers | More moving parts without a current product need. Defer. |

Keep future task types possible through a shared task record and specific details for each type. Do not build a universal workflow engine or human marketplace now.

## Boundaries and responsibilities

- **Chat cards and status website:** collect selections and show saved progress, answers and proof. They do not decide charges or call outcomes.
- **MCP endpoint:** named actions the customer's assistant can request: find shops, show more, start selected calls and read a task. Authenticate the account and validate inputs before task access.
- **Convex task control:** save approved scope, check account access and credit, create attempts, schedule retries, accept results and prepare customer summaries.
- **Audio server:** connect one Vobiz call to one OpenAI realtime session; report connection events and structured answers with task/attempt identifiers. No independent customer billing decisions.
- **Provider connectors:** small internal modules for Monid, Google, Vobiz, OpenAI and Resend. Translate provider-specific responses into our own records. They are not separate deployed services.

Convex is the saved source of truth. The audio server can restart without becoming the only place that knows what happened. A reconciliation check must detect abandoned attempts and confirm provider status before starting another call.

Hosting for the audio server remains a user choice under D61. MCP hosting, account linking, host permissions, live updates and deployment need a focused feasibility check before treating the older spec's proposed setup as proven.

## Database: what changes from the initial list

**One task is one customer request. One shop job is one selected shop within that task. One attempt is one actual phone call.** Example: three chosen shops, each tried twice, means one task, three shop jobs and six attempts.

Do not create separate tables for every status or short note. Put current status next to the record it describes; retain changes in an event history.

| Proposed table | Purpose and main fields |
|---|---|
| `users` | Customer account, email, display name, access eligibility. Authentication records depend on the selected login/account-linking implementation. |
| `drafts` | Input link or description, product identity and attributes, pincode, relevant card names, comments, search radius, returned shop references/order and expiry. Keeps selection and show-more state before approval. |
| `tasks` | Customer ID, title, task type (`shop_calls` first), details format version, validated details, approved scope/time, lifecycle status, started/finished times and summary. Preserve the product/variant the customer authorised; later draft edits cannot change running calls. |
| `shopJobs` | Task ID, shop reference, current execution status, retry time, latest answer, notes, evidence references, executor type and eventual assigned worker ID. One row per selected shop, including unanswered shops. |
| `callAttempts` | Shop-job ID, attempt number, AI/human executor, provider call ID, start/answer/end times, transport outcome, structured answer captured, recording reference/status and processing status. Preserve prior attempts rather than overwrite them. |
| `transcriptSegments` | Attempt ID, sequence number, speaker, timestamp and text. Separate so transcripts do not make live-status reads heavy. Transcription is supporting evidence, not guaranteed verbatim truth. |
| `taskEvents` | Task/shop/attempt references, event type, actor, timestamp and short details. Powers the opened row's timeline and audit history. Technical debug logs remain in runtime logging, with correlation IDs and no secrets. |
| `creditEntries` | Account, task/shop reference, grant/reservation/charge/release/refund, amount and currency, reason and unique operation ID. Keeps customer credit separate from provider costs. Exact pricing and charge eligibility remain open. |
| `notifications` | Task, started/completed email type, recipient reference, pending/sent/error status and provider ID. Prevent repeated notifications; reconcile uncertain sends. Resend was approved in D51 and is missing from the initial integration list. |

**Shop identity:** persist a Google place ID where available. Do not yet assume a permanent `shops` table containing all Google ratings, phones, hours and addresses. Google limits caching/storing Places content; its place ID exemption does not exempt the rest. Define allowed field retention and refresh before storing discovery snapshots. Keep our own call answers separately from Google's listing data. Source: [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies).

Separate products, notes, recordings and worker tables are unnecessary initially. File references live on their owning record; human-worker records and assignment history come with the later human flow.

### Task details: flexible, but with a contract

`jsonb` is a PostgreSQL term. Convex stores documents with nested objects and supports schemas that check their shape. Use fixed fields for identity, customer, type, state and approval; allow product-specific attributes inside validated task details. Source: [Convex data types](https://docs.convex.dev/database/types).

For shop calls, require a usable product description, location, selected shop references and relevant instructions. Product attributes can vary: storage/colour for a phone, cartridge/model compatibility for a printer, size/material for another product. Future expert-review tasks get their own details format rather than reusing shop-call fields.

Keep raw provider responses out of the main task record; store only useful parsed fields there. If raw responses are retained for diagnosis, give them limited retention and separate access.

**Owner means customer. Executor means AI or human.** A task can eventually involve both, so do not give the entire task a single `completedBy` field. Record who performed each attempt and who supplied each answer.

## States that support the approved designs

Keep execution, answer and billing separate. An answered call can confirm no stock; that is useful completed work. A disconnected call can leave partial information. Neither should silently become a technical error.

- **Task lifecycle, proposed:** queued, running, finished, error. Finished means all chosen shop jobs reached a terminal state; summary counts express mixed outcomes. No cancellation UI is added by this proposal.
- **Shop execution, proposed:** waiting, calling, retry scheduled, answered, unreachable, personal call needed, incomplete answer, technical error.
- **Answer fields:** stock (available/unavailable/unconfirmed), exact variant match, shop-stated final price and currency, offers in the shop's words, notes, captured time and source attempt. Preserve unknown fields explicitly.
- **Billing:** not assessed, reserved, charged, released, refunded. Call success does not itself decide whether to charge.

Display text comes from DESIGN.md. D79's “Prefers a personal call” applies when the shop asks for a person or hangs up on the AI; do not use it for every unanswered or broken call. After two unanswered AI attempts show couldn't reach; incomplete answers retain partial facts and mark remaining fields Unconfirmed. No human handoff is promised in V1 (D60).

Availability totals count confirmed stock answers only. Completion progress counts resolved shop jobs, including unreachable outcomes. Do not infer “No stock found” from unanswered calls or call every selected shop “called” before an actual attempt. Mixed unknown/no-stock summary wording needs refinement before implementation.

## Storage

Use Convex file storage initially for available call recordings and approved product images. Keep recording duration, format, file ID, processing status and a small waveform preview alongside the attempt. The waveform supports DESIGN.md's seekable voice-note player; generation has not been tested.

Recording retrieval, transfer from Vobiz, playable format, browser seeking and host playback remain unverified. Do not show a working player until the recording is ready. Missing recordings do not prevent notes-only answers under D19/D25.

File IDs are references, not access permissions. Convex-generated file URLs can be used by anyone who has the URL and do not automatically expire. Choose whether link-based recording access is acceptable or serve audio through permission checks before launch. Source: [Convex file storage](https://docs.convex.dev/file-storage/overview).

Product images may be absent for typed descriptions; the flow must still work. The saved Amazon image list is not proof that its first image matches the selected variant. Do not assume all source media can be copied indefinitely. Recording/transcript deletion periods and private-link access remain open product choices.

## Request and call flow

1. Recognise the signed-in customer through account linking; do not trust an email or user ID supplied by the assistant alone. D59 keeps guest calls outside the chat version.
2. Parse a description or extract an Amazon link using the tested Monid route. Other links use separate supported extractors later; unreadable links follow the approved typed-description fallback. Preserve exact product/variant and source time.
3. Locate the pincode through Google Geocoding, search likely sellers through Places, remove out-of-radius matches, deduplicate place IDs and apply the agreed rating/count rules. Listing relevance remains a candidate assessment, not stock confirmation.
4. Save the draft and preserve selection across show-more requests. Return batches of five. Retention of Google fields follows the policy review above.
5. On “Call N shops”, validate selection, account eligibility and credit; record the customer's approval, task and shop jobs in one saved operation. A repeated click or tool request with the same operation ID returns the existing task.
6. Dispatch calls through the audio server with a bounded concurrency limit. Maximum shops, simultaneous calls and call duration are not yet selected. An accepted provider request is not an answered call.
7. Save events and per-attempt answers. Unanswered AI calls get one retry after five minutes (D28). Answered-then-disconnected calls do not get an automatic AI redial. Human follow-up stays deferred.
8. Validate the result without inventing missing facts; update the shop's latest answer, preserving prior evidence. Late recording arrival updates evidence without reopening the call or billing again.
9. Update the card/status page from saved data, send started/done emails and let the host assistant request the final summary. Host-supported chat messages are an enhancement, not the only delivery route; closed-chat push is not assumed.

Convex scheduled functions support delayed retries, but external actions are not automatically retried. Provider calls and email sends need explicit recovery and duplicate protection. Source: [Convex scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions).

Callbacks must be authenticated, tied to known attempts and safe to process repeatedly or out of order. If a provider request times out after possibly starting a call, reconcile its outcome before resubmitting. Credit changes need atomic checks so concurrent tasks cannot spend the same balance.

## Integrations and evidence boundaries

| Integration | Role | What existing evidence establishes |
|---|---|---|
| Monid → Apify Amazon extractor | Product identity, variant and image candidates | One successful extraction with a matched variant; other domains, repeated reliability and media choice not established. |
| Google Geocoding + Places | Pincode location and possible shops | Test searches returned phone/rating data; hours, coverage, retention and complete app integration remain unresolved. |
| OpenAI realtime | Live phone conversation | Existing authorised phone experiment exchanged speech and completed; answer accuracy and robust production operation remain unverified. A separate summary/model choice is not required by this scope. |
| Vobiz | Outbound calling, media stream and lifecycle events | Call transport and goodbye-triggered hangup verified in an isolated run; recordings and production recovery not verified. |
| Resend | Started and completed emails | Provider selected; setup and delivery unverified. |

API keys stay server-side. Customer/provider cost tracking is separate from customer prices. No calls or new paid provider tests were run for this architecture review.

## Future vision without extra V1 work

Retain task type, details format version, customer approval, executor/evidence references and task events. These let a human later finish a shop job or an expert answer a different task type without changing the customer-account or credit foundation.

Defer worker signup, assignment/acceptance, payouts, expert matching, holding stock, a public service catalogue, guest allowances and MCP Events. The later website can reuse task control, adding its own guest-access rules. Provider modules can be replaced without changing the card's result format.

## Decisions to settle next

First question: **what earns a paid shop answer — confirmed stock status alone, or stock status plus a shop-stated final price when it is available?** These are proposed choices, not an existing billing decision. Minimum fields for no-stock and partial answers must follow the chosen rule.

Then settle limits (shops, simultaneous calls and duration), credit eligibility/funding, identity/account linking, recording retention/access and audio-server hosting. These choices affect product cost or customer experience; table names and internal module layout do not require a separate decision.

## Review and verification

Checked against memory.md (including D18/D19, D28, D59–D61 and D79), DESIGN.md, the existing chat specification, Google search guide, Amazon extraction reference and phone-test records. Older spec sections promising immediate human handoff are superseded by the current AI-only decision. Official Convex and Google sources checked on 5 October 2026 for data, storage, scheduling and listing-retention constraints.

Before claiming the architecture works, verify: account isolation; repeat start requests producing one task; selection persistence; fake and real call progress; duplicate/late callbacks; retry recovery after restart; partial/no-stock/unreachable outcomes; credit races; email duplication; recording playback and seek; and host reconnection. None of those full-product checks were performed in this scoping session.
