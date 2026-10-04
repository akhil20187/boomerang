# Account linking

Default redirects exactly match ChatGPT's `https://chatgpt.com/connector_platform_oauth_redirect` and Claude's `https://claude.ai/api/mcp/auth_callback`. No wildcard host/path is accepted. Both addresses appear in [Google Cloud's application setup guide](https://docs.cloud.google.com/mcp/configure-mcp-ai-application), checked 5 October 2026. This establishes callback configuration, not a successful host connection.

In Claude's OAuth client settings, use **Register automatically** for this implementation. It supports dynamic client registration, not Claude's published client-metadata identity. The setting is described in [Claude's current custom-connector guide](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), checked 5 October 2026. Host connection is still unverified.

`oauth.mjs` supplies OAuth metadata, exact-allowlist client registration, authorization requests, website consent, one-use authorization codes with S256 proof, scoped access tokens and revocation. Convex verifies the signed-in customer and stores the underlying account token. No shared server customer identity exists.

Root server integration configures issuer from `MCP_PUBLIC_URL`, website approval page from `SITE_URL + '/connect'`, and exact host callback URLs from `MCP_OAUTH_REDIRECT_URIS`. The official ChatGPT stable callback is `https://chatgpt.com/connector_platform_oauth_redirect` when issuer identification is supported. Copy any connection-specific callback from the host management page into the explicit allowlist. Unknown redirect URLs are rejected, including lookalike host domains.

State uses a private durable `mcp/.state/oauth.json` file (file permissions 0600, directory 0700). Never commit it. One process owns this state; multi-replica deployment needs a shared transactional store. Authorization requests expire after 10 minutes and codes after 2 minutes. Access tokens default to 1 hour and cannot outlive the underlying Convex token. Rotating refresh tokens let the host renew access without repeating account linking; their expiry also cannot exceed the underlying account token.

The `/connect` page preserves `oauth_request` during email sign-in. It shows the requesting host and asks for explicit approval. `POST /oauth/approve` requires a real Convex sign-in token; root's mint callback must create an authenticated Convex client and call `users:createAccessToken`. Never accept user IDs or emails from browser JSON as identity.

For protected MCP calls, use `resolveToken(bearer, 'shops:read')` for discovery/status and `resolveToken(bearer, 'calls:write')` for starting calls. The result is the account-specific Convex token; null means reject and challenge OAuth again. Refresh requests require the same client and resource and may retain or narrow scopes. Each successful refresh consumes its secret and returns a new one. Reusing a consumed secret revokes every token in that connection's family. Revoking either an access or refresh token also revokes its family. Revoking the underlying account token in Convex denies every wrapper referencing it on subsequent backend calls.

Only the configured website origin receives approval CORS headers. Host server-to-server calls use no browser origin. Public registration/request/code/token collections have bounded capacity; expired requests, codes and tokens are pruned during relevant operations. Reverse-proxy rate limits should supplement these bounds before public launch.

Verification: local tests cover metadata, attacker redirect rejection, PKCE/resource validation, fake customer rejection, code replay, token wrapping, revocation, scope separation, expiration, refresh rotation, replay-family revocation and durable restart behavior. Bridge tests cover read-only provider reconciliation, active/unknown calls, exact provider identity, no duplicate/redial after restart, reserved capacity and nullable recording evidence. Provider integrations use fake responses; ChatGPT/Claude account linking, provider recovery and card rendering remain untested live.

[Official authentication requirements](https://developers.openai.com/plugins/build/auth).
