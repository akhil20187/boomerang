# Vercel frontend

Project: `akhil20187s-projects/boomerang`.
Preferred frontend URL: https://www.askboomerang.online (since 12 October 2026; apex redirects to www).
Public MCP URL: https://askboomerang.vercel.app/mcp
Convex runs the backend on `little-kangaroo-718`; Vercel forwards the public MCP endpoint and resource discovery to it. The OAuth sign-in issuer remains Convex, preserving existing grants and callbacks. Existing Convex connections remain supported.

## Deployment

Live Convex `SITE_URL` is now `https://www.askboomerang.online`. The deployment examples and 7 October checks below describe the earlier Vercel-domain release; avoid restoring that old `SITE_URL`. The custom-domain sign-in form and Resend simulator delivery were verified on 12 October; real inbox delivery and link redemption remain unverified. Public MCP settings have not been migrated by this sign-in fix.

Automatic Git deployment is enabled for `main` only in `vercel.json`. Commit authors must belong to the connected `akhil20187` account. Backend changes still require a separate Convex deployment; money migrations must finish and pass reconciliation before the website is published. The assistant widget is served by Convex, so card changes also need `CONVEX_DEPLOYMENT=dev:little-kangaroo-718 npx static-hosting upload --dist web/dist` after building with the approved live URLs. Run `scripts/audit-public-endpoints.mjs` to verify both the website and widget.

The local folder is linked through ignored `.vercel/project.json`.
Only built public assets are uploaded; no credentials or backend source are needed.

```sh
VITE_CONVEX_URL=https://little-kangaroo-718.convex.cloud VITE_MCP_PUBLIC_URL=https://askboomerang.vercel.app VITE_APP_PUBLIC_URL=https://askboomerang.vercel.app vercel build --prod
node scripts/verify-vercel-build.mjs
deploy_stage=$(mktemp -d /tmp/boomerang-vercel.XXXXXX)
mkdir -p "$deploy_stage/.vercel"
cp .vercel/project.json "$deploy_stage/.vercel/project.json"
cp -R .vercel/output "$deploy_stage/.vercel/output"
vercel deploy --prebuilt --prod --yes --cwd "$deploy_stage"
```

Routes in `vercel.json` serve the landing page at `/`, React pages at `/app`, `/account`, `/tasks`, `/status`, `/connect`, `/demo`, and sample audio from `/sample-audio`. Backend API requests, `/mcp`, protected-resource discovery, and browser connection request/approval are forwarded to the existing Convex deployment. Set `MCP_PUBLIC_URL=https://askboomerang.vercel.app` on that deployment and `VITE_MCP_PUBLIC_URL=https://askboomerang.vercel.app` for the website build. New MCP connections use the public Vercel address; existing Convex connections remain valid. Authorization codes and refresh tokens stay bound to the exact resource they were issued for.

The public address follows Vercel's [external forwarding](https://vercel.com/docs/routing/rewrites) and MCP's [protected-resource discovery](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization). MCP permits a separate sign-in issuer; changing the public connection address does not require changing account authentication.

## Analytics — 7 October 2026

Installed `@vercel/analytics` 2.0.1. Analytics was already enabled on the Hobby project. `prepare-vercel.mjs` bundles `web/src/analytics.ts` and adds it to landing/app HTML only; embedded MCP widget HTML is excluded. Before sending, query strings and fragments are removed so sign-in codes, connection requests and task IDs are not reported.

Use the official `vercel build --prod` step above. Packaging output directly, even with handcrafted feature metadata and a forced deployment, left `/_vercel/insights/script.js` returning 404. The official build deployment `dpl_Ho6iDZJZXpzgjPnmhbf9cr21EFCh` served the script and recorded real visits; restored it after the unsuccessful packaging experiments. Do not claim that missing feature metadata alone explains the failure; the precise platform dependency is unresolved.

Vercel build can automatically pull project environment variables if local settings are missing. Auto-review rejected an explicit production pull. A later build unexpectedly pulled automatically; the downloaded `.vercel/.env.production.local` was removed without inspecting its values. Do not repeat that implicit pull without authorization. No environment files were copied to deployment staging.

Verified dashboard: 1 visitor, 2 page views, `/` and `/account`, India, desktop/Mac. Dashboard: https://vercel.com/akhil20187s-projects/boomerang/analytics . Typecheck/build and 87 local + 54 backend checks passed. `verify-vercel-build.mjs` checks package metadata, page injection, widget exclusion and URL stripping. Run tests **before** the production build: the existing widget test rebuilds `web/dist` without deployment environment overrides.

## Public launch — 7 October 2026

Deployment `dpl_CieQ3q24c3rjhxGTssgoV3A7qAGN` is READY. `askboomerang.vercel.app` is attached as a production domain and anonymous requests return 200. Vercel project protection remains `all_except_custom_domains`; Boomerang account authentication remains required.

Initial automatic review rejected domain attachment; user explicitly approved “make it publicly accessible .” and the command succeeded. That blocker is resolved.

Completed:

1. Attached the public domain and verified anonymous home/app/account/tasks access.
2. Updated generated setup prompts and skill website links; MCP still uses the original Convex endpoint.
3. Set Convex `SITE_URL=https://askboomerang.vercel.app`. Deployed exact-origin compatibility for both first-party frontends in `websiteOrigins.ts`, auth redirects and MCP browser requests. Unrelated origins remain rejected.
4. Verified live Vercel-origin preflight 204, unrelated-origin 403, sample audio range 206, and private recording access without a token 401. Browser account form renders.

Remaining: actual email sign-in and signed-in search/call on the new origin. No email or call was sent for this deployment.

One subsequent in-repository upload was blocked by Vercel's Git-author team-membership check (`dpl_J4tmXdTKF4fPhqHbcWGFqw6UVkQ3`). Deploying the same compiled public assets from a clean staging folder under the authenticated Vercel account succeeded; commands above preserve this approach without changing Git authorship or team permissions.

Checks: build and typecheck pass; 87 local and 54 backend tests pass, including old/new sign-in origins and rejection of external redirect targets. The first sandboxed test run failed because localhost listeners were denied; the same tests passed outside the sandbox.
