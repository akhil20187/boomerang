# Standard public MCP address

Decision D138 selects `https://askboomerang.vercel.app/mcp` for new connections. The website, account, tasks and skill share that public origin.

Vercel forwards `/mcp` to the existing Convex server at `/mcp/public`, and both public protected-resource discovery paths to Convex's explicit `/public` metadata route. The distinct backend paths keep old Convex connections' metadata correct without trusting forwarded-host headers. Browser `/oauth/request` and `/oauth/approve` are forwarded too.

The sign-in issuer, registration, token and revocation endpoints remain on Convex. This preserves current grants and callbacks. The server accepts exactly its public and original resource addresses. Authorization codes and refresh tokens stay bound to the resource selected at authorization; switching that resource at exchange or refresh is rejected. Existing customer balances, billing and provider callbacks are unchanged.

Public skill examples and production build configuration use Vercel. The build respects `VITE_MCP_PUBLIC_URL` before legacy MCP configuration. Existing connections may retain their Convex address.

Local verification: 99 local tests, 69 backend tests and typecheck pass; new tests cover both addresses through approval, token exchange, authenticated initialization, refresh, replay rejection and resource mismatch rejection. The build checks both skill copies and the landing setup link. Independent code review found no critical or important issues; its minor audit concern was fixed by checking the actual MCP response and both resource documents.

Merged [PR #3](https://github.com/akhil20187/boomerang/pull/3) as `akhil20187` into main at `f9f83bd7503fb962a8874fc9b3b99cb25c6ecd6d`. Automatic Vercel deployment `dpl_CdX9jgAPBvtwDAs7Vi8um3bQ55tb` is READY. Backend code is published to `little-kangaroo-718`, with `MCP_PUBLIC_URL` set to Vercel; the production website build's `VITE_MCP_PUBLIC_URL` is also Vercel. Static deployment `d70da997-b1d8-4727-b649-2dbba75837df` updates the widget and second hosted skill copy.

Live checks passed: both skill copies use the branded address, native SDK discovery and resource selection work, the public endpoint requires authentication (401), public metadata names Vercel and legacy metadata names Convex, approval preflight returns 204, invalid approval is rejected, and the published widget matches the checked build. The existing voice bridge remains ready with no active or unreconciled calls.

Run `node scripts/verify-public-mcp.mjs` for anonymous discovery and the native SDK's resource selection. The optional authenticated checks require an existing private `MCP_TEST_TOKEN`. Real customer sign-in and authenticated live MCP requests remain untested; no new email or phone call was sent. Local authenticated-flow tests passed.

The user's requested `gh` CLI account switch to `akhil20187` was completed and checked via `gh api user`; saved credentials stayed private.

Implementation follows [Vercel external forwarding](https://vercel.com/docs/routing/rewrites) and [MCP authorization/resource discovery](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization). MCP permits a separate authorization server.
