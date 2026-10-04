const $ = id => document.getElementById(id);
let pc, dc, mic, timer, active = false, result = null, typed = false, startedAt, generation = 0;
const conversation = [];
const seen = new Set();
const closing = new Closing(send, finish, text => { $('status').textContent = text; });
function message(role, text) {
  if (!text) return;
  if (!conversation.length) $('transcript').replaceChildren();
  conversation.push({ role, text });
  const row = document.createElement('div'); row.className = 'utterance';
  const name = document.createElement('strong'); name.textContent = role === 'shop' ? 'SHOPKEEPER' : 'AGENT';
  const content = document.createElement('div'); content.textContent = text;
  row.append(name, content); $('transcript').append(row); $('transcript').scrollTop = $('transcript').scrollHeight;
}
function send(event) { if (dc?.readyState === 'open') dc.send(JSON.stringify(event)); }
function controls(running) {
  $('start').disabled = running; $('text-start').disabled = running; $('stop').disabled = !running;
  $('product').disabled = running; $('comments').disabled = running; $('send').disabled = true;
  $('language').disabled = running;
}
function finish(label = 'Test ended') {
  active = false; generation++; clearTimeout(timer); dc?.close(); pc?.close(); mic?.getTracks().forEach(t => t.stop());
  closing.cancel();
  $('audio').srcObject = null; controls(false); $('status').textContent = label;
  if (!result && conversation.length) $('result').textContent = 'No structured answer returned. This rehearsal is incomplete and needs human follow-up.';
  if (conversation.length) $('download').hidden = false;
}
function events(event) {
  let e; try { e = JSON.parse(event.data); } catch { return; }
  if (e.event_id && seen.has(e.event_id)) return; if (e.event_id) seen.add(e.event_id);
  if (e.type === 'conversation.item.input_audio_transcription.completed') message('shop', e.transcript);
  if (e.type === 'response.output_audio_transcript.done' || e.type === 'response.output_text.done') message('agent', e.transcript || e.text);
  if (e.type === 'response.function_call_arguments.done' && e.name === 'report_shop_answer') {
    try {
      result = JSON.parse(e.arguments);
      if (typeof result.final_price_inr !== 'number' || !Number.isFinite(result.final_price_inr) || result.final_price_inr < 0) result.final_price_inr = null;
      $('result').classList.remove('muted'); $('result').textContent = `Product match: ${result.product_match}\nStock: ${result.stock}\nFinal price: ${result.final_price_inr == null ? 'Unknown' : '₹' + result.final_price_inr.toLocaleString('en-IN')}\nDiscounts: ${result.discounts}\nCard offers: ${result.card_offers}\nNotes: ${result.notes}\nOutcome: ${result.outcome}\nHuman follow-up: ${result.human_followup_reason || 'None reported'}`;
      $('download').hidden = false;
      send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: e.call_id, output: JSON.stringify({ saved: true }) } });
      mic?.getAudioTracks().forEach(track => { track.enabled = false; });
      $('send').disabled = true;
      send({ type: 'session.update', session: { type: 'realtime', audio: { input: { turn_detection: null } } } });
      closing.begin(e.call_id, $('language').value);
    } catch { $('error').textContent = 'The answer could not be read. End the test and save the conversation.'; }
  }
  if (e.type === 'error') { $('error').textContent = e.error?.message || 'The voice session reported an error.'; }
  closing.event(e);
}
async function start(useText = false) {
  if (active) return;
  if (!$('product').value.trim()) { $('error').textContent = 'Enter an exact product first.'; return; }
  active = true; typed = useText; result = null; conversation.length = 0; seen.clear(); startedAt = new Date().toISOString();
  const current = ++generation;
  controls(true); $('error').textContent = ''; $('download').hidden = true;
  $('result').textContent = 'Waiting for the shopkeeper’s answers…'; $('transcript').replaceChildren();
  $('text-form').hidden = !typed; $('status').textContent = typed ? 'Connecting…' : 'Waiting for microphone access…';
  try {
    pc = new RTCPeerConnection();
    pc.ontrack = e => { $('audio').srcObject = e.streams[0]; $('audio').play().catch(() => { $('error').textContent = 'Audio playback was blocked. Use your browser’s sound controls to allow playback.'; }); };
    if (typed) pc.addTransceiver('audio', { direction: 'recvonly' });
    else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!active || current !== generation) { stream.getTracks().forEach(t => t.stop()); return; }
      mic = stream;
      mic.getAudioTracks().forEach(track => pc.addTrack(track, mic));
    }
    dc = pc.createDataChannel('oai-events'); dc.onmessage = events;
    dc.onopen = () => {
      if (current !== generation) return;
      $('send').disabled = false;
      $('status').textContent = typed ? 'Connected · type your shopkeeper replies' : 'Connected · speak as the shopkeeper';
      timer = setTimeout(() => finish('Two-minute test finished'), 120000);
      send({ type: 'response.create', response: { instructions: `Start speaking ${$('language').value}. Briefly introduce yourself as an automated assistant checking product availability for a buyer and ask whether they can help. Do not address the listener as 'shopkeeper'. Ask one question only. Follow the selected language from the first word.` } });
    };
    pc.onconnectionstatechange = () => { if (active && ['failed', 'disconnected'].includes(pc.connectionState)) finish('Connection lost · human follow-up needed'); };
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    $('status').textContent = 'Connecting to OpenAI…';
    const r = await fetch('/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sdp: offer.sdp, product: $('product').value, comments: $('comments').value, language: $('language').value }), signal: AbortSignal.timeout(35000) });
    if (!r.ok) { const data = await r.json(); throw Error(data.error || 'Could not start the test.'); }
    const answer = await r.text(); if (!active || current !== generation) return;
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  } catch (e) {
    if (current !== generation) return;
    finish('Could not start');
    $('error').textContent = e.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser or use typed replies.' : e.name === 'NotFoundError' ? 'No microphone found. Use typed replies to test the agent.' : e.message;
  }
}
$('start').onclick = () => start(false); $('text-start').onclick = () => start(true); $('stop').onclick = () => finish();
$('text-form').onsubmit = e => {
  e.preventDefault(); const text = $('reply').value.trim(); if (!text || dc?.readyState !== 'open') return;
  message('shop', text); send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
  send({ type: 'response.create' }); $('reply').value = '';
};
$('download').onclick = () => {
  const blob = new Blob([JSON.stringify({ rehearsal: true, product: $('product').value, comments: $('comments').value, language: $('language').value, startedAt, result, conversation }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'human-mcp-voice-rehearsal.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
window.addEventListener('beforeunload', () => { mic?.getTracks().forEach(t => t.stop()); pc?.close(); });
