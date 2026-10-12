import {afterEach, expect, it, vi} from 'vitest';
import {isMcpResource, publicMcpResource} from '../convex/mcpAddresses';
afterEach(() => vi.unstubAllEnvs());
it('advertises the new domain and accepts only exact configured legacy resources', () => {
  vi.stubEnv('CONVEX_SITE_URL', 'https://app.convex.site');
  vi.stubEnv('MCP_PUBLIC_URL', 'https://www.askboomerang.online');
  vi.stubEnv('MCP_LEGACY_PUBLIC_URLS', 'https://askboomerang.vercel.app');
  expect(publicMcpResource()).toBe('https://www.askboomerang.online/mcp');
  for (const url of ['https://www.askboomerang.online/mcp', 'https://app.convex.site/mcp', 'https://askboomerang.vercel.app/mcp'])
    expect(isMcpResource(url)).toBe(true);
  for (const url of ['https://evil.example/mcp', 'https://www.askboomerang.online.evil.example/mcp', 'http://www.askboomerang.online/mcp', 'https://www.askboomerang.online/mcp/other', 'https://askboomerang.vercel.app/mcp?extra=1', undefined])
    expect(isMcpResource(url)).toBe(false);
});
