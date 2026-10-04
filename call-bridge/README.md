# Human MCP call bridge

The bridge handles authenticated dispatch only. It reuses the tested Vobiz/OpenAI phone agent, tracks attempts on disk, forwards provider media, extracts evidenced shop answers and reports to Convex. No call is made by starting the process. Saved attempts can trigger read-only provider reconciliation. Live provider behavior is not verified by the automated tests.

## Configuration

Required environment variables:

- `CALL_BRIDGE_SECRET`: random secret of at least 32 characters shared with Convex. Never put it in browser code.
- `CALL_BRIDGE_PUBLIC_URL`: this server's public HTTPS origin, without a trailing slash.
- `CONVEX_CALLBACK_URL`: deployed backend origin plus `/api/call-event`.
- `OPENAI_API_KEY`, `VOBIZ_AUTH_ID`, `VOBIZ_AUTH_TOKEN`, `VOBIZ_FROM_NUMBER`.

The production entry point checks these settings before listening and exits when a required setting is missing or invalid. Error messages name settings without printing their values. `/health` measures runtime configuration and process readiness; it does not prove provider credentials or calling work. An exported bridge instance using the real agent also returns `503` and blocks dispatch when configuration is incomplete; injected fake agents remain available for tests.

Optional: `OPENAI_VOICE_MODEL` (existing verified test default), `OPENAI_SUMMARY_MODEL` (`gpt-4.1-mini`), `CALL_BRIDGE_MAX_CONCURRENT` (1; maximum 10), `CALL_BRIDGE_MAX_SECONDS` (180; allowed 30–900), `PORT` (3212), `CALL_BRIDGE_JOURNAL` (default `call-bridge/data/attempts.json`), `CALL_BRIDGE_BIND_HOST` (`127.0.0.1`; use `0.0.0.0` inside a container). These operational defaults are configurable, not approved customer pricing or service limits.

Run from the repository root with Node 22 or newer and the repository dependencies installed:

```sh
node --env-file=.env call-bridge/bridge.cjs
node --test call-bridge/*.test.cjs voice-test/phone-agent.test.cjs
```

## Hosting

Hosting provider remains the user's choice under D61. Run one process behind an HTTPS reverse proxy that forwards HTTP requests and WebSocket upgrades. The process listens on localhost by default; the container listens on all of its internal interfaces so Docker can forward requests. Keep host port publication restricted to localhost when a host proxy fronts it. Keep the journal on a durable disk, restrict it to this process owner, and back it up privately. Do not run multiple bridge replicas sharing this file. Do not expose internal per-call localhost ports.

Expose `/health`, `/dispatch`, `/answer/*`, `/status/*`, `/media/*` and `/recording/*`. Provider callback/media paths contain unguessable per-call capability tokens; redact these URL paths from proxy logs. `/dispatch` and `/attempts/:attemptId` require `Authorization: Bearer CALL_BRIDGE_SECRET`. Health reveals only readiness/counts, no customer information.

## Container build and local smoke check

From the repository root:

```sh
docker build --pull -f call-bridge/Dockerfile -t human-mcp-call-bridge:local .
docker volume create human-mcp-bridge-smoke
docker run --detach --name human-mcp-bridge-smoke \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --stop-timeout=60 \
  --publish 127.0.0.1:3213:3212 \
  --mount type=volume,source=human-mcp-bridge-smoke,target=/var/lib/human-mcp \
  --env CALL_BRIDGE_SECRET=local-smoke-test-only-not-a-real-secret-000000 \
  --env CALL_BRIDGE_PUBLIC_URL=https://bridge.example.invalid \
  --env CONVEX_CALLBACK_URL=https://callback.example.invalid/api/call-event \
  --env OPENAI_API_KEY=fake-local-smoke-key \
  --env VOBIZ_AUTH_ID=fake-local-smoke-id \
  --env VOBIZ_AUTH_TOKEN=fake-local-smoke-token \
  --env VOBIZ_FROM_NUMBER=+919000000000 \
  human-mcp-call-bridge:local
curl --fail http://127.0.0.1:3213/health
docker inspect --format '{{.State.Health.Status}}' human-mcp-bridge-smoke
docker exec human-mcp-bridge-smoke id
docker stop human-mcp-bridge-smoke
docker rm human-mcp-bridge-smoke
```

The smoke check uses fake configuration values, an empty new volume and no valid provider credentials. Do not POST `/dispatch` during this check. Expected health is `ready:true`, `active:0`; Docker health becomes `healthy` after its first health probe. The process runs as `node` (UID 1000), not root. Retain or remove the separate smoke volume as needed; it is separate from production call history.

