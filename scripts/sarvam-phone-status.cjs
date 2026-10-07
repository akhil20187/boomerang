// Read-only status for the exact personal-phone test recorded by sarvam-phone-test.cjs.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const stateDir = path.join(__dirname, '../call-bridge/.state');
const journal = JSON.parse(fs.readFileSync(path.join(stateDir, 'sarvam-personal-test.json'), 'utf8'));
const env = process.env;
for (const name of ['SARVAM_ORG_ID', 'SARVAM_WORKSPACE_ID', 'SARVAM_AGENT_ID', 'SARVAM_VOICE_API_KEY']) {
  if (!env[name]) throw new Error('Missing ' + name);
}
if (!journal.attemptId) throw new Error('No accepted attempt to inspect');
const base = 'https://apps.sarvam.ai/api/analytics/v1/' +
  [env.SARVAM_ORG_ID, env.SARVAM_WORKSPACE_ID, env.SARVAM_AGENT_ID].map(encodeURIComponent).join('/');
function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {headers: {'X-API-Key': env.SARVAM_VOICE_API_KEY}, timeout: 15000}, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 2000000) res.destroy(new Error('Response too large')); });
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('Sarvam analytics HTTP ' + res.statusCode));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid analytics response')); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Analytics timeout')));
    req.on('error', reject);
  });
}
async function main() {
  const url = new URL(base + '/attempts');
  url.searchParams.set('start_datetime', new Date(Date.parse(journal.startedAt) - 60000).toISOString());
  url.searchParams.set('end_datetime', new Date(Date.now() + 1000).toISOString());
  url.searchParams.set('limit', '5');
  url.searchParams.set('filter_conditions', JSON.stringify([{id: 'personal-test', field: 'attempt_id', operator: 'equals', value: journal.attemptId}]));
  const response = await get(url);
  const attempt = response.items?.find(item => item.attempt_id === journal.attemptId);
  if (!attempt) { console.log(JSON.stringify({attemptId: journal.attemptId, status: 'not-yet-in-analytics'})); return; }
  const summary = {
    attemptId: attempt.attempt_id, interactionId: attempt.interaction_id,
    status: attempt.connectivity_status, failureReason: attempt.failure_reason,
    endedBy: attempt.ended_by, durationSeconds: attempt.duration_in_seconds,
    startedAt: attempt.start_datetime, endedAt: attempt.end_datetime,
    language: attempt.language_name, messages: attempt.num_messages,
    averageAgentResponseSeconds: attempt.average_agent_response_time_in_seconds,
  };
  fs.writeFileSync(path.join(stateDir, 'sarvam-personal-test-status.json'), JSON.stringify(summary, null, 2), {mode: 0o600});
  console.log(JSON.stringify(summary));
  if (process.argv.includes('--transcript') && attempt.interaction_id) {
    const transcript = await get(base + '/transcripts/' + encodeURIComponent(attempt.interaction_id));
    const destination = path.join(stateDir, 'sarvam-personal-test-transcript.json');
    fs.writeFileSync(destination, JSON.stringify(transcript, null, 2), {mode: 0o600});
    console.log(JSON.stringify({transcriptSaved: destination}));
  }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
