import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = '3f9f23df-6a17-449c-aeaf-4a0f76e0e7bb';
const service = 'd9eec7c9-7f94-4f4c-aa9f-bd0b14f8f492';
const environment = 'de43205b-a2b2-42e8-92a0-55cdcf55e941';
const publicUrl = 'https://voice-bridge-development.up.railway.app';
const mode = process.argv[2];
function run(command, args, input) {
  const result = spawnSync(command, args, { cwd: root, input, encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status ?? 'timeout'}); credential-bearing output suppressed`);
  return result.stdout;
}
if (mode === 'configure') {
  const required = ['OPENAI_API_KEY', 'VOBIZ_AUTH_ID', 'VOBIZ_AUTH_TOKEN', 'VOBIZ_FROM_NUMBER'];
  for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
  const secretFile = join(root, '.env.voice');
  let secret;
  if (existsSync(secretFile)) secret = readFileSync(secretFile, 'utf8').match(/^CALL_BRIDGE_SECRET=(.+)$/m)?.[1];
  if (!secret) {
    secret = randomBytes(32).toString('hex');
    writeFileSync(secretFile, `CALL_BRIDGE_SECRET=${secret}\n`, { mode: 0o600, flag: 'wx' });
  }
  chmodSync(secretFile, 0o600);
  if (secret.length < 32) throw new Error('Invalid saved bridge secret');
  const variables = Object.fromEntries(required.map(key => [key, process.env[key]]));
  Object.assign(variables, {
    CALL_BRIDGE_SECRET: secret, CALL_BRIDGE_PUBLIC_URL: publicUrl,
    CONVEX_CALLBACK_URL: 'https://little-kangaroo-718.convex.site/api/call-event',
    PORT: '3212', CALL_BRIDGE_BIND_HOST: '0.0.0.0',
    CALL_BRIDGE_JOURNAL: '/var/lib/human-mcp/attempts.json',
    CALL_BRIDGE_MAX_CONCURRENT: '1', CALL_BRIDGE_MAX_SECONDS: '180',
    NODE_ENV: 'production', RAILWAY_RUN_UID: '0',
  });
  for (const [key, value] of Object.entries(variables)) {
    run('railway', ['variable', 'set', key, '--stdin', '--skip-deploys', '--project', project, '--service', service, '--environment', environment], value);
    console.log(`Configured Railway ${key}`);
  }
  for (const [key, value] of Object.entries({ CALL_BRIDGE_URL: publicUrl, CALL_BRIDGE_SECRET: secret })) {
    run('npx', ['convex', 'env', 'set', key], value);
    console.log(`Configured Convex ${key}`);
  }
} else if (mode === 'stage') {
  const files = ['call-bridge/Dockerfile', 'call-bridge/Dockerfile.dockerignore',
    'call-bridge/package.json', 'call-bridge/package-lock.json', 'call-bridge/bootstrap.cjs',
    'call-bridge/bridge.cjs', 'call-bridge/answer.cjs', 'call-bridge/reconcile.cjs',
    'voice-test/phone-agent.cjs', 'voice-test/phone-core.cjs'];
  for (const file of files) if (!existsSync(join(root, file))) throw new Error(`Missing production file ${file}`);
  const folder = mkdtempSync(join(tmpdir(), 'human-mcp-voice-'));
  for (const file of files) {
    mkdirSync(dirname(join(folder, file)), { recursive: true });
    copyFileSync(join(root, file), join(folder, file));
  }
  console.log(JSON.stringify({ folder, files, project, service, environment }));
} else throw new Error('Choose configure or stage');