The image installs only locked `ws@8.21.0`, skips package install scripts and optional native modules, and copies five production source files. `Dockerfile.dockerignore` applies a deny-by-default allowlist to the repository-root build context, excluding `.env`, keys, recordings, transcripts, journals, research, Git and host `node_modules`. The Node base tag follows Node 22 security updates; production can pin a reviewed image digest with `--build-arg NODE_IMAGE=node:22-alpine@sha256:<reviewed-digest>`.

## Run on the chosen server

Create a private environment file outside the repository/build context containing only the required bridge/provider configuration above. Supply secrets at runtime through `--env-file` or the hosting platform's secret settings; never use Docker build arguments for secrets.

```sh
docker volume create human-mcp-bridge-data
docker run --detach --name human-mcp-call-bridge \
  --restart unless-stopped --stop-timeout=60 \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --publish 127.0.0.1:3212:3212 \
  --mount type=volume,source=human-mcp-bridge-data,target=/var/lib/human-mcp \
  --env-file /absolute/private/path/call-bridge.env \
  human-mcp-call-bridge:local
```

Named volumes inherit the image's journal directory permissions (UID 1000, mode 0700). For an existing host bind mount, the directory must instead be writable by UID 1000 and restricted to that owner. The journal file is saved with mode 0600. Configure the chosen HTTPS proxy to forward HTTP and WebSocket upgrades to localhost port 3212; retain this same data volume during upgrades. The container's health check only requests `/health` and never calls providers.

Verification on 5 October 2026: 28 bridge tests passed, including observed localhost/default and container-interface binding, missing runtime configuration, fail-closed CLI startup, recovery and fake provider behavior. The minimal dependency lock passed an offline install dry run. Docker CLI is installed, but its daemon socket is absent on this computer; image build, container startup, volume ownership and container health are therefore not yet verified. No hosting was selected or deployed.

## Contract

`POST /dispatch` JSON: `{attemptId, taskId, shopJobId, to, customerName, productDescription, instructions?}`. Phone numbers use country codes. `202` means dispatch accepted, not answered. A repeat with the same attempt and same approved inputs returns `200` without another call; changed inputs return `409`. Capacity returns `429` before dialing. Invalid input returns `400`; missing secret returns `401`.

Callback `POST CONVEX_CALLBACK_URL` uses the same Bearer secret and JSON `{eventId, attemptId, taskId, shopJobId, status, providerCallId, providerRequestId, durationSeconds, endReason, transportStatus, transcript, errors, answer?, recording?}`. Status is `answered`, `completed`, `failed` or `reconciliation_required`. Transcript segments have `{speaker:'caller'|'agent', text}`. Answer has `stock`, `variantMatch`, nullable `finalPrice`, `currency:'INR'`, nullable `offers`/`notes`, `personalCallNeeded` and literal `evidenceQuotes`. Recording has `status:'ready'`, `recordingId`, `url` and optional `durationSeconds`; unknown duration is omitted.

Callbacks are kept in a durable queue and retried every 30 seconds with the same event ID. Convex must deduplicate events and apply lifecycle events monotonically. Late recording callbacks update evidence without reopening billing/calls. Recordings start once per answered call through Vobiz's documented Record endpoint. Only its completion callback makes a recording ready; playback/transfer remains unverified. Notes remain usable if recording fails. The recording URL is provider evidence; the backend must validate allowed origins before downloading it and restrict customer access.

## Restart and uncertain dispatch

Attempts are saved before provider dispatch. An interrupted active or answered attempt becomes `reconciliation_required` after restart and is never automatically dialed again. A provider request timeout also requires reconciliation. A watchdog closes local audio after duration plus 90 seconds and reports uncertainty if no provider hangup callback arrived. Uncertain attempts reserve concurrency capacity until their outcome is confirmed.

On startup and every 30 seconds, the bridge checks saved uncertain attempts through read-only Vobiz live/queued-call lookups and the completed-call record endpoint. Provider identity must match the saved call UUID and destination when present. The documented request UUID can be used as the same call identifier, but only a matching provider response can resolve it. A confirmed finished call reports a terminal callback preserving transcript/answer evidence. Active calls remain uncertain and keep being checked; a 404, missing identifier or unavailable provider does not prove the call never happened.

Authenticated `GET /attempts/:attemptId` performs the same reconciliation and returns the saved record, including `{reconciliation:{checkedAt,source,reason,providerStatus?}}`. The backend watchdog can use this endpoint after missed callbacks/restarts. It must retain uncertain attempts as nonterminal and must not redial, charge or refund solely because status is unknown. Create a new attempt ID only when the previous call is confirmed ended and the retry is eligible. Attempts whose provider identifier was never returned may still need operator investigation.

Sources: [Vobiz recording API](https://vobiz.ai/docs/call/record-calls/start-recording), [Vobiz live-call lookup](https://www.vobiz.ai/docs/call/retrieve-live-call), [Vobiz completed-call record contract](https://github.com/vobiz-ai/Agent-Skills/blob/main/skills/vobiz-cdr/SKILL.md), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
