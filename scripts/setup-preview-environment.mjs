// Explicit one-time infrastructure setup; never print credentials.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';
const project = '3f9f23df-6a17-449c-aeaf-4a0f76e0e7bb';
const environment = 'de43205b-a2b2-42e8-92a0-55cdcf55e941';
const sourceService = 'd9eec7c9-7f94-4f4c-aa9f-bd0b14f8f492';
const targetService = '26f71537-6b43-426c-b607-f0c47b776fc5';
const deployment = 'unique-wombat-849';
const website = 'https://boomerang-git-development-akhil20187s-projects.vercel.app';
const bridge = 'https://voice-bridge-preview-development.up.railway.app';
function run(command, args, input) {
  try { return execFileSync(command, args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, DO_NOT_TRACK: '1' } }).trimEnd(); }
  catch { throw new Error(`${command} ${args.slice(0, 2).join(' ')} failed; credential-bearing output suppressed.`); }
}
const set = (name, value) => run('npx', ['convex', 'env', 'set', name, '--deployment', deployment], value);
const existing = run('npx', ['convex', 'env', 'list', '--deployment', deployment, '--names-only']);
if (existing.trim()) throw new Error('Development already configured; refuse to rotate existing credentials.');
const source = JSON.parse(run('railway', ['variable', 'list', '--json', '--project', project, '--service', sourceService, '--environment', environment]));
const copied = Object.fromEntries(Object.entries(source).filter(([name]) => /^(SARVAM_|VOBIZ_)/.test(name) || ['OPENAI_API_KEY', 'CALL_PROVIDER'].includes(name)));
if (copied.CALL_PROVIDER !== 'sarvam' || !copied.SARVAM_VOICE_API_KEY) throw new Error('Expected active Sarvam configuration.');
const secret = randomBytes(32).toString('hex');
const variables = { ...copied, CALL_BRIDGE_SECRET: secret, CALL_BRIDGE_PUBLIC_URL: bridge,
  CONVEX_CALLBACK_URL: `https://${deployment}.convex.site/api/call-event`, PORT: '3212',
  CALL_BRIDGE_BIND_HOST: '0.0.0.0', CALL_BRIDGE_JOURNAL: '/var/lib/human-mcp/attempts.json',
  CALL_BRIDGE_MAX_CONCURRENT: '1', CALL_BRIDGE_MAX_SECONDS: '180', NODE_ENV: 'production', RAILWAY_RUN_UID: '0' };
for (const [name, value] of Object.entries(variables)) run('railway', ['variable', 'set', name, '--stdin', '--skip-deploys', '--project', project, '--service', targetService, '--environment', environment], value);
for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'OPENAI_API_KEY', 'GOOGLEPLACES_API_KEY', 'MONID_API_KEY', 'ANSWER_PRICE_CENTS']) {
  const value = run('npx', ['convex', 'env', 'get', name, '--deployment', 'coordinated-barracuda-687']);
  if (value) set(name, value);
}
const keys = await generateKeyPair('RS256', { extractable: true });
set('JWT_PRIVATE_KEY', (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' '));
set('JWKS', JSON.stringify({ keys: [{ use: 'sig', ...await exportJWK(keys.publicKey) }] }));
for (const [name, value] of Object.entries({ SITE_URL: website, MCP_PUBLIC_URL: website,
  CALL_BRIDGE_URL: bridge, CALL_BRIDGE_SECRET: secret, LIVE_CALLS_ENABLED: 'false',
  MIGRATION_READ_ONLY: 'false', WEBSITE_ALLOWED_ORIGINS: 'http://127.0.0.1:5173,http://localhost:5173' })) set(name, value);
const tokenFile = '/private/tmp/boomerang-development-token.env';
fs.chmodSync(tokenFile, 0o600);
const token = fs.readFileSync(tokenFile, 'utf8').match(/^CONVEX_DEPLOY_KEY=(.+)$/m)?.[1];
if (!token?.startsWith(`dev:${deployment}|`)) throw new Error('Wrong deployment key.');
run('vercel', ['env', 'add', 'CONVEX_DEPLOY_KEY', 'preview', 'development', '--sensitive', '--yes', '--scope', 'akhil20187s-projects'], token);
for (const [name, value] of Object.entries({ VITE_CONVEX_URL: `https://${deployment}.convex.cloud`, VITE_CONVEX_SITE_URL: `https://${deployment}.convex.site`, VITE_MCP_PUBLIC_URL: website, VITE_APP_PUBLIC_URL: website }))
  run('vercel', ['env', 'add', name, 'preview', 'development', '--value', value, '--yes', '--scope', 'akhil20187s-projects']);
// Runtime configuration file; preserve all unrelated local secrets/settings.
let local = fs.readFileSync('.env.local', 'utf8');
for (const [name, value] of Object.entries({ CONVEX_URL: `https://${deployment}.convex.cloud`, CONVEX_SITE_URL: `https://${deployment}.convex.site`, VITE_CONVEX_URL: `https://${deployment}.convex.cloud`, VITE_CONVEX_SITE_URL: `https://${deployment}.convex.site`, VITE_MCP_PUBLIC_URL: website, VITE_APP_PUBLIC_URL: 'http://127.0.0.1:5173' })) {
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  local = pattern.test(local) ? local.replace(pattern, `${name}=${value}`) : `${local}\n${name}=${value}\n`;
}
fs.writeFileSync('.env.local', local, { mode: 0o600 });
console.log('Configured isolated development auth, provider settings, callback, scoped Vercel variables and local URLs. Calling stays disabled until bridge health is checked.');
