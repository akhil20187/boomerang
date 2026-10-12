# Convex production preparation — 12 October 2026

User instruction: “yes we need to plan to move to production, for now copy all the details as is from development to production so users don't experience any challenges”. Recorded as D154 in memory.md (renumbered from duplicate D153).

## Live cutover completed

D155 authorises the switch and accepts reconnecting existing test accounts; the user prioritises a smooth new-user flow. The canonical website now uses `coordinated-barracuda-687` production. New OAuth connections use its HTTP origin as issuer; the public MCP address remains `https://www.askboomerang.online/mcp`.

Paused application/auth/background mutations on both deployments using `MIGRATION_READ_ONLY`, with old call dispatch disabled and no bridge calls active. Captured final development snapshot `1791772525554525352` and pre-restore production rollback snapshot `1791772528432937809`, restored into production, then exported verification snapshot `1791772610073386300`. [Snapshot comparison](../../scripts/verify-convex-snapshots.py) matched all **1,500 records across 50 document tables and all 32 stored-file hashes**, including every account/credit/task field and ID. The extra record since the first copy was a sign-in refresh record. This comparison was before later test signups and the production asset publish.

Vercel production `VITE_CONVEX_URL` is saved as `https://coordinated-barracuda-687.convex.cloud`. [Vercel routes](../../vercel.json) now forward MCP, protected-resource discovery, connection approval and recording/call-event API routes to production. Built with the approved custom-domain URLs, verified analytics packaging, staged deployment `dpl_HL4ajKV74vLGJmBhNUJQfuSxwQ9K`, then promoted it. Initial promotion by deployment ID selected the wrong team; promotion by full URL with explicit team and project succeeded. The served app bundle independently contains production's data origin. Production static/widget deployment is `bddf0821-a704-449c-a272-0a976ee92de0`; served widget matches the local build.

Railway `voice-bridge` callback is now `https://coordinated-barracuda-687.convex.site/api/call-event`. Deployment `6ad1a076-f663-4a67-a336-485e53d6f7f8` succeeded; health 200, ready, Sarvam, no active calls. Kept the existing bridge, public hostname, provider settings and journal volume; its Railway environment is still named `development`, but it serves the production backend. [Deployment script default](../../call-bridge/deploy-railway.mjs) now uses the production callback. Replayed **only one status check for each of two unfinished imported attempts**, without redialing: production scheduler confirms two pending `calls:checkAbandoned` jobs and none running. These historical calls still require provider reconciliation; migration does not invent their outcomes.

Production is writable with `LIVE_CALLS_ENABLED=true`. Source `little-kangaroo-718` remains read-only with calling disabled. Its HTTP requests forward to production using `MIGRATION_FORWARD_URL`; original Convex and Vercel resource aliases are accepted on production. Both old/new OAuth metadata endpoints now return the production issuer. Old direct database connections from cached browser tabs are not forwarded: refresh the website; existing assistants may need reconnecting as explicitly accepted by D155. Keep the retired source settings in place; use a separate development deployment for future experiments.

Verification: **120 backend tests and 107 existing tests pass**, TypeScript checks pass, backend pushed to both deployments, Vercel build and analytics checks pass. Migration regressions first failed, then passed, covering public/auth/background write rejection, HTTP body/header/query/status preservation, temporary 503 handling and keeping credential forwarding on the configured origin even for a double-slash path. Final settings were read back. Authorised empty callback requests return 400 on both URLs, proving secret acceptance/forwarding without processing any event. Public SDK discovery selects production; unauthenticated MCP is 401. All checked website routes and analytics return 200; Railway callback and served app origin are correct.

