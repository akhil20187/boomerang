// Make a recreated sample call with OpenAI's realtime voice model (gpt-realtime-2.1).
// Usage: node scripts/sample-calls/generate-realtime.cjs scripts/sample-calls/<name>.script.json
// Needs OPENAI_API_KEY in .env and ffmpeg. Writes design/pages/variants/audio/<name>.mp3 + <name>.json (line timings).
// AI caller speaks with "marin" (the product's calling voice); the shopkeeper with "cedar".
// Each line is spoken verbatim; the spoken transcript is checked and the line retried if the wording drifts.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { WebSocket } = require('ws');

const ROOT = path.resolve(__dirname, '..', '..');
const MODEL = process.env.SAMPLE_CALL_MODEL || 'gpt-realtime-2.1';
const VOICES = { ai: 'marin', shop: 'cedar' };
const RATE = 24000;

function apiKey() {
  const line = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').find(l => l.startsWith('OPENAI_API_KEY='));
  if (!line) throw Error('OPENAI_API_KEY missing from .env');
  return line.slice('OPENAI_API_KEY='.length).trim().replace(/^"|"$/g, '');
}

const norm = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '');

function speak(key, voice, style, text) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${MODEL}`, { headers: { Authorization: 'Bearer ' + key } });
    const chunks = []; let said = '';
    const timer = setTimeout(() => { ws.terminate(); reject(Error('timeout')); }, 60000);
    const send = m => ws.send(JSON.stringify(m));
    ws.on('open', () => {
      send({ type: 'session.update', session: {
        type: 'realtime', output_modalities: ['audio'],
        instructions: `You are a voice actor recording one line of a phone call. ${style} Say the user's line exactly as written, word for word, in its language. Do not add, drop or change any words. Do not answer it or comment on it.`,
        audio: { output: { voice, format: { type: 'audio/pcm', rate: RATE } } },
      } });
      send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
      send({ type: 'response.create' });
    });
    ws.on('message', raw => {
      const e = JSON.parse(raw);
      if (e.type === 'response.output_audio.delta' || e.type === 'response.audio.delta') chunks.push(Buffer.from(e.delta, 'base64'));
      else if (e.type === 'response.output_audio_transcript.done' || e.type === 'response.audio_transcript.done') said = e.transcript;
      else if (e.type === 'response.done') { clearTimeout(timer); ws.close(); resolve({ pcm: Buffer.concat(chunks), said }); }
      else if (e.type === 'error') { clearTimeout(timer); ws.close(); reject(Error(e.error?.message || 'realtime error')); }
    });
    ws.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

async function main(scriptPath) {
  const spec = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  const name = path.basename(scriptPath).replace('.script.json', '');
  const outDir = path.join(ROOT, 'design/pages/variants/audio');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sample-call-'));
  const key = apiKey();
  const parts = []; const lines = []; let t = 0;
  for (const [i, line] of spec.lines.entries()) {
    const style = line.who === 'ai' ? spec.ai_style : spec.shop_style;
    let take;
    for (let attempt = 1; attempt <= 3; attempt++) {
      take = await speak(key, VOICES[line.who], style, line.text);
      if (norm(take.said) === norm(line.text)) break;
      console.warn(`line ${i} attempt ${attempt} drifted: "${take.said}"`);
    }
    const pcm = path.join(work, `l${i}.pcm`); fs.writeFileSync(pcm, take.pcm);
    const clip = path.join(work, `p${i}.wav`);
    // Shopkeeper sounds like they're on a phone line; the AI caller stays clean.
    const filter = line.who === 'shop' ? 'highpass=f=180,lowpass=f=5200,volume=1.15' : 'highpass=f=80';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', pcm, '-af', `silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,${filter}`, clip]);
    const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip]).toString());
    lines.push({ who: line.who, text: line.text, said: take.said, start: +t.toFixed(2), end: +(t + d).toFixed(2) });
    const gap = 0.28 + ((i * 37) % 30) / 100; // natural-feeling, varied pause between turns
    const silence = path.join(work, `s${i}.wav`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', String(gap), silence]);
    parts.push(clip, silence); t += d + gap;
    console.log(`${line.who.padEnd(4)} ${d.toFixed(1)}s  ${take.said}`);
  }
  const list = path.join(work, 'list.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ar', String(RATE), '-ac', '1', '-b:a', '96k', path.join(outDir, `${name}.mp3`)]);
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ model: MODEL, voices: VOICES, total: +t.toFixed(2), lines: lines.map(({ said, ...l }) => l) }, null, 1));
  console.log(`${name}.mp3 · ${t.toFixed(1)} s · ${MODEL}`);
}

main(process.argv[2]).catch(err => { console.error(err.message); process.exit(1); });
