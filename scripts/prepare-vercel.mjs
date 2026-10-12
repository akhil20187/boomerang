import fs from 'node:fs/promises';
import { build } from 'vite';
import { vercelEnvironment, vercelRoutes } from './vercel-environment.mjs';

// Upload only compiled public files with `vercel deploy --prebuilt --prod`.
// Build first, with VITE_APP_PUBLIC_URL set to the chosen Vercel alias.
const routes = vercelRoutes(vercelEnvironment());
await fs.rm('.vercel/output', { recursive: true, force: true });
await fs.mkdir('.vercel/output', { recursive: true });
await fs.cp('web/dist', '.vercel/output/static', { recursive: true });
const analytics = await build({
  configFile: false,
  build: {
    write: false,
    minify: true,
    lib: { entry: 'web/src/analytics.ts', name: 'BoomerangAnalytics', formats: ['iife'] },
  },
});
const bundles = Array.isArray(analytics) ? analytics : [analytics];
const script = bundles.flatMap(bundle => 'output' in bundle ? bundle.output : [])
  .find(file => file.type === 'chunk');
if (!script || script.type !== 'chunk') throw new Error('Analytics bundle missing');
await fs.writeFile('.vercel/output/static/analytics.js', script.code);
for (const file of ['index.html', 'landing.html']) {
  const target = `.vercel/output/static/${file}`;
  const html = await fs.readFile(target, 'utf8');
  await fs.writeFile(target, html.replace('</head>', '<script defer src="/analytics.js"></script></head>'));
}
await fs.writeFile('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes,
}, null, 2) + '\n');
// `vercel build --prod` must wrap this command: its generated build metadata
// provisions the analytics endpoints. Handcrafted prebuilt metadata did not.
console.log('Prepared Vercel static deployment; no source files or environment files included.');
