// Read only: inspect our most recent personal rehearsal and recording response shape.
const fs=require('node:fs');
const e=process.env;
const journal=JSON.parse(fs.readFileSync('call-bridge/.state/sarvam-personal-test.json'));
const base='https://apps.sarvam.ai/api/analytics/v1/'+[e.SARVAM_ORG_ID,e.SARVAM_WORKSPACE_ID,e.SARVAM_AGENT_ID].map(encodeURIComponent).join('/');
async function main(){
 const u=new URL(base+'/attempts');
 u.searchParams.set('start_datetime',new Date(Date.parse(journal.startedAt)-86400000).toISOString());u.searchParams.set('end_datetime',new Date().toISOString());u.searchParams.set('limit','100');u.searchParams.set('sort_order','desc');u.searchParams.set('sort_by','start_datetime');
 const r=await fetch(u,{headers:{'X-API-Key':e.SARVAM_VOICE_API_KEY},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Analytics HTTP '+r.status);
 const d=await r.json(),a=d.items?.find(x=>x.attempt_id===journal.attemptId);
 console.log(JSON.stringify({total:d.total,returned:d.items?.length,found:!!a}));if(!a)return;
 fs.writeFileSync('call-bridge/.state/sarvam-latest-raw.json',JSON.stringify(a),{mode:0o600});
 console.log(JSON.stringify({attemptId:a.attempt_id,interactionId:a.interaction_id,status:a.connectivity_status,endedBy:a.ended_by,duration:a.duration_in_seconds,messages:a.num_messages,keys:Object.keys(a),audioHost:a.audio_url?new URL(a.audio_url).hostname:null}));
 for(const kind of ['transcripts','recordings']){
  const z=await fetch(base+'/'+kind+'/'+encodeURIComponent(a.interaction_id),{headers:{'X-API-Key':e.SARVAM_VOICE_API_KEY},signal:AbortSignal.timeout(20000)});
  const type=z.headers.get('content-type');const bytes=Buffer.from(await z.arrayBuffer());fs.writeFileSync('call-bridge/.state/sarvam-latest-'+kind,bytes,{mode:0o600});
  console.log(JSON.stringify({kind,status:z.status,type,bytes:bytes.length,...(type?.includes('json')?{shape:Object.keys(JSON.parse(bytes))}:{})}));
 }
}
main().catch(x=>{console.error(x.message);process.exitCode=1;});
