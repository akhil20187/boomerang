// Inspect one existing call without placing a call or exposing credentials.
import { execFileSync } from 'node:child_process';
const attemptId = process.argv[2];
if (!/^[a-z0-9]+$/.test(attemptId ?? '')) throw new Error('Supply an existing attempt ID');
const deployment = 'little-kangaroo-718';
const secret = execFileSync('npx', ['convex', 'env', 'get', 'CALL_BRIDGE_SECRET', '--deployment', deployment], {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
const response = await fetch(`https://voice-bridge-development.up.railway.app/attempts/${attemptId}`, {headers:{Authorization:`Bearer ${secret}`}, signal:AbortSignal.timeout(20000)});
if (!response.ok) throw new Error(`Existing attempt lookup HTTP ${response.status}`);
const record = await response.json();
if (record.attemptId !== attemptId) throw new Error('Attempt identity mismatch');
console.log(JSON.stringify({attemptId, provider:record.provider, status:record.status, createdAt:record.createdAt, reconciliation:record.reconciliation, providerAttemptId:record.sarvam?.attemptId, transportStatus:record.result?.transportStatus, durationSeconds:record.result?.durationSeconds, providerCallId:record.result?.providerCallId, callsPlaced:0}));
if (process.argv.includes('--provider') && record.sarvam?.attemptId) {
  const env = JSON.parse(execFileSync('railway', ['variable','list','--json','--project','3f9f23df-6a17-449c-aeaf-4a0f76e0e7bb','--service','d9eec7c9-7f94-4f4c-aa9f-bd0b14f8f492','--environment','de43205b-a2b2-42e8-92a0-55cdcf55e941'], {encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  const url = new URL('https://apps.sarvam.ai/api/analytics/v1/' + [record.sarvam.orgId,record.sarvam.workspaceId,record.sarvam.appId].map(encodeURIComponent).join('/') + '/attempts');
  url.searchParams.set('start_datetime',new Date(record.createdAt-86400000).toISOString());
  url.searchParams.set('end_datetime',new Date(Date.now()+60000).toISOString());
  url.searchParams.set('limit','1000');
  url.searchParams.set('filter_conditions',JSON.stringify([{id:'rollout-check',field:'attempt_id',operator:'equals',value:record.sarvam.attemptId}]));
  const providerResponse = await fetch(url,{headers:{'X-API-Key':env.SARVAM_VOICE_API_KEY},redirect:'error',signal:AbortSignal.timeout(20000)});
  if (!providerResponse.ok) throw new Error(`Provider lookup HTTP ${providerResponse.status}`);
  const data = await providerResponse.json();
  const item = data.items?.find(a=>a.attempt_id===record.sarvam.attemptId);
  console.log(JSON.stringify({providerItem:item?Object.fromEntries(['attempt_id','interaction_id','connectivity_status','start_datetime','end_datetime','ended_by','failure_reason','duration_in_seconds','num_messages'].map(k=>[k,item[k]])):null,providerFields:item?Object.keys(item):[],matched:item?.attempt_id===record.sarvam.attemptId}));
}
