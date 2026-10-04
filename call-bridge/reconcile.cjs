/** Read-only provider reconciliation. A missing record is never permission to redial. */
async function reconcileAttempt(attempt,{env=process.env,fetchImpl=fetch,now=Date.now}={}){
 const uncertain=(reason,extra={})=>({status:'reconciliation_required',result:{...attempt.result},reconciliation:{checkedAt:now(),source:'unknown',reason,...extra}});
 const id=attempt.result?.providerCallId||attempt.result?.providerRequestId;
 if(!id)return uncertain('missing_provider_identifier');
 if(!env.VOBIZ_AUTH_ID||!env.VOBIZ_AUTH_TOKEN)return uncertain('provider_credentials_unconfigured');
 const base='https://api.vobiz.ai/api/v1/Account/'+encodeURIComponent(env.VOBIZ_AUTH_ID);
 const options={method:'GET',headers:{'X-Auth-ID':env.VOBIZ_AUTH_ID,'X-Auth-Token':env.VOBIZ_AUTH_TOKEN}};
 const matches=(record,recordId)=>recordId===id&&(!record.destination_number&&!record.to||String(record.destination_number||record.to).replace(/^\+/,'')===String(attempt.to||'').replace(/^\+/,''));
 try{
  for(const status of ['live','queued']){
   const response=await fetchImpl(base+'/Call/'+encodeURIComponent(id)+'/?status='+status,{...options,signal:AbortSignal.timeout(10000)});
   if(response.ok){const data=await response.json();if(!matches(data,data.call_uuid||data.request_uuid))return uncertain('provider_identifier_mismatch');return {status:'reconciliation_required',result:{...attempt.result,providerCallId:data.call_uuid||id},reconciliation:{checkedAt:now(),source:'provider_live',providerStatus:data.call_status||status,reason:'provider_call_still_active'}};}
   if(response.status!==404)return uncertain('provider_lookup_failed');
  }
  const response=await fetchImpl(base+'/cdr/'+encodeURIComponent(id),{...options,signal:AbortSignal.timeout(10000)});
  if(!response.ok)return uncertain('provider_record_not_available');
  const data=await response.json(),record=data.data;
  if(!data.success||!record||!matches(record,record.uuid)||!record.end_time)return uncertain('provider_record_incomplete_or_mismatched');
  const answered=!!record.answer_time;
  const cause=String(record.hangup_cause||'').toUpperCase();
  const transportStatus=answered?'completed':/BUSY/.test(cause)?'busy':/NO_ANSWER|NO_USER_RESPONSE|NORMAL_CLEARING|ORIGINATOR_CANCEL/.test(cause)?'no-answer':'failed';
  const duration=Number(record.billsec);
  return {status:'completed',result:{...attempt.result,providerCallId:record.uuid,transportStatus,endReason:record.hangup_cause||'provider_completed',...(Number.isFinite(duration)&&duration>=0?{durationSeconds:duration}:{}),...(answered?{answered:true}:{})},reconciliation:{checkedAt:now(),source:'provider_cdr',providerStatus:transportStatus,reason:'provider_call_finished'}};
 }catch{return uncertain('provider_lookup_failed');}
}
module.exports={reconcileAttempt};
