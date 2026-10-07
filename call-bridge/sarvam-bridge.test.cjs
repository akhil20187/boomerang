const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createBridge,validateRuntimeEnv}=require('./bridge.cjs');
const env={CALL_PROVIDER:'sarvam',CALL_BRIDGE_SECRET:'s'.repeat(40),CALL_BRIDGE_PUBLIC_URL:'https://bridge.example',CONVEX_CALLBACK_URL:'https://convex.example/api/call-event',OPENAI_API_KEY:'summary-key',SARVAM_VOICE_API_KEY:'voice-key',SARVAM_ORG_ID:'org',SARVAM_WORKSPACE_ID:'ws',SARVAM_AGENT_ID:'agent',SARVAM_AGENT_VERSION:'2',SARVAM_CONNECTION_ID:'conn',SARVAM_FROM_NUMBER:'+917965480585'};
const payload={attemptId:'attempt',taskId:'task',shopJobId:'job',to:'+919000000000',customerName:'Test',businessName:'Shop',productDescription:'Phone 256 GB'};
test('Sarvam runtime needs voice credentials but not the old telephony keys',()=>{assert.doesNotThrow(()=>validateRuntimeEnv(env));assert.throws(()=>validateRuntimeEnv({...env,SARVAM_VOICE_API_KEY:''}),/SARVAM_VOICE_API_KEY/);assert.throws(()=>validateRuntimeEnv({...env,CALL_PROVIDER:'typo'}),/CALL_PROVIDER/);});
test('Sarvam dispatch survives restart, completes once, keeps recordings private and does not redial',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sarvam-bridge-'));t.after(()=>fs.rmSync(dir,{force:true,recursive:true}));const journalPath=path.join(dir,'attempts.json');let dials=0,ready=false;const callbacks=[];
 const fetchImpl=async(u,o={})=>{
  u=String(u);if(u.includes('/outbounds')){dials++;return Response.json({attempt_id:'remote'});}
  if(u.includes('convex.example')){callbacks.push(JSON.parse(o.body));return Response.json({ok:true});}
  if(u.includes('/attempts?'))return Response.json({items:ready?[{attempt_id:'remote',interaction_id:'date/id',connectivity_status:'connected',ended_by:'AGENT_ENDS',end_datetime:'2026-10-07',duration_in_seconds:55}]:[]});
  if(u.includes('/transcripts/'))return Response.json({interaction_id:'date/id',messages:[{role:'user',content:'Yes it is available'}]});
  if(u.includes('/recordings/'))return new Response('audio',{headers:{'content-type':'audio/wav'}});
  if(u.includes('api.openai.com'))return Response.json({choices:[{message:{content:JSON.stringify({stock:'available',variantMatch:'confirmed',finalPrice:null,currency:'INR',offers:null,notes:null,personalCallNeeded:false,evidenceQuotes:['Yes it is available']})}}]});
  throw Error('Unexpected network target');
 };
 const first=createBridge({env,journalPath,fetchImpl});await first.listen(0);const headers={authorization:'Bearer '+env.CALL_BRIDGE_SECRET,'content-type':'application/json'};
 const send=body=>fetch(first.localUrl+'/dispatch',{method:'POST',headers,body:JSON.stringify(body)});
 assert.equal((await send(payload)).status,202);await new Promise(r=>setTimeout(r,20));assert.equal((await send(payload)).status,200);assert.equal(dials,1);assert.equal((await send({...payload,attemptId:'second'})).status,429);await first.close();
 ready=true;const second=createBridge({env,journalPath,fetchImpl});await second.listen(0);t.after(()=>second.close());await second.recover();
 const state=await(await fetch(second.localUrl+'/attempts/attempt',{headers})).json();assert.equal(state.status,'completed');assert.equal(state.provider,'sarvam');assert.equal(state.result.answer.stock,'available');assert.equal(dials,1);
 assert.equal((await fetch(second.localUrl+'/attempts/attempt/recording')).status,401);const audio=await fetch(second.localUrl+'/attempts/attempt/recording',{headers});assert.equal(audio.status,200);assert.equal(await audio.text(),'audio');
 assert.ok(callbacks.some(c=>c.status==='completed'&&c.recording?.url==='https://bridge.example/attempts/attempt/recording'));
});
test('Sarvam uncertain POST is never retried or sent to the old provider',async t=>{
 let posts=0;const b=createBridge({env,journalPath:null,fetchImpl:async(u,o)=>{if(String(u).includes('/outbounds')){posts++;throw Error('timeout');}return Response.json({ok:true});}});await b.listen(0);t.after(()=>b.close());const headers={authorization:'Bearer '+env.CALL_BRIDGE_SECRET};await fetch(b.localUrl+'/dispatch',{method:'POST',headers,body:JSON.stringify(payload)});await new Promise(r=>setTimeout(r,20));await b.recover();const r=await(await fetch(b.localUrl+'/attempts/attempt',{headers})).json();assert.equal(r.status,'reconciliation_required');assert.equal(posts,1);
});
