class Closing {
  constructor(send, finish, status) { this.send = send; this.finish = finish; this.status = status; }
  begin(callId, language) {
    if (this.callId) return;
    this.callId = callId; this.language = language;
    this.status('Answer saved · finishing the conversation…');
    this.fallback = setTimeout(() => this.end('Answer saved · connection closed'), 20000);
  }
  event(e) {
    if (!this.callId) return;
    if (!this.requested && e.type === 'response.done' && e.response?.output?.some(item => item.type === 'function_call' && item.call_id === this.callId)) {
      this.requested = true;
      this.send({ type: 'response.create', response: { metadata: { purpose: 'closing' }, tool_choice: 'none', instructions: `Speak in ${this.language}, or the language the shopkeeper explicitly asked to switch to. Say only a warm, short thank-you and clearly say you are ending the call now. Do not ask questions or offer more help. Do not mention a browser rehearsal. Do not speak more than one short sentence.` } });
    }
    if (e.type === 'response.created' && e.response?.metadata?.purpose === 'closing') this.responseId = e.response.id;
    if (e.type === 'output_audio_buffer.stopped' && this.responseId && e.response_id === this.responseId) this.end('Answer saved · call ended');
    if (e.type === 'response.done' && this.responseId && e.response?.id === this.responseId && e.response.status !== 'completed') this.end('Answer saved · closing interrupted');
  }
  end(label) { this.cancel(); this.finish(label); }
  cancel() { clearTimeout(this.fallback); this.callId = null; this.responseId = null; this.requested = false; }
}
if (typeof module !== 'undefined') module.exports = { Closing };
