# Rupee rollout and main automatic deployment — 8 October 2026

The live backend and website use the approved ₹10 useful-answer price. Existing money converted at ₹100 per $1. Automatic Vercel deployment is enabled for `main` only; repo-local commit identity is `akhil20187` with its verified GitHub noreply address.

## Live changes

- Paused new calls using `LIVE_CALLS_ENABLED=false`.
- Saved a private database snapshot before conversion: `/private/tmp/boomerang-before-rupees-2026-10-08.zip`, permissions 0600. Convex also retains the export in its snapshot dashboard. The backup is outside Git and must remain private.
- Fixed the existing busy-call reconciliation bug in [Sarvam adapter](../../call-bridge/sarvam.cjs). Sarvam's exact existing record said `busy`, zero duration/messages, no start/end timestamps and `NO_INTERACTION_ID`. Missing end time previously kept it unresolved. Only explicit `busy` bypasses that requirement; connected calls without an end remain unresolved. Placeholder interaction IDs are not treated as recordings. [Two regression tests](../../call-bridge/sarvam.test.cjs) were added; the busy test failed before the fix and passed after it.
- Deployed isolated production bridge files to Railway deployment `1fd0c2d8-c8eb-401e-bcfb-c3fd5bedd114` (SUCCESS). The existing busy attempt resolved as `no-answer`; no test call or redial was initiated by rollout scripts.
- Published the rupee backend to `little-kangaroo-718`, the existing live deployment.
- Ran both conversion jobs: four users and five priced tasks converted. Compared every original ledger/account/reservation/task money field with the backup at the approved rate. No missing original money rows, USD entries or account/history/hold mismatches remain. Repeating both jobs converted zero users/tasks.
- Set `ANSWER_PRICE_CENTS=1000` (₹10). Existing two account rows retain ₹500 each; two users whose balances are computed from history retain ₹100 each. No welcome grant was repeated.
- Restored `main` automatic deployment in [vercel.json](../../vercel.json). Push `212f28f` created Vercel production deployment `dpl_GjKL9FiGrhJbyRQ87mJvdYEkDLHn` with source `git`, state READY. The public alias [askboomerang.vercel.app](https://askboomerang.vercel.app) points to that deployment.
- Verified the new frontend before restoring `LIVE_CALLS_ENABLED=true`. The old pending retry settled while calls were paused, releasing its hold; final ledger had 20 INR entries, eight reservations and zero outstanding holds/mismatches. No customer credit was charged by the rollout scripts.

## Verification

- 99 local tests and 65 backend tests passed; typecheck passed. All eight Sarvam adapter tests passed. Independent review found no blocker in the fix, conversion scripts or main-only deployment rule.
- Official Vercel production build and `verify-vercel-build.mjs` passed, including analytics metadata, injected scripts and query-string privacy checks.
- Administrative read-only signed-in queries returned INR, available 50000 paise, no holds, answer price 1000/`₹10`, and correctly paginated INR-only credit history. Calling switch was confirmed restored.
- Public account, tasks, status, connect, `/credit`, skill and analytics endpoints returned HTTP200. Live app bundle contains the new credit-history query and page, and points to the expected Convex and customer URLs.
- Browser demo: Find shops displays `₹10 per shop that answers` and the approved charging rule. It uses sample data and makes no real calls.
- Bridge readiness: Sarvam, active=0, reconciliationRequired=0; unauthenticated dispatch401 and authenticated nonexistent-attempt lookup404.

## Limits

Actual signed-in browser rendering of credit history was not completed: Aside was signed out, and Safari verification was interrupted by the user's active browser work. Backend signed-in queries were checked with administrative read-only identity. No new real telephone call, sign-in email or embedded ChatGPT/Claude card trial was initiated for verification. Automatic website deployment does not deploy future Convex backend changes; those require a separate server release.

## Repeatable checks

[rupee-rollout.mjs](../../scripts/rupee-rollout.mjs) requires an explicit `apply` mode and paused calling with zero active/uncertain calls; it stops on mismatches. `verify <private snapshot path>` checks original money preservation and current reconciliation without mutations. Both audit modes are bounded to 1000 rows per table and reject larger datasets.

[inspect-rollout-call.mjs](../../scripts/inspect-rollout-call.mjs) inspects one existing call without dispatching; optional `--provider` checks only the matching Sarvam attempt. Credentials stay in memory and are not printed. [audit-public-endpoints.mjs](../../scripts/audit-public-endpoints.mjs) checks the public website and service routes, including `/credit`.
