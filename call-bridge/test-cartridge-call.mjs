import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function convex(args){const r=spawnSync('npx',['convex',...args],{cwd:root,encoding:'utf8',timeout:30000});if(r.status!==0)throw Error('Convex operation failed; private output suppressed');return r.stdout.trim();}
const secret=readFileSync(root+'.env.voice','utf8').match(/^CALL_BRIDGE_SECRET=(.+)$/m)?.[1];
const origin='https://voice-bridge-development.up.railway.app';
const saved=root+'call-bridge/.state/cartridge-rehearsal.json';
mkdirSync(root+'call-bridge/.state',{recursive:true});
if(process.argv[2]==='dial'){
 if(!process.env.TEST_TO_NUMBER)throw Error('TEST_TO_NUMBER missing');
 const email=convex(['env','get','TEST_ACCOUNT_EMAIL']);
 const fixture=JSON.parse(convex(['run','verification:create',JSON.stringify({email,label:'Personal cartridge voice rehearsal '+Date.now()})]));
 convex(['run','verification:revoke',JSON.stringify({tokenId:fixture.tokenId})]);
 const request={attemptId:fixture.attemptId,taskId:fixture.taskId,shopJobId:fixture.shopJobId,to:process.env.TEST_TO_NUMBER,customerName:'Akhilesh',productDescription:'a black ink cartridge compatible with an HP printer whose model the customer gave as 2989; the exact model and compatible cartridge number are not yet confirmed',instructions:'This is a personal rehearsal: the person answering is acting as a shopkeeper. Ask them to confirm the printer model and compatible black cartridge number; do not assume compatibility. Ask whether it is original HP or a compatible third-party cartridge, whether it is in stock, and the final price including taxes. Do not make a purchase or promise compatibility.'};
 writeFileSync(saved,JSON.stringify({attemptId:fixture.attemptId,taskId:fixture.taskId,shopJobId:fixture.shopJobId}),{mode:0o600});
 const response=await fetch(origin+'/dispatch',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(15000)});
 console.log(JSON.stringify({httpStatus:response.status,...await response.json()}));
}else{
 const ids=JSON.parse(readFileSync(saved,'utf8'));
 const response=await fetch(origin+'/attempts/'+ids.attemptId,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 writeFileSync(root+'call-bridge/.state/cartridge-rehearsal-result.json',JSON.stringify(data,null,2),{mode:0o600});
 console.log(JSON.stringify({httpStatus:response.status,status:data.status,durationSeconds:data.result?.durationSeconds,transcriptSegments:data.result?.transcript?.length,errors:data.result?.errors,answer:data.result?.answer}));
}
