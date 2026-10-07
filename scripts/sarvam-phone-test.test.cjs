const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildPayload, dialOnce } = require('./sarvam-phone-test.cjs');
const env = {
  SARVAM_AGENT_ID: 'test-agent', SARVAM_AGENT_VERSION: '1',
  SARVAM_CONNECTION_ID: 'test-connection', VOBIZ_FROM_NUMBER: '+12025550100',
  TEST_TO_NUMBER: '+12025550101',
};
test('uses only the configured personal recipient and refuses invalid phone numbers', () => {
  const payload = buildPayload(env);
  assert.equal(payload.user_config.user_phone_number, env.TEST_TO_NUMBER);
  assert.equal(payload.app_config.connection_config.agent_phone_number, env.VOBIZ_FROM_NUMBER);
  assert.throws(() => buildPayload({...env, TEST_TO_NUMBER: ''}), /TEST_TO_NUMBER/);
  assert.throws(() => buildPayload({...env, TEST_TO_NUMBER: '1234'}), /TEST_TO_NUMBER/);
});
test('pins a committed version and requires the existing connection', () => {
  assert.equal(buildPayload(env).app_config.app_version, 1);
  assert.throws(() => buildPayload({...env, SARVAM_AGENT_VERSION: '0'}), /version/);
  assert.throws(() => buildPayload({...env, SARVAM_CONNECTION_ID: ''}), /CONNECTION/);
});
test('accepts the project’s existing India country-code format without a plus', () => {
  const payload = buildPayload({...env, VOBIZ_FROM_NUMBER: '918000000000', TEST_TO_NUMBER: '919000000000'});
  assert.equal(payload.app_config.connection_config.agent_phone_number, '+918000000000');
  assert.equal(payload.user_config.user_phone_number, '+919000000000');
});
test('a successful dispatch cannot be repeated with the same journal', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sarvam-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  let count = 0;
  const send = async () => { count++; return {status: 200, data: {attempt_id: 'attempt-test'}}; };
  const journal = path.join(dir, 'attempt.json');
  assert.equal((await dialOnce({env, journal, send})).attemptId, 'attempt-test');
  await assert.rejects(dialOnce({env, journal, send}), /already/);
  assert.equal(count, 1);
});
test('a timeout never causes automatic redial, including on a later invocation', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sarvam-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  let count = 0;
  const send = async () => { count++; throw new Error('timeout'); };
  const journal = path.join(dir, 'attempt.json');
  await assert.rejects(dialOnce({env, journal, send}), /timeout/);
  await assert.rejects(dialOnce({env, journal, send}), /already/);
  assert.equal(count, 1);
  assert.equal(JSON.parse(fs.readFileSync(journal)).status, 'unknown');
});
test('records a rejected request without leaking credentials or phone numbers', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sarvam-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const journal = path.join(dir, 'attempt.json');
  const testEnv = {...env, SARVAM_VOICE_API_KEY: 'secret-fixture'};
  await assert.rejects(dialOnce({env: testEnv, journal, send: async () => ({status: 422,
    data: {detail: 'No endpoint for '+env.VOBIZ_FROM_NUMBER+' secret-fixture'}})}), /422/);
  const saved = fs.readFileSync(journal, 'utf8');
  assert.equal(JSON.parse(saved).status, 'rejected');
  assert.match(JSON.parse(saved).providerError, /No endpoint/);
  assert.ok(!saved.includes('secret-fixture'));
  assert.ok(!saved.includes(env.VOBIZ_FROM_NUMBER));
});
