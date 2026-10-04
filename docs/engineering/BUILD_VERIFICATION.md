# Human MCP build and verification

5 October 2026. Work in progress; this is not a completion claim.

## Open the app

- [Live app](https://little-kangaroo-718.convex.site)
- [Interactive demo](https://little-kangaroo-718.convex.site/demo): sample shops and answers, no calls or charges. The recording is a sample tone.
- [Account](https://little-kangaroo-718.convex.site/account): email sign-in, customer call name, credit/access status and revocable assistant access keys.

Convex database/functions and static website are deployed to the existing development deployment. Google, Monid, OpenAI and Resend credentials are configured server-side under explicit user approval. Live calling remains disabled. No real shop calls were placed in this build session.

## Verified so far

- Production build succeeds. Type checks passed on frontend and backend.
- Unit and controlled integration tests cover task ownership, frozen product scope, duplicate starts/callbacks, exact phone formatting/radius, retry routing, recording access, OAuth consent/scope and duplicate call dispatch.
- Deployed demo: find sample shops → select three → show more without losing selection → start → progress → results → open proof. Mobile width showed no horizontal overflow.
- Sample audio: browser audio loaded a 12-second fixture, played, switched to 1.5x and accepted seek input. This does not verify Vobiz recordings.
- Email sign-in: one transactional sign-in email was received in the authorised AgentMail test inbox; its link signed the test account into the deployed app. No broadcasts/customer emails were sent.
- Deployed typed-product search returned 18 Google listings for the controlled test pincode. Repair-only listings appeared among retailers; relevance filtering is being corrected.
- Current check: 54 local tests and 22 Convex tests pass. Local HTTP mocks required sandbox permission to bind ports; no live dial or email is performed by these tests.
- Live task start correctly blocks an unapproved account. Raw server traces found in the error display were replaced with structured customer messages, with regression tests.
- One deployed Amazon-link check completed: B0H4LBXQDC returned Samsung Galaxy M47, Blaze Blue, 6GB + 128GB, Without Samsung Care, and 14 candidate shops. The exact selected variant appeared before approval. No shop call was started. This verifies one integration run, not repeated extraction reliability.
- Independent Astra review identified phone-format, callback, links, playback and recovery issues; fixes are being verified before final publication.

Screenshots live in [verification](../verification/). Earlier captures may precede final UI fixes; final captures are refreshed after publication.

## Still to prove

- Actual ChatGPT/Claude account linking, card rendering and host audio/call links.
- Wider extraction reliability and unsupported/unreadable-link recovery. Typed and one Amazon-link search are verified.
- Public MCP/OAuth endpoint and persistent refresh/revocation.
  Publication is awaiting specific user permission after automatic approval review rejected the new public login/security routes. Local security tests pass; those routes are not deployed yet.
- Full controlled task with fake bridge through completion, recording ingestion, signed playback and exactly one started/completed email.
  Guarded synthetic task tests already cover no dialing, exactly two mocked notification sends despite retries, private playback and token revocation. Final deployed AgentMail delivery has not run.
- Always-on audio-server deployment and final live Vobiz/OpenAI/recording test with the user.
- Charging rule and price, atomic credit reservation/debit/refunds. Current credit visibility/eligibility is not a complete billing system. Paid use stays disabled.
- Google listing retention policy and required attribution treatment beyond temporary search results.

## Run locally

- `npm run dev`: website.
- `npm run build`: website and self-contained chat widget.
- `npm test`: local unit/integration tests; HTTP tests need permission to bind local ports in the sandbox.
- `npm run test:backend`: Convex rules/persistence tests.
- `npm run mcp`: standalone MCP/OAuth development adapter; public Convex endpoint is being implemented.
- `npm run bridge`: authenticated audio bridge; requires its HTTPS callback configuration and private dispatch secret. See [bridge guide](../../call-bridge/README.md).

Do not turn on LIVE_CALLS_ENABLED until bridge configuration, approved test recipients and operating limits are verified. Pricing is still unresolved; do not present test execution as paid billing.
