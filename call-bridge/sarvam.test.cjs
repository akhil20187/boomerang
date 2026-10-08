const test=require('node:test');
const assert=require('node:assert/strict');
const {createSarvamProvider,buildSarvamPayload}=require('./sarvam.cjs');
const env={SARVAM_VOICE_API_KEY:'private-key',SARVAM_ORG_ID:'org',SARVAM_WORKSPACE_ID:'workspace',SARVAM_AGENT_ID:'agent',SARVAM_AGENT_VERSION:'2',SARVAM_CONNECTION_ID:'connection',SARVAM_FROM_NUMBER:'+917965480585'};
const record={attemptId:'local',to:'+919000000000',businessName:'Test shop',customerName:'Akhil',productDescription:'iPhone lavender 256 GB',instructions:'Ask HDFC offers',createdAt:Date.now(),provider:'sarvam'};
test('Sarvam maps the exact enquiry and uses the pinned agent and shop phone',()=>{
 const p=buildSarvamPayload(record,env);assert.equal(p.app_config.app_version,2);assert.equal(p.user_config.user_phone_number,record.to);assert.equal(p.app_config.agent_variables.business_name,'Test shop');assert.match(p.app_config.agent_variables.inquiry_details,/lavender 256 GB/);assert.match(p.app_config.agent_variables.inquiry_details,/HDFC/);assert.match(p.app_config.agent_variables.inquiry_details,/Do not.*reserve/);assert.throws(()=>buildSarvamPayload(record,{...env,SARVAM_AGENT_VERSION:'latest'}));
});
test('accepted ID is returned; timeout is uncertain and never retried',async()=>{
 let sends=0;const provider=createSarvamProvider({env,fetchImpl:async()=>{sends++;throw Error('private-key');}});const x=await provider.dispatch(record);assert.equal(x.state,'uncertain');assert.equal(sends,1);assert.ok(!JSON.stringify(x).includes('private-key'));
 const ok=createSarvamProvider({env,fetchImpl:async()=>Response.json({attempt_id:'remote'})});assert.equal((await ok.dispatch(record)).attemptId,'remote');
});
test('voicemail is unanswered and never supplies billable human evidence',async()=>{
 const p=createSarvamProvider({env,fetchImpl:async()=>Response.json({items:[{attempt_id:'remote',end_datetime:'2026-10-07T00:00:00',connectivity_status:'connected',ended_by:'VOICEMAIL',interaction_id:'date/id',duration_in_seconds:15}]})});
 const x=await p.lookup({...record,sarvam:{attemptId:'remote'}});assert.equal(x.status,'completed');assert.equal(x.result.transportStatus,'no-answer');assert.deepEqual(x.result.transcript,[]);
});
test('busy attempt without conversation timestamps finishes without billable evidence or placeholder recording ID',async()=>{
 let reads=0;
 const p=createSarvamProvider({env,fetchImpl:async(u,o)=>{reads++;assert.ok(!o?.method||o.method==='GET');return Response.json({items:[{attempt_id:'remote',interaction_id:'NO_INTERACTION_ID',connectivity_status:'busy',start_datetime:null,end_datetime:null,ended_by:'NO_END_REASON',failure_reason:'NO_FAILURE_REASON',duration_in_seconds:0,num_messages:0}]});}});
 const x=await p.lookup({...record,sarvam:{attemptId:'remote'}});
 assert.equal(x.status,'completed');assert.equal(x.result.transportStatus,'no-answer');assert.deepEqual(x.result.transcript,[]);assert.equal(x.result.providerCallId,undefined);assert.equal(x.sarvam.interactionId,undefined);assert.equal(reads,1);
});
test('connected attempt without an end timestamp remains uncertain',async()=>{
 const p=createSarvamProvider({env,fetchImpl:async()=>Response.json({items:[{attempt_id:'remote',connectivity_status:'connected',end_datetime:null,interaction_id:'date/id'}]})});
 const x=await p.lookup({...record,sarvam:{attemptId:'remote'}});assert.equal(x.status,'reconciliation_required');assert.equal(x.reconciliation.reason,'provider_call_still_active');
});
test('completed call preserves Telugu and English human transcript with exact identity',async()=>{
 const p=createSarvamProvider({env,fetchImpl:async u=>String(u).includes('/transcripts/')?Response.json({interaction_id:'date/id',messages:[{role:'assistant',content:'Price?'},{role:'user',content:'అవును, seventy thousand rupees.'}]}):Response.json({items:[{attempt_id:'other',ended_by:'VOICEMAIL'},{attempt_id:'remote',end_datetime:'2026-10-07',connectivity_status:'connected',ended_by:'AGENT_ENDS',interaction_id:'date/id',duration_in_seconds:55}]})});
 const x=await p.lookup({...record,sarvam:{attemptId:'remote'}});assert.equal(x.result.transcript[1].speaker,'caller');assert.match(x.result.transcript[1].text,/అవును/);assert.equal(x.result.providerRequestId,'remote');assert.equal(x.result.providerCallId,'date/id');
});
test('missing or mismatched results stay uncertain; missing transcript is retried',async()=>{
 const p=createSarvamProvider({env,fetchImpl:async()=>Response.json({items:[{attempt_id:'other'}]})});assert.equal((await p.lookup({...record,sarvam:{attemptId:'remote'}})).status,'reconciliation_required');
 let requests=0;const missing=createSarvamProvider({env,fetchImpl:async u=>{requests++;return String(u).includes('/transcripts/')?new Response('',{status:404}):Response.json({items:[{attempt_id:'remote',interaction_id:'date/id',end_datetime:'2026-10-07',connectivity_status:'connected'}]});}});assert.equal((await missing.lookup({...record,sarvam:{attemptId:'remote'}})).status,'reconciliation_required');assert.equal(requests,2);
});
test('recordings use only the authenticated fixed API, not an arbitrary provider URL',async()=>{
 const p=createSarvamProvider({env,fetchImpl:async(u,o)=>{assert.match(String(u),/apps\.sarvam\.ai\/api\/analytics\/v1\/org\/workspace\/agent\/recordings\/date%2Fid$/);assert.equal(o.headers['X-API-Key'],'private-key');assert.equal(o.redirect,'error');return new Response('wave',{headers:{'content-type':'audio/wav'}});}});const r=await p.recording({...record,sarvam:{attemptId:'remote',interactionId:'date/id'},recording:{url:'http://127.0.0.1/private'}});assert.equal(await r.text(),'wave');
});
