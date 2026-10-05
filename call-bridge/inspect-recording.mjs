import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const secret=readFileSync(root+'.env.voice','utf8').match(/^CALL_BRIDGE_SECRET=(.+)$/m)?.[1];
const id=process.argv[2];if(!/^k[a-z0-9]+$/.test(id||''))throw Error('Pass a valid attempt ID');
const r=await fetch('https://voice-bridge-development.up.railway.app/attempts/'+id,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(15000)});
if(!r.ok)throw Error('Attempt lookup failed: '+r.status);
const data=await r.json();mkdirSync(root+'call-bridge/.state',{recursive:true});writeFileSync(root+'call-bridge/.state/recording-'+id+'.json',JSON.stringify(data),{mode:0o600});
const rec=data.recording||data.result?.recording;
console.log(JSON.stringify({status:data.status,recording:rec?{status:rec.status,recordingId:rec.recordingId,host:rec.url?new URL(rec.url).hostname:null,durationSeconds:rec.durationSeconds}:null,errors:data.result?.errors,pendingCallbackCount:data.pendingCallbacks?.length}));
if(process.argv[3]==='download-check'){
 const audio=await fetch('https://voice-bridge-development.up.railway.app/attempts/'+id+'/recording',{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(30000)});
 const bytes=await audio.arrayBuffer();console.log(JSON.stringify({downloadStatus:audio.status,type:audio.headers.get('content-type'),bytes:bytes.byteLength,error:audio.ok?null:Buffer.from(bytes).toString()}));
}
