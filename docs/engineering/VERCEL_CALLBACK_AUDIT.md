# Vercel migration: callback and URL audit

Checked 7 October 2026. Read-only audit of live configuration, public responses and application code. No settings changed, emails sent, calls placed or callback events replayed.

## Result

No active callback destination needs moving to Vercel. Vercel serves the customer website; Convex still owns authentication, task data, MCP and the call-event receiver. Railway still owns the call bridge. Changing every `.convex.site` URL to Vercel would break that separation.

| Connection | Correct destination | Evidence |
| --- | --- | --- |
| Website → data | `little-kangaroo-718.convex.cloud` | Present in the live Vercel JavaScript bundle |
| Sign-in / customer task links | `askboomerang.vercel.app` | Live Convex `SITE_URL` matches; auth callback, notifications and task-status URL generation use it |
| AI assistant MCP / OAuth endpoints | `little-kangaroo-718.convex.site` | Live discovery document uses Convex issuer, authorization, token and registration endpoints |
| Browser connection approval | Vercel `/connect` → Convex `/oauth/*` | Page200; Vercel-origin OPTIONS204 and matching allow-origin header |
| Convex → call bridge | `voice-bridge-development.up.railway.app` | Live `CALL_BRIDGE_URL` matches; bridge health200, ready=true, provider=sarvam, active=0, reconciliationRequired=0 |
| Call bridge → saved results | Convex `/api/call-event` | Read actual Railway `CONVEX_CALLBACK_URL`; exact match; unauthenticated POST401 |
| Sarvam → bridge results | Bridge polls Sarvam attempt/transcript/recording APIs | Active adapter uses polling, not a website webhook |
| Legacy Vobiz callback/recording paths | Railway bridge | Generated from bridge public URL; retained fallback path, not active provider |
| Private recordings | Convex `/api/recording` | Backend issues expiring private playback links; this is intentionally still a backend address |
| Vercel `/api/*` | Proxy to Convex | Call-event proxy rejects unauthenticated POST401; providers should continue using Convex directly |
| Published agent skill | Website/account/tasks on Vercel; MCP on Convex | Live skill verified |
| Web analytics | Vercel `/_vercel/insights/*` | Script200 on current public deployment |

Railway's project-level webhook list is empty. The connected Resend account has two webhooks for other destinations; neither is a Boomerang endpoint, and neither was changed. Boomerang's email code sends through Resend's API and does not receive email-delivery webhooks. The audit did not establish whether the connected Resend account and deployed sending credential belong to the same account; the code establishes that Boomerang has no Resend webhook dependency.

## Follow-up findings

**Resolved on 7 October 2026 (D134):** All three public URL variables below are saved in Vercel Production. The setup script now sets `SITE_URL` and `LIVE_CALLS_ENABLED` only when absent, with tests proving existing values are preserved. Old Convex customer routes now redirect to the canonical Vercel page with query parameters preserved. Service routes and MCP remain on Convex. The findings below describe the state at the initial audit.

1. **Future deployment risk: Vercel has no saved production environment variables.** The live bundle is correct because the build supplied public URLs explicitly. A dashboard/Git rebuild without those values could lose its backend connection or generate the wrong links. Save these non-secret production values before enabling remote builds:
   - `VITE_CONVEX_URL=https://little-kangaroo-718.convex.cloud`
   - `VITE_MCP_PUBLIC_URL=https://little-kangaroo-718.convex.site`
   - `VITE_APP_PUBLIC_URL=https://askboomerang.vercel.app`
   The current documented CLI build supplies all three explicitly.
2. **Older setup script can undo the migration.** `scripts/configure-development.mjs` unconditionally sets `SITE_URL` from `CONVEX_SITE_URL` and disables calling. Do not rerun it against the live deployment as a routine configuration step. It should preserve existing values or require an explicit initialization/reset mode.
3. **Old frontend migration:** D134 supersedes serving standalone customer pages on Convex. Root, app, account, tasks, status, connect, demo and landing/index HTML routes redirect to Vercel. Auth still accepts the two exact first-party origins for compatibility. The server-served MCP widget remains at Convex `/widget.html`; it is not a standalone customer page. Existing embedded card links reach Vercel through these redirects.

## D134 verification

- 89 local and 56 backend tests pass, plus TypeScript checks. Tests cover preserving live setup values, first-time setup defaults, old-page redirects with task/connection parameters, exact-origin safety, and a full email-link creation/redemption using a mocked email sender and in-memory database (no actual email).
- Live old `/account` follows to `https://askboomerang.vercel.app/account`, HTTP200.
- Live old `/connect?oauth_request=audit-example` returns302 with the exact Vercel path and query.
- Call-event endpoint still rejects unauthenticated requests with401; analytics script still200.
- Production settings listed and verified after saving. No Vercel frontend rebuild was needed: the live bundle already contained those same URL values.
- Real mailbox delivery, signed-in browser session, AI-client approval and new call completion still require a live end-to-end check; simulated sign-in is not evidence of email delivery.

## Limits

Configuration and endpoint checks do not prove a complete authenticated call flow. Email-link redemption, connection approval inside an AI client, and a newly initiated call returning results on Vercel remain to be tested together. Sarvam/Vobiz dashboard settings were not edited or independently audited; current active provider behavior was traced from the deployed adapter configuration and code. No paid work or messages were triggered.

Re-run the read-only endpoint checks with `node scripts/audit-public-endpoints.mjs`. It prints only selected public Railway settings, health and endpoint checks, never credential values. The Railway CLI returns variables internally; the script filters them before printing and does not persist them.
