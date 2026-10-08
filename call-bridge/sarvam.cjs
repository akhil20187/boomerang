const {phoneNumber}=require('../voice-test/phone-core.cjs');
const required=['SARVAM_VOICE_API_KEY','SARVAM_ORG_ID','SARVAM_WORKSPACE_ID','SARVAM_AGENT_ID','SARVAM_AGENT_VERSION','SARVAM_CONNECTION_ID','SARVAM_FROM_NUMBER'];
function validateSarvamEnv(env){
 for(const key of required)if(typeof env[key]!=='string'||!env[key].trim())throw Error('Missing '+key);
 if(!Number.isSafeInteger(Number(env.SARVAM_AGENT_VERSION))||Number(env.SARVAM_AGENT_VERSION)<1)throw Error('Invalid SARVAM_AGENT_VERSION');
 phoneNumber(env.SARVAM_FROM_NUMBER);
}
function buildSarvamPayload(record,env){
 validateSarvamEnv(env);
 return {app_config:{app_id:env.SARVAM_AGENT_ID,app_version:Number(env.SARVAM_AGENT_VERSION),app_type:'agent',connection_config:{connection_id:env.SARVAM_CONNECTION_ID,agent_phone_number:phoneNumber(env.SARVAM_FROM_NUMBER)},agent_variables:{user_name:record.customerName,business_name:record.businessName||'your shop',gender:'female',inquiry_details:`Ask about this exact product: ${record.productDescription}\nCheck availability, exact variant, final price including taxes, and applicable offers.\nCustomer requirements: ${record.instructions||'None'}\nThis is an enquiry only. Do not purchase, book, reserve, hold stock, or promise payment. Unknown details must stay unconfirmed.`}},user_config:{user_phone_number:phoneNumber(record.to)}};
}
function createSarvamProvider({env=process.env,fetchImpl=fetch,now=Date.now}={}){
 const headers={'X-API-Key':env.SARVAM_VOICE_API_KEY};
 const config={orgId:env.SARVAM_ORG_ID,workspaceId:env.SARVAM_WORKSPACE_ID,appId:env.SARVAM_AGENT_ID,version:Number(env.SARVAM_AGENT_VERSION)};
 const base=record=>'https://apps.sarvam.ai/api/analytics/v1/'+[record.sarvam?.orgId||config.orgId,record.sarvam?.workspaceId||config.workspaceId,record.sarvam?.appId||config.appId].map(encodeURIComponent).join('/');
 const get=url=>fetchImpl(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 async function dispatch(record){
  const payload=buildSarvamPayload(record,env);
  try{
   const r=await fetchImpl(`https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(config.orgId)}/workspaces/${encodeURIComponent(config.workspaceId)}/outbounds`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(12000)});
   if(r.status>=400&&r.status<500)return {state:'rejected',reason:'sarvam_rejected_'+r.status};
   if(!r.ok)return {state:'uncertain',reason:'sarvam_dispatch_unconfirmed'};
   const d=await r.json();return typeof d.attempt_id==='string'&&d.attempt_id?{state:'accepted',attemptId:d.attempt_id,...config}:{state:'uncertain',reason:'sarvam_missing_attempt_id'};
  }catch{return {state:'uncertain',reason:'sarvam_dispatch_unconfirmed'};}
 }
 async function lookup(record){
  const pending=reason=>({status:'reconciliation_required',result:{...record.result},reconciliation:{checkedAt:now(),source:'sarvam',reason}});
  if(!record.sarvam?.attemptId)return pending('missing_provider_identifier');
  try{
   const u=new URL(base(record)+'/attempts');
   // Broad date window tolerates analytics ingestion/UTC boundary differences.
   // The exact returned attempt ID is always matched locally, regardless of filters.
   u.searchParams.set('start_datetime',new Date(record.createdAt-86400000).toISOString());
   u.searchParams.set('end_datetime',new Date(now()+60000).toISOString());
   u.searchParams.set('limit','1000');u.searchParams.set('sort_by','start_datetime');u.searchParams.set('sort_order','desc');
   u.searchParams.set('filter_conditions',JSON.stringify([{id:'attempt',field:'attempt_id',operator:'equals',value:record.sarvam.attemptId}]));
   const r=await get(u);if(!r.ok)return pending('provider_lookup_failed');
   const d=await r.json(),a=d.items?.find(x=>x.attempt_id===record.sarvam.attemptId);
   if(!a)return pending('provider_record_not_available');
   const state=String(a.connectivity_status||'').toLowerCase(),reason=String(a.ended_by||a.failure_reason||'unknown');
   // Sarvam's busy attempts have no conversation start/end timestamps.
   // Only that explicit terminal result may bypass a missing end time.
   if(!a.end_datetime&&state!=='busy')return pending('provider_call_still_active');
   const interactionId=a.interaction_id&&a.interaction_id!=='NO_INTERACTION_ID'?a.interaction_id:null;
   const voicemail=/VOICEMAIL/i.test(reason),unanswered=voicemail||/busy|no.?answer|unanswered|not.?connected/.test(state);
   let transcript=[];
   if(!unanswered&&state==='connected'){
    if(!interactionId)return pending('missing_interaction_id');
    const t=await get(base(record)+'/transcripts/'+encodeURIComponent(interactionId));if(!t.ok)return pending('transcript_not_available');
    const data=await t.json();if(data.interaction_id!==interactionId||!Array.isArray(data.messages))return pending('transcript_identity_mismatch');
    transcript=data.messages.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.trim()).slice(0,500).map(m=>({speaker:m.role==='user'?'caller':'agent',text:m.content.slice(0,6000)}));
   }
   const transportStatus=unanswered?'no-answer':state==='connected'?'completed':/failed|error|cancel|invalid/.test(state)?'failed':null;
   if(!transportStatus)return pending('unrecognized_provider_status');
   const duration=Number(a.duration_in_seconds);
   return {status:'completed',sarvam:{...record.sarvam,...(interactionId?{interactionId}:{})},result:{providerRequestId:record.sarvam.attemptId,...(interactionId?{providerCallId:interactionId}:{}),transportStatus,endReason:reason,transcript,...(Number.isFinite(duration)&&duration>=0?{durationSeconds:duration}:{})},reconciliation:{checkedAt:now(),source:'sarvam',reason:'provider_call_finished',providerStatus:state}};
  }catch{return pending('provider_lookup_failed');}
 }
 async function recording(record){
  if(!record.sarvam?.interactionId)throw Error('Recording not ready');
  return get(base(record)+'/recordings/'+encodeURIComponent(record.sarvam.interactionId));
 }
 return {dispatch,lookup,recording};
}
module.exports={createSarvamProvider,buildSarvamPayload,validateSarvamEnv};
