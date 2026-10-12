// The public endpoint and original deployment are aliases of the same server.
// Keep the OAuth issuer stable so existing refresh grants remain valid.
export function publicMcpOrigin() {
  return new URL(process.env.MCP_PUBLIC_URL || process.env.CONVEX_SITE_URL!).origin;
}

export function publicMcpResource() {
  return `${publicMcpOrigin()}/mcp`;
}

export function isMcpResource(resource: unknown): resource is string {
  const legacyResources = (process.env.MCP_LEGACY_PUBLIC_URLS || '')
    .split(',').map(value => value.trim()).filter(Boolean)
    .map(value => `${new URL(value).origin}/mcp`);
  return typeof resource === 'string' &&
    (resource === publicMcpResource() || resource === `${process.env.CONVEX_SITE_URL}/mcp` || legacyResources.includes(resource));
}
