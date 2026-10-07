// Isolated personal-phone rehearsal. Dry run by default; never automatically retries.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const {phoneNumber} = require('../voice-test/phone-core.cjs');

function buildPayload(env, variables = {}) {
  for (const name of ['SARVAM_AGENT_ID', 'SARVAM_CONNECTION_ID']) {
    if (!env[name]?.trim()) throw new Error('Missing ' + name);
  }
  const phones = {};
  for (const name of ['VOBIZ_FROM_NUMBER', 'TEST_TO_NUMBER']) {
    try { phones[name] = phoneNumber(env[name]); }
    catch { throw new Error('Invalid ' + name); }
  }
  const version = Number(env.SARVAM_AGENT_VERSION);
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('Invalid committed agent version');
  if (!variables || Array.isArray(variables) || typeof variables !== 'object') throw new Error('Variables must be an object');
  return {
    app_config: {
      app_id: env.SARVAM_AGENT_ID,
      app_version: version,
      app_type: 'agent',
      connection_config: {
        connection_id: env.SARVAM_CONNECTION_ID,
        agent_phone_number: phones.VOBIZ_FROM_NUMBER,
      },
      agent_variables: variables,
    },
    user_config: {user_phone_number: phones.TEST_TO_NUMBER},
  };
}

async function dialOnce({env, journal, send, variables = {}}) {
  const payload = buildPayload(env, variables);
  const entry = {status: 'dispatching', startedAt: new Date().toISOString()};
  fs.mkdirSync(path.dirname(journal), {recursive: true, mode: 0o700});
  try { fs.writeFileSync(journal, JSON.stringify(entry), {flag: 'wx', mode: 0o600}); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('A call was already attempted; inspect its journal before any new call');
    throw error;
  }
  const save = () => fs.writeFileSync(journal, JSON.stringify(entry, null, 2), {mode: 0o600});
  let response;
  try { response = await send(payload); }
  catch (error) { entry.status = 'unknown'; save(); throw error; }
  entry.httpStatus = response.status;
  if (response.status >= 200 && response.status < 300 && response.data?.attempt_id) {
    entry.status = 'accepted';
    entry.attemptId = response.data.attempt_id;
  } else {
    entry.status = response.status >= 400 && response.status < 500 ? 'rejected' : 'unknown';
    let message = JSON.stringify(response.data?.detail || response.data?.error || 'No attempt ID returned');
    for (const name of ['SARVAM_VOICE_API_KEY', 'SARVAM_API_KEY', 'VOBIZ_AUTH_TOKEN', 'VOBIZ_AUTH_ID', 'VOBIZ_FROM_NUMBER', 'TEST_TO_NUMBER']) {
      if (env[name]) message = message.replaceAll(env[name], '[redacted]');
    }
    entry.providerError = message.slice(0, 1000);
  }
  save();
  if (entry.status !== 'accepted') throw new Error(`Sarvam did not confirm a call: HTTP ${response.status}; ${entry.providerError}; no retry sent`);
  return entry;
}

function postCall(env, payload) {
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(env.SARVAM_ORG_ID)}/workspaces/${encodeURIComponent(env.SARVAM_WORKSPACE_ID)}/outbounds`;
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST', timeout: 20000,
      headers: {'X-API-Key': env.SARVAM_VOICE_API_KEY, 'Content-Type': 'application/json'},
    }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; if (body.length > 1000000) response.destroy(new Error('Response too large')); });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({status: response.statusCode, data: JSON.parse(body)}); }
        catch { reject(new Error('Unclear Sarvam response; inspect provider call logs before retrying')); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Request timeout; call outcome is unknown')));
    request.on('error', reject);
    request.end(JSON.stringify(payload));
  });
}

async function main() {
  const env = process.env;
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dial')) throw new Error('Only --dial is supported; recipient always comes from TEST_TO_NUMBER');
  const variables = env.SARVAM_TEST_VARIABLES_FILE
    ? JSON.parse(fs.readFileSync(env.SARVAM_TEST_VARIABLES_FILE, 'utf8')) : {};
  const payload = buildPayload(env, variables);
  if (!args.includes('--dial')) {
    console.log(JSON.stringify({mode: 'dry-run', appId: payload.app_config.app_id,
      version: payload.app_config.app_version, connection: payload.app_config.connection_config.connection_id,
      fromEnding: env.VOBIZ_FROM_NUMBER.slice(-4), toEnding: env.TEST_TO_NUMBER.slice(-4),
      variableNames: Object.keys(variables), networkRequests: 0}));
    return;
  }
  for (const name of ['SARVAM_ORG_ID', 'SARVAM_WORKSPACE_ID', 'SARVAM_VOICE_API_KEY']) {
    if (!env[name]?.trim()) throw new Error('Missing ' + name);
  }
  if (!env.SARVAM_TEST_VARIABLES_FILE) throw new Error('Set a reviewed SARVAM_TEST_VARIABLES_FILE before dialing');
  const journal = path.join(__dirname, '../call-bridge/.state/sarvam-personal-test.json');
  const result = await dialOnce({env, variables, journal, send: body => postCall(env, body)});
  console.log(JSON.stringify(result));
}
if (require.main === module) main().catch(error => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});
module.exports = {buildPayload, dialOnce};
