# Standard public MCP address

Decision D138 selects `https://askboomerang.vercel.app/mcp` for new connections. The website, account, tasks and skill share that public origin.

Vercel forwards `/mcp` to the existing Convex server at `/mcp/public`, and both public protected-resource discovery paths to Convex's explicit `/public` metadata route. The distinct backend paths keep old Convex connections' metadata correct without trusting forwarded-host headers. Browser `/oauth/request` and `/oauth/approve` are forwarded too.

The sign-in issuer, registration, token and revocation endpoints remain on Convex. This preserves current grants and callbacks. The server accepts exactly its public and original resource addresses. Authorization codes and refresh tokens stay bound to the resource selected at authorization; switching that resource at exchange or refresh is rejected. Existing customer balances, billing and provider callbacks are unchanged.

Public skill examples and production build configuration use Vercel. The build respects `VITE_MCP_PUBLIC_URL` before legacy MCP configuration. Existing connections may retain their Convex address.

Local verification: 99 local tests, 69 backend tests and typecheck pass; new tests cover both addresses through approval, token exchange, authenticated initialization, refresh, replay rejection and resource mismatch rejection. The build checks both skill copies and the landing setup link. Independent code review found no critical or important issues; its minor audit concern was fixed by checking the actual MCP response and both resource documents.

Deployment and live verification are pending. Run `node scripts/verify-public-mcp.mjs` for anonymous discovery and the native SDK's resource selection. The optional authenticated checks require an existing private `MCP_TEST_TOKEN`; do not claim real customer sign-in was tested without completing it.

Implementation follows [Vercel external forwarding](https://vercel.com/docs/routing/rewrites) and [MCP authorization/resource discovery](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization). MCP permits a separate authorization server.
