import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { vercelEnvironment } from './vercel-environment.mjs';

const settings = vercelEnvironment();
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit', env: process.env });
if (settings.preview) {
  // The key is scoped to this development deployment. Production has no key here.
  const origins = ['http://127.0.0.1:5173', 'http://localhost:5173'];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  run('npx', ['convex', 'env', 'set', 'WEBSITE_ALLOWED_ORIGINS', origins.join(',')]);
  run('npx', ['convex', 'dev', '--once']);
}
run('npm', ['run', 'build']);
if (settings.preview) {
  const path = 'web/dist/SKILL.md';
  const skill = await fs.readFile(path, 'utf8');
  await fs.writeFile(path, skill.replaceAll('https://www.askboomerang.online', process.env.VITE_MCP_PUBLIC_URL));
}
if (settings.preview) run('npx', ['static-hosting', 'upload', '--dist', 'web/dist']);
await import('./prepare-vercel.mjs');
