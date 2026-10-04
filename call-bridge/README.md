# Human MCP call bridge

The bridge handles authenticated dispatch only. It reuses the tested Vobiz/OpenAI phone agent, tracks attempts on disk, forwards provider media, extracts evidenced shop answers and reports to Convex. No call is made by starting the process. Live provider behavior is not verified by the automated tests.

## Configuration

Required environment variables:

- `CALL_BRIDGE_SECRET`: random secret of at least 32 characters shared with Convex. Never put it in browser code.
- `CALL_BRIDGE_PUBLIC_URL`: this server's public HTTPS origin, without a trailing slash.
- `CONVEX_CALLBACK_URL`: deployed backend origin plus `/api/call-event`.
- `OPENAI_API_KEY`, `VOBIZ_AUTH_ID`, `VOBIZ_AUTH_TOKEN`, `VOBIZ_FROM_NUMBER`.

Optional: `OPENAI_VOICE_MODEL` (existing verified test default), `OPENAI_SUMMARY_MODEL` (`gpt-4.1-mini`), `CALL_BRIDGE_MAX_CONCURRENT` (1; maximum 10), `CALL_BRIDGE_MAX_SECONDS` (180; allowed 30–900), `PORT` (3212), `CALL_BRIDGE_JOURNAL` (default `call-bridge/data/attempts.json`). These operational defaults are configurable, not approved customer pricing or service limits.

Run from the repository root with Node 22 or newer and the repository dependencies installed:

```sh
node --env-file=.env call-bridge/bridge.cjs
node --test call-bridge/*.test.cjs voice-test/phone-agent.test.cjs
```

## Hosting

Hosting provider remains the user's choice under D61. Run one process behind an HTTPS reverse proxy that forwards HTTP requests and WebSocket upgrades. The process listens on localhost. Keep the journal on a durable disk, restrict it to this process owner, and back it up privately. Do not run multiple bridge replicas sharing this file. Do not expose internal per-call localhost ports.

Expose `/health`, `/dispatch`, `/answer/*`, `/status/*`, `/media/*` and `/recording/*`. Provider callback/media paths contain unguessable per-call capability tokens; redact these URL paths from proxy logs. `/dispatch` and `/attempts/:attemptId` require `Authorization: Bearer CALL_BRIDGE_SECRET`. Health reveals only readiness/counts, no customer information.

## Contract

`POST /dispatch` JSON: `{attemptId, taskId, shopJobId, to, customerName, productDescription, instructions?}`. Phone numbers use country codes. `202` means dispatch accepted, not answered. A repeat with the same attempt and same approved inputs returns `200` without another call; changed inputs return `409`. Capacity returns `429` before dialing. Invalid input returns `400`; missing secret returns `401`.

Callback `POST CONVEX_CALLBACK_URL` uses the same Bearer secret and JSON `{eventId, attemptId, taskId, shopJobId, status, providerCallId, providerRequestId, durationSeconds, endReason, transportStatus, transcript, errors, answer?, recording?}`. Status is `answered`, `completed`, `failed` or `reconciliation_required`. Transcript segments have `{speaker:'caller'|'agent', text}`. Answer has `stock`, `variantMatch`, nullable `finalPrice`, `currency:'INR'`, nullable `offers`/`notes`, `personalCallNeeded` and literal `evidenceQuotes`. Recording has `status:'ready'`, `recordingId`, `url` and nullable `durationSeconds`.

Callbacks are kept in a durable queue and retried every 30 seconds with the same event ID. Convex must deduplicate events and apply lifecycle events monotonically. Late recording callbacks update evidence without reopening billing/calls. Recordings start once per answered call through Vobiz's documented Record endpoint. Only its completion callback makes a recording ready; playback/transfer remains unverified. Notes remain usable if recording fails. The recording URL is provider evidence; the backend must validate allowed origins before downloading it and restrict customer access.

## Restart and uncertain dispatch

Attempts are saved before provider dispatch. An interrupted active or answered attempt becomes `reconciliation_required` after restart and is never automatically dialed again. A provider request timeout also requires reconciliation. A watchdog closes local audio after duration plus 90 seconds and reports uncertainty if no provider hangup callback arrived. Uncertain attempts reserve concurrency capacity until their outcome is confirmed.

On startup and every 30 seconds, the bridge checks saved uncertain attempts through read-only Vobiz live/queued-call lookups and the completed-call record endpoint. Provider identity must match the saved call UUID and destination when present. The documented request UUID can be used as the same call identifier, but only a matching provider response can resolve it. A confirmed finished call reports a terminal callback preserving transcript/answer evidence. Active calls remain uncertain and keep being checked; a 404, missing identifier or unavailable provider does not prove the call never happened.

Authenticated `GET /attempts/:attemptId` performs the same reconciliation and returns the saved record, including `{reconciliation:{checkedAt,source,reason,providerStatus?}}`. The backend watchdog can use this endpoint after missed callbacks/restarts. It must retain uncertain attempts as nonterminal and must not redial, charge or refund solely because status is unknown. Create a new attempt ID only when the previous call is confirmed ended and the retry is eligible. Attempts whose provider identifier was never returned may still need operator investigation.

Sources: [Vobiz recording API](https://vobiz.ai/docs/call/record-calls/start-recording), [Vobiz live-call lookup](https://www.vobiz.ai/docs/call/retrieve-live-call), [Vobiz completed-call record contract](https://github.com/vobiz-ai/Agent-Skills/blob/main/skills/vobiz-cdr/SKILL.md), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
