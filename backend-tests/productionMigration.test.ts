import { afterEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
import { forwardRequest } from '../convex/migration';
const modules = import.meta.glob('../convex/**/*.*s');
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('makes the retired deployment read-only, including auth and background mutations', async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx => ctx.db.insert('users', {email:'migration@example.com'}));
  vi.stubEnv('MIGRATION_READ_ONLY', 'true');
  await expect(t.withIdentity({subject:userId+'|session'}).mutation(api.users.updateProfile,{name:'Changed'}))
    .rejects.toThrow('Reload');
  await expect(t.action(api.auth.signIn,{provider:'resend',params:{email:'migration@example.com'}}))
    .rejects.toThrow('Reload');
  await expect(t.mutation(internal.maintenance.cleanup,{})).rejects.toThrow('Reload');
  expect((await t.run(ctx=>ctx.db.get(userId)))?.name).toBeUndefined();
});

it('forwards old HTTP URLs, bearer tokens and bodies to one production backend', async () => {
  vi.stubEnv('MIGRATION_FORWARD_URL','https://production.convex.site');
  vi.stubEnv('CONVEX_SITE_URL','https://development.convex.site');
  const fetcher=vi.fn(async (url,options)=>{
    expect(String(url)).toBe('https://production.convex.site/oauth/token?keep=1');
    expect(options.headers.get('authorization')).toBe('Bearer test-token');
    expect(options.body).toBe('grant_type=refresh_token');
    expect(options.redirect).toBe('manual');
    return new Response('preserved',{status:400,headers:{'Cache-Control':'no-store'}});
  });
  vi.stubGlobal('fetch',fetcher);
  const t=convexTest(schema,modules);
  const response=await t.fetch('/oauth/token?keep=1',{method:'POST',headers:{authorization:'Bearer test-token'},body:'grant_type=refresh_token'});
  expect(response.status).toBe(400);
  expect(await response.text()).toBe('preserved');
  expect(fetcher).toHaveBeenCalledOnce();
});

it('temporarily rejects source HTTP writes before the final snapshot',async()=>{
  vi.stubEnv('MIGRATION_READ_ONLY','true');
  const t=convexTest(schema,modules);
  const response=await t.fetch('/oauth/register',{method:'POST',body:'{}'});
  expect(response.status).toBe(503);
  expect(response.headers.get('Retry-After')).toBe('30');
});

it('keeps forwarded credentials on production even for a path beginning with two slashes',async()=>{
  vi.stubEnv('MIGRATION_FORWARD_URL','https://production.convex.site');
  const fetcher=vi.fn(async(url)=>{
    expect(String(url)).toBe('https://production.convex.site//untrusted.example/path');
    return new Response('ok');
  });
  vi.stubGlobal('fetch',fetcher);
  await forwardRequest(new Request('https://development.convex.site//untrusted.example/path',{headers:{Authorization:'Bearer test-only'}}));
});
