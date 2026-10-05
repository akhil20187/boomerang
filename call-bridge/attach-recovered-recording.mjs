import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const id='k172zbw956hskbpfckg66bw4x98fqfpj';
const d=JSON.parse(readFileSync(new URL('./.state/recording-'+id+'.json',import.meta.url),'utf8'));
const r=d.result.recording;
const args={attemptId:id,taskId:d.taskId,shopJobId:d.shopJobId,eventId:id+':recording-recovery',url:r.url,...(r.durationSeconds!=null?{durationSeconds:r.durationSeconds}:{})};
const p=spawnSync('npx',['convex','run','recordings:ingest',JSON.stringify(args)],{encoding:'utf8',timeout:45000});
if(p.status!==0){const safe=p.stderr.replace(/https?:\/\/[^\s"']+/g,'[private-url]').slice(-1800);console.error(safe);process.exit(1);}console.log('Recovered recording attached through validated ingestion.');
