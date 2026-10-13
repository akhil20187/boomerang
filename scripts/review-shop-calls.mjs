// Read only: retrieve the two user-requested completed calls. Never dispatches.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../call-bridge/.state/shop-review-2026-10-08/', import.meta.url);
mkdirSync(dir, { recursive: true, mode: 0o700 });
const secret = execFileSync('npx', ['convex', 'env', 'get', 'CALL_BRIDGE_SECRET', '--deployment', 'little-kangaroo-718'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 }).trim();
const calls = [['miamore', 'k174ehs0c4skxqx5yvehbb3j1h8fwjpm'], ['bbr', 'k170enhdzb3xgk4j1wdvzn6erx8fx1sm']];
await Promise.all(calls.map(async ([name, id]) => {
  const base = `https://voice-bridge-development.up.railway.app/attempts/${id}`;
  const options = { headers: { Authorization: `Bearer ${secret}` }, redirect: 'error', signal: AbortSignal.timeout(45000) };
  const r = await fetch(base, options);
  if (!r.ok) throw Error(`Attempt lookup HTTP ${r.status}`);
  const record = await r.json();
  if (record.attemptId !== id) throw Error('Attempt identity mismatch');
  // Omit contact numbers, credentials, callback capabilities and unrelated records.
  const evidence = { attemptId: id, provider: record.provider, status: record.status, businessName: record.businessName, customerName: record.customerName, productDescription: record.productDescription, instructions: record.instructions, createdAt: record.createdAt, sarvam: record.sarvam, result: record.result };
  writeFileSync(new URL(name + '.json', dir), JSON.stringify(evidence, null, 2), { mode: 0o600 });
  const audio = await fetch(base + '/recording', { ...options, signal: AbortSignal.timeout(45000) });
  if (!audio.ok) throw Error(`Recording lookup HTTP ${audio.status}`);
  const bytes = Buffer.from(await audio.arrayBuffer());
  if (bytes.subarray(0, 4).toString() !== 'RIFF') throw Error('Expected WAV recording');
  writeFileSync(new URL(name + '.wav', dir), bytes, { mode: 0o600 });
  console.log(JSON.stringify({ name, attemptId: id, status: record.status, duration: record.result?.durationSeconds, recordingBytes: bytes.length, transcript: record.result?.transcript, answer: record.result?.answer, instructions: record.instructions, callsPlaced: 0 }));
}));
