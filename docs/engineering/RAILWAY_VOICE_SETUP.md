# Railway voice server — 5 October 2026

The user authorised a small Railway server to make calling functional (D91) and explicitly approved the credential transfer (D93). The voice application is deployed and its no-dial health/access checks pass. Actual calling remains a user-run final test.

## Created infrastructure

- Private project: Boomerang Voice (`3f9f23df-6a17-449c-aeaf-4a0f76e0e7bb`).
- Development environment: `de43205b-a2b2-42e8-92a0-55cdcf55e941`.
- Service: voice-bridge (`d9eec7c9-7f94-4f4c-aa9f-bd0b14f8f492`).
- Limit: 0.5 GB memory, 0.5 vCPU, one process; 500 MB persistent call journal mounted at `/var/lib/human-mcp`.
- HTTPS domain: `https://voice-bridge-development.up.railway.app`, target port 3212.
- Dockerfile: `call-bridge/Dockerfile`; health check `/health`; sleeping disabled, 60-second shutdown drain.

## Current configuration

The earlier credential-transfer rejection is resolved by D93's explicit approval. OpenAI/Vobiz runtime credentials and matching bridge secrets are configured. The user selected $0.10 per useful shop answer (D92); `ANSWER_PRICE_CENTS=10` and `LIVE_CALLS_ENABLED=true` are configured. Approval and credit gates remain enforced.

## Prepared deployment

`call-bridge/deploy-railway.mjs configure` passes each credential to the Railway CLI through standard input and suppresses credential-bearing command output. It saves the generated bridge secret in ignored `.env.voice`, restricted to its owner, and sets the matching connection secret/URL in Convex. It does not enable calls or configure a customer price.

`call-bridge/deploy-railway.mjs stage` copies ten allowlisted production files into a temporary folder. No environment files, recordings, customer journals, research or repository history enter the upload. Upload this folder with Railway's `up --path-as-root` command and explicit project/service/environment IDs.

Railway starts a minimal bootstrap as root to repair mounted-volume ownership; it drops groups and switches to user/group 1000 before launching the call server. Ordinary Docker still defaults to user `node`. Only the fixed journal directory and two fixed regular journal files can be repaired; symlinks and unexpected paths are rejected.

## Verification

75 local tests and 36 backend tests pass; TypeScript checks pass. Regression coverage includes uncertain dispatch without redial, longer product descriptions without truncation, bootstrap permission restrictions, authenticated recovery and recording download restrictions. Local mock-server tests require permission to bind localhost outside the sandbox. Docker daemon is unavailable locally, so actual image/volume startup must be checked on Railway.

Deployment `ab1ebc9f-b2c4-41b1-a932-7bbce12792a3` succeeded with a mounted volume and passing platform health check. Remote `/health` returned ready=true with zero active/uncertain attempts; unauthenticated dispatch returned 401; authenticated lookup of a nonexistent attempt returned 404. The checks created no call or provider request. One completed simulated job and no queued jobs existed before enabling the feature. Railway rejected the first build's Docker VOLUME instruction; it was removed, retaining the explicit Railway volume.

Health only proves process configuration/readiness, not that provider credentials work. Real calling, live media and recording playback remain user-run final verification. The exact recording hostname must be observed from Vobiz before enabling recording downloads; never guess a wildcard. Refreshed ChatGPT rendering remains unverified.
