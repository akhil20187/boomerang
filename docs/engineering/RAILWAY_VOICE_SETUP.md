# Railway voice server — 5 October 2026

The user authorised a small Railway server to make calling functional (D91). Infrastructure is created; the voice application is not deployed or remotely verified yet.

## Created infrastructure

- Private project: Human MCP Voice (`3f9f23df-6a17-449c-aeaf-4a0f76e0e7bb`).
- Development environment: `de43205b-a2b2-42e8-92a0-55cdcf55e941`.
- Service: voice-bridge (`d9eec7c9-7f94-4f4c-aa9f-bd0b14f8f492`).
- Limit: 0.5 GB memory, 0.5 vCPU, one process; 500 MB persistent call journal mounted at `/var/lib/human-mcp`.
- HTTPS domain: `https://voice-bridge-development.up.railway.app`, target port 3212.
- Dockerfile: `call-bridge/Dockerfile`; health check `/health`; sleeping disabled, 60-second shutdown drain.

## Outstanding blockers

Automatic approval review rejected copying the existing local OpenAI and Vobiz credentials to Railway. Specific permission is pending. No credentials were transferred. Customer price is also pending; `ANSWER_PRICE_CENTS` remains unset and `LIVE_CALLS_ENABLED=false` in Convex.

## Prepared deployment

`call-bridge/deploy-railway.mjs configure` passes each credential to the Railway CLI through standard input and suppresses credential-bearing command output. It saves the generated bridge secret in ignored `.env.voice`, restricted to its owner, and sets the matching connection secret/URL in Convex. It does not enable calls or configure a customer price.

`call-bridge/deploy-railway.mjs stage` copies ten allowlisted production files into a temporary folder. No environment files, recordings, customer journals, research or repository history enter the upload. Upload this folder with Railway's `up --path-as-root` command and explicit project/service/environment IDs.

Railway starts a minimal bootstrap as root to repair mounted-volume ownership; it drops groups and switches to user/group 1000 before launching the call server. Ordinary Docker still defaults to user `node`. Only the fixed journal directory and two fixed regular journal files can be repaired; symlinks and unexpected paths are rejected.

## Verification

75 local tests and 36 backend tests pass; TypeScript checks pass. Regression coverage includes uncertain dispatch without redial, longer product descriptions without truncation, bootstrap permission restrictions, authenticated recovery and recording download restrictions. Local mock-server tests require permission to bind localhost outside the sandbox. Docker daemon is unavailable locally, so actual image/volume startup must be checked on Railway.

After deployment, check remote `/health`, unauthenticated dispatch rejection and authenticated lookup of a nonexistent attempt. These checks must not create an attempt or contact a phone. Health only proves process configuration/readiness, not that provider credentials work. Real calling and recording playback remain user-run final verification. The exact recording hostname must be observed from Vobiz before enabling recording downloads; never guess a wildcard.
