// Read-only access check. Never prints the API key or raw response.
const https = require('node:https');
const voice = process.argv.includes('--voice-agents');
const keyName = voice ? 'SARVAM_VOICE_API_KEY' : 'SARVAM_API_KEY';
const key = process.env[keyName];
if (!key) throw new Error('Missing ' + keyName);
const org = process.env.SARVAM_ORG_ID;
const workspace = process.env.SARVAM_WORKSPACE_ID;
if (voice && (!org || !workspace)) throw new Error('Missing Sarvam organisation/workspace IDs');
const url = voice
  ? `https://apps.sarvam.ai/api/evals/v1/${encodeURIComponent(org)}/${encodeURIComponent(workspace)}/test-suites?limit=1`
  : 'https://api.sarvam.ai/v1/models';
const request = https.get(url, {
  headers: voice ? { 'X-API-Key': key } : { 'api-subscription-key': key },
  timeout: 15000,
}, res => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      console.log(JSON.stringify({ service: voice ? 'voice-agents' : 'models', status: res.statusCode, models: result.data?.map(m => m.id), totalTestSuites: result.total, errorCode: result.error?.code, detail: typeof result.detail === 'string' ? result.detail.replaceAll(key, '[redacted]').slice(0,200) : undefined }));
    } catch { console.log(JSON.stringify({status: res.statusCode, error: 'Non-JSON response'})); }
  });
});
request.on('timeout', () => request.destroy());
request.on('error', error => { console.log(JSON.stringify({error: error.code || 'Connection failed'})); process.exitCode = 1; });
