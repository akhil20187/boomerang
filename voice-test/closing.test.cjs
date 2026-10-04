const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Closing } = require('./closing.js');
test('waits for the goodbye audio before disconnecting', () => {
  let ended = 0; const sent = [];
  const c = new Closing(e => sent.push(e), () => ended++, () => {});
  c.begin('tool-1', 'Hindi');
  c.event({ type: 'response.done', response: { output: [{ type: 'function_call', call_id: 'tool-1' }] } });
  assert.equal(sent.length, 1);
  c.event({ type: 'response.created', response: { id: 'goodbye', metadata: { purpose: 'closing' } } });
  c.event({ type: 'response.done', response: { id: 'goodbye', status: 'completed' } });
  assert.equal(ended, 0);
  c.event({ type: 'output_audio_buffer.stopped', response_id: 'earlier-answer' });
  assert.equal(ended, 0);
  c.event({ type: 'output_audio_buffer.stopped', response_id: 'goodbye' });
  assert.equal(ended, 1); c.cancel();
});
