import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vercelEnvironment, vercelRoutes } from './vercel-environment.mjs';

const production = { VERCEL_ENV: 'production', VITE_CONVEX_URL: 'https://coordinated-barracuda-687.convex.cloud' };
const preview = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'development', VITE_CONVEX_URL: 'https://unique-wombat-849.convex.cloud', CONVEX_DEPLOY_KEY: 'dev:unique-wombat-849|test' };
test('preview database and every backend route use development', () => {
  const settings = vercelEnvironment(preview);
  assert.equal(settings.site, 'https://unique-wombat-849.convex.site');
  const routes = vercelRoutes(settings);
  assert.equal(routes.filter(r => r.dest?.startsWith(settings.site)).length, 4);
  assert.ok(!JSON.stringify(routes).includes('coordinated-barracuda-687'));
});
test('production keeps the production backend', () => {
  assert.equal(vercelEnvironment(production).site, 'https://coordinated-barracuda-687.convex.site');
});
test('preview fails closed on production URLs, wrong branch or wrong scoped key', () => {
  for (const override of [{ VITE_CONVEX_URL: production.VITE_CONVEX_URL }, { VERCEL_GIT_COMMIT_REF: 'main' }, { CONVEX_DEPLOY_KEY: 'prod:coordinated-barracuda-687|test' }])
    assert.throws(() => vercelEnvironment({ ...preview, ...override }));
  assert.throws(() => vercelEnvironment({ ...production, VITE_CONVEX_URL: preview.VITE_CONVEX_URL }));
});
test('every website page loads the app directly (refresh, email links)', () => {
  const pages = vercelRoutes(vercelEnvironment(production)).filter(r => r.dest === '/index.html').map(r => new RegExp(`^${r.src}$`));
  const opens = path => pages.some(p => p.test(path));
  for (const path of ['/app', '/account', '/credit', '/calls', '/connect-assistant', '/tasks', '/status', '/connect', '/demo', '/demo/', '/demo/calls', '/demo/connect-assistant', '/demo/account', '/demo/signin', '/demo/welcome'])
    assert.ok(opens(path), path);
  for (const path of ['/mcp', '/api/x', '/demo/../mcp', '/SKILL.md']) assert.ok(!opens(path), path);
});
