// The public endpoint and original deployment are aliases of the same server.
// Keep the OAuth issuer stable so existing refresh grants remain valid.
export function publicMcpOrigin() {
  return new URL(process.env.MCP_PUBLIC_URL || process.env.CONVEX_SITE_URL!).origin;
}

export function publicMcpResource() {
  return `${publicMcpOrigin()}/mcp`;
}

export function isMcpResource(resource: unknown): resource is string {
  return typeof resource === 'string' &&
    (resource === publicMcpResource() || resource === `${process.env.CONVEX_SITE_URL}/mcp`);
}
