// Make the launch video's background score with Google Lyria 3 Clip (30 s) through OpenRouter.
// Usage: node make-music.mjs <take-name> [prompt-file]   → writes assets/music/<take-name>.mp3 (or .wav)
// Needs OPENROUTER_API_KEY in the project's root .env. Costs about $0.04 per clip.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const line = fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n').find(l => l.startsWith('OPENROUTER_API_KEY='));
if (!line) throw Error('OPENROUTER_API_KEY missing from .env');
const key = line.slice('OPENROUTER_API_KEY='.length).trim().replace(/^"|"$/g, '');

const take = process.argv[2] || 'take-1';
const prompt = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : fs.readFileSync(path.join(here, 'music-prompt.txt'), 'utf8');

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'google/lyria-3-clip-preview', modalities: ['audio', 'text'], stream: true, messages: [{ role: 'user', content: prompt }] }),
});
if (!res.ok) { console.error(res.status, (await res.text()).slice(0, 600)); process.exit(1); }

// Audio arrives as server-sent events; join the base64 pieces from each delta.
let b64 = '', fmt, text = '', cost, firstDelta;
const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
for (;;) {
  const { done, value } = await reader.read(); if (done) break;
  buf += dec.decode(value, { stream: true });
  let i; while ((i = buf.indexOf('\n')) >= 0) {
    const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!ln.startsWith('data:') || ln === 'data: [DONE]') continue;
    const ev = JSON.parse(ln.slice(5));
    if (ev.error) { console.error('stream error', JSON.stringify(ev.error).slice(0, 400)); process.exit(1); }
    const d = ev.choices?.[0]?.delta ?? {}; firstDelta ??= Object.keys(d).length ? d : undefined;
    if (d.audio?.data) b64 += d.audio.data;
    if (d.audio?.format) fmt = d.audio.format;
    if (typeof d.content === 'string') text += d.content;
    if (ev.usage?.cost != null) cost = ev.usage.cost;
  }
}
if (!b64) { console.error('No audio found. First delta:', JSON.stringify(firstDelta, (k, v) => typeof v === 'string' && v.length > 200 ? v.slice(0, 60) + '…' : v).slice(0, 1500), 'text:', text.slice(0, 300)); process.exit(1); }
const ext = /wav/.test(fmt || '') ? 'wav' : 'mp3';
const out = path.join(here, 'assets/music', `${take}.${ext}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(`saved ${path.relative(here, out)} · ${fmt || ext} · cost ${cost ?? 'n/a'}`);
if (text) console.log('model note:', text.slice(0, 300));
