# Bounded widget polling and call reconciliation

Prepared locally from `main` commit `31f7f3e9af604bc3c27e8ae2f08d2b5c33db2e48` on branch `fix/bounded-call-reconciliation`. No deployment, live call, sign-in, credential change, plan change or external configuration change was performed. These are confirmed code defects, not a confirmed diagnosis of Convex account usage or the affected team/project.

## Changes

- The assistant widget stops status requests once its task finishes. It pauses in hidden documents, refreshes when visible, permits only one outstanding request, and ignores responses after disposal/task changes. Active polling starts at 3 seconds, moves to 10 seconds after one minute and 30 seconds after five minutes. Transient transport, MCP error and malformed status responses back off to at most 60 seconds between attempts, recovering after a valid response. A task-ID-only host result clears a previous task's display, so a finished previous task cannot prevent the new task from loading.
- Reconciliation claims are atomic and persisted. Each attempt gets at most 12 automatic bridge checks and at most one hour from its original start; the existing initial 12-minute accepted-call check and 1-minute uncertain-call check remain. Later checks are five minutes apart. Duplicate scheduled jobs/callbacks do not create parallel retry chains. A successor is scheduled before bridge I/O to survive interrupted actions; a completed or bounded chain can leave one queued job, which exits without bridge I/O or rescheduling.
- At the bound, `manualReconciliationAt` and a `manual_reconciliation_required` event record the need for review. The job remains nonterminal `reconciling`, the task remains running, and the interface says “Call status unconfirmed · needs review.” No failure, credit release, charge or redial is inferred from missing evidence. `prepare` now also refuses reconciling jobs. Uncertain dispatch no longer mislabels billing as released.
- Late terminal callbacks still pass through the existing idempotent result/billing path and clear the manual flag. Bridge failures, 404s and missing configuration remain uncertain. Missing, terminal, rejected and superseded attempts cannot perform reconciliation I/O.
- Optional schema fields support existing records; an already old attempt moves to manual review the next time its queued check runs. No live data migration was attempted.

## Verification

- `OPENAI_API_KEY= MONID_API_KEY= npm run test:backend -- --reporter=dot`: **240 passed** across 24 files. Includes polling completion, task replacement/disposal, visibility/no overlap, transient errors and cadence; count/age limits, duplicate jobs, bridge exceptions/HTTP errors, missing/terminal/stale attempts, a callback racing bridge I/O, and late paid completion charged exactly once.
- `umask 0022; npm test`: **153 passed**. The umask applies only to the test shell. The initial run had 151 passes and one pre-existing bootstrap test failure because the environment's `0077` umask created `0600` where the test expected `0644`. No production file permissions were changed.
- `npm run typecheck`, `npm run build`, `git diff --check`: passed. Build retains its >500 kB bundle warning.
- Initial typecheck found missing installed packages. Restored the unchanged lockfile with `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/boomerang-npm-cache`; the first install's default cache path was unwritable. No package manifest/lockfile changes.
- Initial backend run exposed two new test-fixture errors, corrected before the passing run. One existing search test assumes no ambient OpenAI key; blank provider keys in the test process resolve it. Providers are mocked; no real calls or emails were sent.
- Tests exercise the poll controller's lifecycle contract used by the React effect. Real assistant-host rendering/visibility and a live Convex deployment were not exercised.

## Remaining operational risks and release review

The bridge's persisted callback queue still retries failed delivery every 30 seconds, and its recovery loop also runs every 30 seconds. This can continue generating traffic during a backend outage. It is unchanged because truncating the queue could discard final results or billing evidence; a separate change should add durable backoff and operational alerts while retaining/replaying every pending callback. The bounded Convex loop does not bound bridge-originated traffic. Existing 15- and 30-minute cleanup crons remain unchanged.

Manual-review tasks intentionally remain unresolved and can retain reserved credit until verified provider facts arrive. Operators should identify attempts with `manualReconciliationAt` or their task event, inspect exact bridge/provider IDs and saved results, and reconcile through the existing callback/result path only with confirmed evidence. Do not reset attempt counts, release/charge credit, or redial merely because checks expired. There is no new operator alert or manual-resolution UI in this patch.

Terminal widgets no longer periodically discover later ancillary changes such as recording availability; a fresh host tool result or reopening/refetching the task supplies those updates. Unresolved visible widgets still poll, at the reduced cadence. No claim is made that account usage is now fixed or service restored.

After review and explicit release authorization: integrate through `development`, deploy/test the Convex functions plus optional schema and widget assets against the isolated development deployment, verify late callbacks and billing there, then separately approve production release. Production requires the Convex changes and rebuilt widget assets as well as the frontend; a frontend-only release is insufficient. Confirm the actual affected project/team and compare live usage telemetry before making a usage diagnosis. No push/PR was performed in this task; the local commit and patch are the review deliverables.

## Local follow-up review

Reviewed latest-attempt races, held credit, late callbacks and polling disposal/visibility/error recovery. Corrected repeated uncertain-callback timeline text after automatic checks stop; it now continues to say manual review is needed. Added two regression cases where a newer attempt takes over during bridge I/O: neither an unknown response nor a completed old result changes the newer job, settles its credit, or restarts the old check chain; a completed old result retains its answer evidence. The full backend suite now passes 240 tests; typecheck and diff checks pass again. Frontend code was unchanged in this follow-up, so the prior 153-test and build results still apply. Publication remains unauthorized: no push, PR, merge or deployment was attempted by this task.
