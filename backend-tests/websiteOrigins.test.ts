import { afterEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { websiteRedirect } from '../convex/websiteOrigins';
import { api } from '../convex/_generated/api';
import { generateKeyPair, exportPKCS8, decodeJwt } from 'jose';
const modules = import.meta.glob('../convex/**/*.*s');
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('creates a Vercel email link, redeems it and preserves the connection request through sign-in', async () => {
  vi.stubEnv('SITE_URL', 'https://askboomerang.vercel.app');
  vi.stubEnv('CONVEX_SITE_URL', 'https://little-kangaroo-718.convex.site');
  vi.stubEnv('RESEND_API_KEY', 'test-only');
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com');
  const keys = await generateKeyPair('RS256', { extractable: true });
  vi.stubEnv('JWT_PRIVATE_KEY', await exportPKCS8(keys.privateKey));
  let emailText = '';
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    expect(String(url)).toBe('https://api.resend.com/emails');
    emailText = JSON.parse(options.body).text;
    return Response.json({ id: 'simulated-email' });
  }));
  const t = convexTest(schema, modules);
  const email = 'vercel-login-test@example.com';
  expect(await t.action(api.auth.signIn, { provider: 'resend', params: {
    email, redirectTo: 'https://askboomerang.vercel.app/connect?oauth_request=keep-me',
  } })).toEqual({ started: true });
  const link = new URL(emailText.match(/https:\/\/\S+/)![0]);
  expect(link.origin).toBe('https://askboomerang.vercel.app');
  expect(link.pathname).toBe('/connect');
  expect(link.searchParams.get('oauth_request')).toBe('keep-me');
  const result = await t.action(api.auth.signIn, { provider: 'resend', params: { email, code: link.searchParams.get('code')! } });
  expect(result.tokens?.token).toBeTruthy();
  const identity = decodeJwt(result.tokens!.token);
  const account = await t.withIdentity({ subject: identity.sub! }).query(api.users.me, {});
  expect(account.email).toBe(email);
  expect(account.eligible).toBe(true);
});

it('redirects old customer pages to Vercel while retaining task and connection parameters', async () => {
  vi.stubEnv('SITE_URL', 'https://askboomerang.vercel.app');
  vi.stubEnv('CONVEX_SITE_URL', 'https://little-kangaroo-718.convex.site');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Old homepage</html>')));
  const t = convexTest(schema, modules);
  for (const path of ['/', '/app', '/account', '/tasks', '/status?task=example', '/connect?oauth_request=example', '/demo', '/landing.html', '/index.html']) {
    const response = await t.fetch(path);
    expect(response.status).toBe(302);
    const expected = path === '/landing.html' ? '/' : path === '/index.html' ? '/app' : path;
    expect(response.headers.get('Location')).toBe('https://askboomerang.vercel.app' + expected);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
  const metadata = await t.fetch('/.well-known/oauth-authorization-server');
  expect((await metadata.json()).issuer).toBe('https://little-kangaroo-718.convex.site');
});

it('keeps sign-in on either first-party website and rejects lookalikes and external redirects', () => {
  vi.stubEnv('SITE_URL', 'https://askboomerang.vercel.app');
  vi.stubEnv('CONVEX_SITE_URL', 'https://little-kangaroo-718.convex.site');
  expect(websiteRedirect('/tasks')).toBe('https://askboomerang.vercel.app/tasks');
  expect(websiteRedirect('https://little-kangaroo-718.convex.site/connect?request=123'))
    .toBe('https://little-kangaroo-718.convex.site/connect?request=123');
  for (const url of ['https://evil.example', '//evil.example', 'https://askboomerang.vercel.app.evil.example', 'https://evil@askboomerang.vercel.app', 'http://askboomerang.vercel.app', 'https://preview.vercel.app'])
    expect(() => websiteRedirect(url)).toThrow('Sign-in redirect is not allowed');
});

it('permits connection approval requests from both websites but rejects unrelated origins', async () => {
  vi.stubEnv('SITE_URL', 'https://askboomerang.vercel.app');
  vi.stubEnv('CONVEX_SITE_URL', 'https://little-kangaroo-718.convex.site');
  const t = convexTest(schema, modules);
  for (const origin of ['https://askboomerang.vercel.app', 'https://little-kangaroo-718.convex.site']) {
    const response = await t.fetch('/oauth/approve', { method: 'OPTIONS', headers: { Origin: origin } });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  }
  const rejected = await t.fetch('/oauth/approve', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  expect(rejected.status).toBe(403);
  expect(rejected.headers.has('Access-Control-Allow-Origin')).toBe(false);
});
