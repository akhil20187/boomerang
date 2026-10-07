import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const script = path.resolve('scripts/configure-development.mjs');

function configure(existing) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'boomerang-config-test-'));
  try {
    const calls = path.join(folder, 'calls.jsonl');
    fs.writeFileSync(path.join(folder, 'npx'), '#!/usr/bin/env node\n' + `
      const fs=require('fs');const args=process.argv.slice(2);
      if(args[0]!=='convex')process.exit(1);
      if(args[1]==='env'&&args[2]==='list')console.log(process.env.TEST_EXISTING);
      else if(args[1]==='env'&&args[2]==='set')fs.appendFileSync(process.env.TEST_CALLS,JSON.stringify(args.slice(3))+'\\n');
      else process.exit(1);
    `, { mode: 0o755 });
    execFileSync(process.execPath, [script], { cwd: folder, encoding: 'utf8', env: {
      PATH: folder + path.delimiter + process.env.PATH,
      TEST_EXISTING: ['JWT_PRIVATE_KEY=test-key', 'JWKS=test-public', ...existing].join('\n'),
      TEST_CALLS: calls,
      VITE_APP_PUBLIC_URL: 'https://askboomerang.vercel.app',
      CONVEX_SITE_URL: 'https://little-kangaroo-718.convex.site',
    } });
    return fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse).flat() : [];
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
}

test('setup preserves an existing website URL and live-calling state', () => {
  assert.deepEqual(configure(['SITE_URL=https://askboomerang.vercel.app', 'LIVE_CALLS_ENABLED=true']), []);
});
test('first setup uses the public website URL and defaults calls to disabled', () => {
  assert.deepEqual(configure([]), ['SITE_URL=https://askboomerang.vercel.app', 'LIVE_CALLS_ENABLED=false']);
});
