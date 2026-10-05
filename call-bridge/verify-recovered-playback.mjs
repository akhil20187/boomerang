import {spawnSync} from 'node:child_process';
const r=spawnSync('npx',['convex','run','recordings:playback',JSON.stringify({attemptId:'k172zbw956hskbpfckg66bw4x98fqfpj'}),'--identity',JSON.stringify({subject:'m170w1r78ekd0497qj1rfj4bdd8fqjpg'})],{encoding:'utf8',timeout:30000});
if(r.status!==0)throw Error('Owner playback verification failed; private output suppressed');
const grant=JSON.parse(r.stdout);const response=await fetch(grant.url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(15000)});const bytes=await response.arrayBuffer();const denied=await fetch('https://little-kangaroo-718.convex.site/api/recording');
if(![200,206].includes(response.status)||!response.headers.get('content-type')?.startsWith('audio/')||!bytes.byteLength||denied.status!==401)throw Error('Protected playback check failed');
console.log(JSON.stringify({ownerPlayback:response.status,type:response.headers.get('content-type'),bytes:bytes.byteLength,unauthenticated:denied.status}));