Walked the **live custom-domain signup in an isolated browser** with a fresh labelled [Resend delivery simulator](https://resend.com/docs/dashboard/emails/send-test-emails), leaving the user's existing signed-in browser alone. Form showed “Check your email”; retrieved the simulator message and redeemed its actual `/tasks` return link; browser showed ₹100 available and opened the app. [Screenshot](../verification/2026-10-12-production-signup.png). Using that genuine browser token, [protocol verification](../../scripts/verify-production-signin.mjs) confirmed approved INR account, welcome credit, task history, dynamic OAuth registration, PKCE approval/exchange, public-domain MCP's eight tools, embedded widget and refresh-token rotation. Revoked the test connection and signed out the test session. An earlier verifier assumed `/account` instead of the real form's `/tasks` route and omitted task-history pagination; these were corrected. Test fixtures remain distinguishable simulator accounts. No real-recipient email or phone call was sent.

Not tested: a real phone call after cutover or actual ChatGPT/Claude host rendering. The protocol and browser signup are verified; these external-host/calling checks remain separate. Once production takes writes, rolling back to the old database requires reconciling those writes first.

## Completed standby copy

| Item | Development (still live) | Production standby |
|---|---|---|
| Deployment | `little-kangaroo-718` | `coordinated-barracuda-687` |
| Data origin | `https://little-kangaroo-718.convex.cloud` | `https://coordinated-barracuda-687.convex.cloud` |
| HTTP origin | `https://little-kangaroo-718.convex.site` | `https://coordinated-barracuda-687.convex.site` |

Production was empty before work: backup contained no application tables or stored files, and no user environment settings existed. Copied all 16 user settings using [the guarded settings script](../../scripts/copy-convex-production-settings.cjs), reading each back for equality without printing secrets. The sole deliberate exception is `LIVE_CALLS_ENABLED=false` in production: a standby must not duplicate real calls. Deployment-specific built-in URLs naturally differ.

Deployed current local backend code, schema, indexes and all four component instances to production; Convex's TypeScript check passed. Restored the unmodified development export, including component documents and file storage, with `convex import --deployment coordinated-barracuda-687 --replace --yes`. No live Vercel configuration, Railway callback, development calling setting or local deployment selection was changed.

Private backups are outside the repository in `/private/tmp/boomerang-production-copy-20261012/`, directory mode 700 and ZIP mode 600. They contain private user/session information; do not commit or publish them. This temporary location is not durable backup storage.

| Snapshot | Export timestamp |
|---|---|
| Empty production before | `1791770905522416673` |
| Development source | `1791770908407010725` |
| Production after import | `1791771279369216296` |

## Verification

Independent production re-export matched the development snapshot across all 50 document tables, including storage metadata: 1,499 records with identical IDs, creation times and every field. All 32 binary files matched SHA-256 hashes. Import reported 1,467 application/component documents; the remaining 32 compared records are storage metadata. System table definitions were excluded from document equality because deployment metadata is generated separately.

The copy includes 10 users/accounts, 9 sign-in sessions, 256 sign-in refresh records, 19 tasks, 25 shop jobs, 237 call attempts, 194 transcript segments, 2 credit accounts, 46 credit entries and 21 reservations. MCP clients, grants and token records are also identical. Sixteen root storage files and sixteen static-hosting files are preserved.

Production read-only query confirms 10 users, 19 tasks, 2 credit accounts and zero scheduled functions pending or in progress. Production skill, OAuth metadata and signing-key metadata return 200; unauthenticated MCP returns the expected 401. The live `/account` bundle still contains the development data origin and no production data origin. Public MCP discovery still advertises the development issuer.

No production login redemption, real email recipient, authenticated ChatGPT/Claude connection or phone call was tested. This proves a faithful saved copy, not a completed customer cutover. Development remains writable, so later changes will not automatically reach production.

## Original cutover plan — historical; D155 accepts reconnecting test accounts

1. Prepare login compatibility. Signing keys and sessions are copied, but existing browser tokens identify the development HTTP origin as their issuer. Check whether accepting that old issuer alongside production is supported, implement and test the session refresh path, and verify an already signed-in browser survives the switch. Copying the database alone does not prove that.
2. Preserve MCP compatibility under D152. Existing clients retain development OAuth endpoint addresses. Design forwarding from those old endpoints to one production token authority, retain the legacy resource aliases, and test existing access tokens plus refresh rotation. Avoid letting development and production independently rotate the same copied grants. Keep the public connection URL `https://www.askboomerang.online/mcp`.
3. Rebuild website and embedded widget against the production data origin. Imported static assets currently contain the development build. Check Vercel rewrites, auth return addresses, widget resource addresses and recording access together.
4. Coordinate active work. The source snapshot contains two running tasks and two reconciling shop jobs; the scheduler audit found six development `calls:checkAbandoned` jobs pending and none in progress. Convex snapshots exclude scheduled functions. Do not replay calls or billing blindly. Drain or reconcile these jobs against the voice bridge and preserve callbacks before switching its target.
5. At the agreed switch time, briefly pause new writes/call starts, take a fresh development backup and a production rollback backup, and restore the final snapshot. Recheck settings, every credit balance/reservation, IDs and stored-file hashes. This final sync includes sign-ins, tasks and grants changed since today's copy.
6. Switch the website/widget, MCP forwarding and Railway callback coherently; enable production calls only after development dispatch is stopped. Recreate only specifically identified necessary pending work. Verify a returning user's account/credits, one authorised sign-in, old/new MCP connections and task/recording reads before reopening calls.
7. Keep development data and private backups for rollback. If production has accepted new writes, switching back requires reconciling those changes first; the old snapshot is no longer sufficient. Do not delete the source deployment during migration.

Convex documentation: [backup contents and exclusions](https://docs.convex.dev/database/backup-restore), [ZIP import and preserved IDs](https://docs.convex.dev/database/import-export/import).
