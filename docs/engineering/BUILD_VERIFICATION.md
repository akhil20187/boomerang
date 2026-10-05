# Human MCP build and verification

5 October 2026. Work in progress; this is not a completion claim.

## Open the app

- [Live app](https://little-kangaroo-718.convex.site)
- [Interactive demo](https://little-kangaroo-718.convex.site/demo): sample shops and answers, no calls or charges. The recording is a sample tone.
- [Account](https://little-kangaroo-718.convex.site/account): email sign-in, customer call name, credit/access status and revocable assistant access keys.
- [Approved setup guide](https://little-kangaroo-718.convex.site/setup.html): published design preview with the live testing server address and a visible notice that shop calling remains disabled.

Convex database/functions and static website are deployed to the existing development deployment. Google, Monid, OpenAI and Resend credentials are configured server-side under explicit user approval. Live calling remains disabled. No real shop calls were placed in this build session.

## Verified so far

- Approved protected MCP/OAuth routes deployed on 5 October. Public discovery returns OAuth JSON; unauthenticated requests are rejected. An authenticated SDK client discovered all five tools, loaded the self-contained widget, read the saved simulated task and was rejected after its temporary token was revoked. Actual rendering inside ChatGPT/Claude remains unverified.
- Controlled task `ks75ebwjk9ce20vexzvpp8wxnx8fpmwp` finished without dialing. Its private synthetic WAV returned 32,044 bytes; unauthorised playback was rejected. Replaying the same task left exactly two notification records, each sent in one attempt. AgentMail received both started/completed emails from Human MCP with the correct protected status link and sign-in instruction. The signed-in website displayed the marked simulated result.
- Credit accounting, shop relevance corrections and the controlled fixture are now deployed. No price was selected; live shop calling remains disabled.

- Production build succeeds. Type checks passed on frontend and backend.
- Unit and controlled integration tests cover task ownership, frozen product scope, duplicate starts/callbacks, exact phone formatting/radius, retry routing, recording access, OAuth consent/scope and duplicate call dispatch.
- Deployed demo: find sample shops → select three → show more without losing selection → start → progress → results → open proof. Mobile width showed no horizontal overflow.
- Sample audio: browser audio loaded a 12-second fixture, played, switched to 1.5x and accepted seek input. This does not verify Vobiz recordings.
- Email sign-in: one transactional sign-in email was received in the authorised AgentMail test inbox; its link signed the test account into the deployed app. No broadcasts/customer emails were sent.
- Deployed typed-product search returned 18 Google listings for the controlled test pincode. Repair-only listings appeared among retailers; relevance filtering is being corrected.
- Current check: 65 local tests and 31 Convex tests pass (96 total). Local HTTP mocks required sandbox permission to bind ports; no live dial or email is performed by these tests.
- Live task start correctly blocks an unapproved account. Raw server traces found in the error display were replaced with structured customer messages, with regression tests.
- One deployed Amazon-link check completed: B0H4LBXQDC returned Samsung Galaxy M47, Blaze Blue, 6GB + 128GB, Without Samsung Care, and 14 candidate shops. The exact selected variant appeared before approval. No shop call was started. This verifies one integration run, not repeated extraction reliability.
- Independent Astra review identified phone-format, callback, links, playback and recovery issues; fixes are being verified before final publication.
- Credit accounting is implemented and deployed: configured integer cents with no default price, frozen quotes and consent checking, atomic per-shop holds, one-time charges/releases/refunds, and no charge for empty answers or transport failure. Concurrent overspend and duplicate settlement regression tests pass. No real price has been selected.
- Voice-server container and private volume setup are prepared; configuration validation, local bind choices and evidence extraction tests pass. Docker's daemon is not running, so the image build/run has not been verified.

Screenshots live in [verification](../verification/). Earlier captures may precede final UI fixes; final captures are refreshed after publication.

## Still to prove

- Actual ChatGPT/Claude account linking, card rendering and host audio/call links.
- Wider extraction reliability and unsupported/unreadable-link recovery. Typed and one Amazon-link search are verified.
- Actual OAuth consent/refresh linking through ChatGPT or Claude. Public protocol and test-token revocation are verified; host account linking remains untested.
- Full controlled fake-bridge dispatch and provider-recording ingestion. The deployed synthetic task, private playback and both AgentMail notifications are verified; this fixture bypasses real audio-server dispatch.
- Always-on audio-server deployment and final live Vobiz/OpenAI/recording test with the user.
- Charging rule and price, payment checkout/top-up and dispute/refund operations. Atomic credit reservation/debit/refund machinery is tested locally, but does not prove paid billing. Paid use stays disabled.
- Google listing retention policy and required attribution treatment beyond temporary search results.
  [Primary-source review](GOOGLE_LISTING_DATA.md) distinguishes allowed place-ID retention from the unresolved permanent listing snapshots. Attribution is being added to the live card.

## Run locally

- `npm run dev`: website.
- `npm run build`: website and self-contained chat widget.
- `npm test`: local unit/integration tests; HTTP tests need permission to bind local ports in the sandbox.
- `npm run test:backend`: Convex rules/persistence tests.
- `npm run mcp`: standalone MCP/OAuth development adapter; public Convex endpoint is being implemented.
- `npm run bridge`: authenticated audio bridge; requires its HTTPS callback configuration and private dispatch secret. See [bridge guide](../../call-bridge/README.md).

Do not turn on LIVE_CALLS_ENABLED until bridge configuration, approved test recipients and operating limits are verified. Pricing is still unresolved; do not present test execution as paid billing.
