import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const callId='be5d5fce-9f1b-4ed4-9b92-ed61f01b284e';
const base='https://api.vobiz.ai/api/v1/Account/'+encodeURIComponent(process.env.VOBIZ_AUTH_ID);
const headers={'X-Auth-ID':process.env.VOBIZ_AUTH_ID,'X-Auth-Token':process.env.VOBIZ_AUTH_TOKEN};
mkdirSync(root+'call-bridge/.state',{recursive:true});
for(const path of ['/Call/'+callId+'/','/Recording/?call_uuid='+callId+'&limit=20']){
 const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(15000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={nonJson:true}};
 writeFileSync(root+'call-bridge/.state/provider-'+(path.startsWith('/Call/')?'call':'recordings')+'.json',JSON.stringify(data),{mode:0o600});
 const rows=data.objects||data.recordings||data.data||[];
 if(Array.isArray(rows))for(const x of rows.filter(x=>x.call_uuid===callId&&x.recording_url)){
  const u=new URL(x.recording_url);if(u.hostname!=='media.vobiz.ai'||u.protocol!=='https:')throw Error('Unexpected media host');
  for(const authenticated of [false,true]){const media=await fetch(u,{headers:authenticated?{...headers,Range:'bytes=0-1023'}:{Range:'bytes=0-1023'},redirect:'error',signal:AbortSignal.timeout(15000)});console.log(JSON.stringify({kind:'media',authenticated,status:media.status,type:media.headers.get('content-type')}));await media.body?.cancel();}
 }
 console.log(JSON.stringify({kind:path.startsWith('/Call/')?'call':'recordings',status:r.status,keys:Object.keys(data),rows:Array.isArray(rows)?rows.map(x=>({keys:Object.keys(x),callId:x.call_uuid||x.call_id,recordingId:x.recording_id,host:(x.recording_url||x.record_url||x.url)?new URL(x.recording_url||x.record_url||x.url).hostname:null})):null}));
}
