import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const website = 'https://www.askboomerang.online';
const backend = 'https://coordinated-barracuda-687.convex.site';
const bridge = 'https://voice-bridge-development.up.railway.app';
const get = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'manual' });
  return { response, text: await response.text() };
};
const result = { checkedAt: new Date().toISOString(), mutations: 0 };
const config = JSON.parse(execFileSync('railway', ['variable', 'list', '--json',
  '--project', '3f9f23df-6a17-449c-aeaf-4a0f76e0e7bb',
  '--service', 'd9eec7c9-7f94-4f4c-aa9f-bd0b14f8f492',
  '--environment', 'de43205b-a2b2-42e8-92a0-55cdcf55e941'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
// Never print or persist unrelated variable values or credentials.
result.railway = Object.fromEntries(['CONVEX_CALLBACK_URL', 'CALL_BRIDGE_PUBLIC_URL', 'CALL_PROVIDER'].map(key => [key, config[key] ?? null]));
result.railway.callbackCorrect = config.CONVEX_CALLBACK_URL === `${backend}/api/call-event`;
const health = await get(`${bridge}/health`);
const state = JSON.parse(health.text);
result.bridge = { status: health.response.status, ready: state.ready, provider: state.provider, active: state.active, reconciliationRequired: state.reconciliationRequired };
const discovery = await get(`${backend}/.well-known/oauth-authorization-server`);
const metadata = JSON.parse(discovery.text);
result.oauth = Object.fromEntries(['issuer', 'authorization_endpoint', 'token_endpoint', 'registration_endpoint'].map(key => [key, metadata[key]]));
const app = await get(`${website}/app`);
const asset = app.text.match(/<script\b[^>]*src="([^\"]*\/assets\/[^\"]+\.js)"/);
if (!asset) throw new Error('App bundle not found');
const bundle = await get(new URL(asset[1], website));
result.frontend = {
  status: app.response.status,
  convexConnection: bundle.text.includes('https://coordinated-barracuda-687.convex.cloud'),
  customerLinks: bundle.text.includes(website),
  creditHistory: bundle.text.includes('credits:history') && bundle.text.includes('Credit & charges'),
};
const widget = await get(`${backend}/widget.html`);
const builtWidget = new URL('../web/dist/widget.html',import.meta.url);
const widgetHash = createHash('sha256').update(widget.text).digest('hex');
result.widget = {status:widget.response.status,rupeeVersion:widget.text.includes('credits:history') && widget.text.includes('Credit & charges'),matchesLocalBuild:existsSync(builtWidget)?widgetHash===createHash('sha256').update(readFileSync(builtWidget)).digest('hex'):null};
result.pages = {};
const protectedResource = await get(`${website}/.well-known/oauth-protected-resource/mcp`);
const legacyResource = await get(`${backend}/.well-known/oauth-protected-resource/mcp`);
const mcpChallenge = await fetch(`${website}/mcp`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize'}), signal:AbortSignal.timeout(15000), redirect:'manual'});
result.mcp = {
  status:mcpChallenge.status,
  publicResource:JSON.parse(protectedResource.text).resource,
  legacyResource:JSON.parse(legacyResource.text).resource,
  challenge:mcpChallenge.headers.get('www-authenticate'),
};
if(result.mcp.status!==401 || result.mcp.publicResource!==`${website}/mcp` || result.mcp.legacyResource!==`${backend}/mcp` || !result.mcp.challenge?.includes(`${website}/.well-known/oauth-protected-resource/mcp`)) throw new Error('MCP forwarding or public/legacy resource discovery is incorrect');
for (const route of ['/account', '/connect', '/status', '/tasks', '/credit', '/SKILL.md', '/_vercel/insights/script.js']) {
  const data = await get(website + route);
  result.pages[route] = data.response.status;
  if (route === '/SKILL.md') result.skill = { accountUsesVercel: data.text.includes(website + '/account'), mcpUsesVercel: data.text.includes(website + '/mcp') };
}
console.log(JSON.stringify(result, null, 2));
