const { test } = require('node:test');
const assert = require('node:assert/strict');
const { phoneNumber, answerXml, ClosingGate, dialPayload, callLimit } = require('./phone-core.cjs');
test('normalizes explicit country-code numbers and rejects ambiguous destinations', () => {
  assert.equal(phoneNumber('919876543210'), '+919876543210');
  assert.equal(phoneNumber('+919876543210'), '+919876543210');
  assert.throws(() => phoneNumber('9876543210'));
  assert.throws(() => phoneNumber('not-a-number'));
});
test('telephone XML requests matching mu-law audio and hangs up after streaming', () => {
  const xml = answerXml('https://example.com', 'testtoken');
  assert.match(xml, /audio\/x-mulaw;rate=8000/);
  assert.match(xml, /wss:\/\/example.com\/media\/testtoken/);
  assert.match(xml, /streamTimeout="300"/);
  assert.match(xml, /<Hangup\/>/);
});
test('hangup waits for the matching goodbye playback checkpoint', () => {
  const gate = new ClosingGate();
  assert.equal(gate.played('goodbye'), false);
  gate.begin();
  assert.equal(gate.played('earlier-response'), false);
  assert.equal(gate.played('goodbye'), false);
  gate.queued();
  assert.equal(gate.played('goodbye'), true);
  assert.equal(gate.played('goodbye'), false);
});
test('outbound payload uses only configured numbers and limits the call', () => {
  const payload = dialPayload({from:'919876543210',to:'919876543211',publicUrl:'https://example.com',token:'secret'});
  assert.equal(payload.to, '+919876543211');
  assert.equal(payload.from, '+919876543210');
  assert.equal(payload.time_limit, 300);
  assert.equal(payload.answer_url, 'https://example.com/answer/secret');
  assert.equal(payload.hangup_url, 'https://example.com/status/secret');
});
test('uses the same configurable limit for the telephone and audio stream', () => {
  const seconds=callLimit('420');
  assert.equal(seconds,420);
  assert.match(answerXml('https://example.com','token',seconds), /streamTimeout="420"/);
  assert.equal(dialPayload({from:'919876543210',to:'919876543211',publicUrl:'https://example.com',token:'secret',maxSeconds:seconds}).time_limit,420);
  assert.throws(()=>callLimit('0'));
  assert.throws(()=>callLimit('invalid'));
});
