const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./server.cjs');

async function withServer(fn) {
  const server = createServer({ apiKey: 'sk-test-private', model: 'gpt-realtime-2.1' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('serves a working test page without exposing the key', async () => withServer(async base => {
  const r = await fetch(base); const body = await r.text();
  assert.equal(r.status, 200); assert.match(body, /Start voice test/);
  assert.ok(!body.includes('sk-test-private'));
}));
test('does not serve environment files', async () => withServer(async base => {
  for (const path of ['/.env', '/../.env', '/server.cjs']) assert.equal((await fetch(base + path)).status, 404);
}));
test('rejects requests from another website', async () => withServer(async base => {
  const r = await fetch(base + '/session', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
}));
test('rejects invalid session requests before contacting OpenAI', async () => withServer(async base => {
  const r = await fetch(base + '/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sdp: 'invalid', product: '' }) });
  assert.equal(r.status, 400);
}));
