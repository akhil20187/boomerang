// Reconcile an existing personal test only. Never dispatches a call.
const fs=require('node:fs');
const {createSarvamProvider}=require('../call-bridge/sarvam.cjs');
const {extractAnswer}=require('../call-bridge/answer.cjs');
async function main(){
 const j=JSON.parse(fs.readFileSync('call-bridge/.state/sarvam-personal-test.json'));
 const record={createdAt:Date.parse(j.startedAt),sarvam:{attemptId:j.attemptId},productDescription:'iPhone 17, lavender, 256 GB'};
 const provider=createSarvamProvider();const result=await provider.lookup(record);
 if(result.status!=='completed')throw Error('Existing test reconciliation: '+result.reconciliation.reason);
 const answer=await extractAnswer({transcript:result.result.transcript,productDescription:record.productDescription,apiKey:process.env.OPENAI_API_KEY});
 const audio=await provider.recording({...record,...result});if(!audio.ok)throw Error('Recording HTTP '+audio.status);const bytes=Buffer.from(await audio.arrayBuffer());
 fs.writeFileSync('call-bridge/.state/sarvam-adapter-verified.json',JSON.stringify({...result,answer,recordingBytes:bytes.length},null,2),{mode:0o600});
 console.log(JSON.stringify({status:result.status,transport:result.result.transportStatus,duration:result.result.durationSeconds,messages:result.result.transcript.length,callerMessages:result.result.transcript.filter(x=>x.speaker==='caller').length,stock:answer.stock,variant:answer.variantMatch,recordingType:audio.headers.get('content-type'),recordingBytes:bytes.length,callsPlaced:0}));
}
main().catch(x=>{console.error(x.message);process.exitCode=1;});
