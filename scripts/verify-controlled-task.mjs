import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Explicit test inbox only. Never invokes dialing or shop discovery.
const email='nudge-seqtest-1782499856@agentmail.to';
const label='approved-deployment-2026-10-05';
const origin='https://little-kangaroo-718.convex.site';
function run(name,args){
  const raw=execFileSync('npx',['convex','run',name,JSON.stringify(args)],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return raw.trim() ? JSON.parse(raw) : null;
}
const fixture=run('verification:create',{email,label});
const client=new Client({name:'Controlled task verification',version:'1.0.0'});
try{
  execFileSync(process.execPath,['scripts/verify-public-mcp.mjs'],{env:{...process.env,MCP_TEST_TOKEN:fixture.token,MCP_TEST_TASK:fixture.taskId},stdio:['ignore','pipe','pipe']});
  run('verification:run',{taskId:fixture.taskId});
  // Replay the same marked task: notifications must not be sent twice.
  run('verification:run',{taskId:fixture.taskId});
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp',origin),{requestInit:{headers:{Authorization:`Bearer ${fixture.token}`}}}));
  const status=await client.callTool({name:'task_status',arguments:{taskId:fixture.taskId}});
  assert.ok(!status.isError);
  assert.equal(status.structuredContent.task.verification,true);
  assert.equal(status.structuredContent.task.status,'finished');
  assert.equal(status.structuredContent.shops[0].recordingAvailable,true);
  const playback=await client.callTool({name:'get_recording',arguments:{attemptId:fixture.attemptId}});
  assert.ok(!playback.isError);
  const response=await fetch(playback.structuredContent.url);
  assert.equal(response.status,200);
  const bytes=new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');
  assert.equal(bytes.length,32044);
  const denied=await fetch(new URL('/api/recording',origin));
  assert.ok(denied.status>=400);
  const notifications=run('notifications:forTask',{taskId:fixture.taskId});
  assert.equal(notifications.length,2);
  assert.ok(notifications.every(n=>n.status==='sent'&&n.attempts===1));
  console.log(JSON.stringify({taskId:fixture.taskId,status:status.structuredContent.task.status,simulated:true,notifications:notifications.map(n=>({type:n.type,status:n.status,attempts:n.attempts})),recordingBytes:bytes.length,noRealCalls:true}));
}finally{
  await client.close();
  run('verification:revoke',{tokenId:fixture.tokenId});
  const denied=await fetch(new URL('/mcp',origin),{method:'POST',headers:{Authorization:`Bearer ${fixture.token}`,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
  assert.equal(denied.status,401);
  console.log('Verification access token revoked; public MCP rejects reuse.');
}
