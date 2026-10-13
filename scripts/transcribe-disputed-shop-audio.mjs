// Independently transcribe short disputed passages from the two approved recordings.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../call-bridge/.state/shop-review-2026-10-08/', import.meta.url);
function clipWav(bytes, start, end) {
  let fmt, data;
  for (let p = 12; p + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', p, p + 4), size = bytes.readUInt32LE(p + 4);
    if (kind === 'fmt ') fmt = bytes.subarray(p + 8, p + 8 + size);
    if (kind === 'data') data = bytes.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.readUInt16LE(0) !== 1) throw Error('Expected PCM WAV');
  const rate = fmt.readUInt32LE(8), align = fmt.readUInt16LE(12);
  const crop = data.subarray(Math.floor(start * rate / align) * align, Math.min(data.length, Math.floor(end * rate / align) * align));
  const out = Buffer.alloc(12 + 8 + fmt.length + (fmt.length % 2) + 8 + crop.length);
  out.write('RIFF'); out.writeUInt32LE(out.length - 8, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(fmt.length, 16); fmt.copy(out, 20);
  const dp = 20 + fmt.length + (fmt.length % 2); out.write('data', dp); out.writeUInt32LE(crop.length, dp + 4); crop.copy(out, dp + 8);
  return out;
}
await Promise.all([['miamore', 15, 42], ['bbr', 42, 63]].map(async ([name, start, end]) => {
  const bytes = clipWav(readFileSync(new URL(name + '.wav', dir)), start, end);
  const body = new FormData();
  body.append('model', 'gpt-4o-transcribe'); body.append('response_format', 'json');
  body.append('file', new Blob([bytes], { type: 'audio/wav' }), name + '-clip.wav');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body, signal: AbortSignal.timeout(90000) });
  const data = await r.json();
  if (!r.ok) throw Error(`Transcription HTTP ${r.status}: ${data.error?.code || 'request_failed'}`);
  writeFileSync(new URL(name + '-disputed-transcription.json', dir), JSON.stringify({ model: 'gpt-4o-transcribe', start, end, ...data }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ name, start, end, text: data.text }));
}));
