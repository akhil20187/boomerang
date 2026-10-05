const http=require('node:http');
const net=require('node:net');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createPhoneAgent}=require('../voice-test/phone-agent.cjs');
const {phoneNumber,callLimit}=require('../voice-test/phone-core.cjs');
const {extractAnswer}=require('./answer.cjs');
const {reconcileAttempt}=require('./reconcile.cjs');

function validateRuntimeEnv(env=process.env){
 for(const key of ['CALL_BRIDGE_SECRET','CALL_BRIDGE_PUBLIC_URL','CONVEX_CALLBACK_URL','OPENAI_API_KEY','VOBIZ_AUTH_ID','VOBIZ_AUTH_TOKEN','VOBIZ_FROM_NUMBER'])if(typeof env[key]!=='string'||!env[key].trim())throw Error('Missing '+key);
 if(env.CALL_BRIDGE_SECRET.length<32)throw Error('CALL_BRIDGE_SECRET must contain at least 32 characters');
 let publicEndpoint,callbackEndpoint;
 try{publicEndpoint=new URL(env.CALL_BRIDGE_PUBLIC_URL);}catch{throw Error('CALL_BRIDGE_PUBLIC_URL must be an HTTPS origin');}
 if(publicEndpoint.protocol!=='https:'||publicEndpoint.username||publicEndpoint.password||publicEndpoint.pathname!=='/'||publicEndpoint.search||publicEndpoint.hash)throw Error('CALL_BRIDGE_PUBLIC_URL must be an HTTPS origin');
 try{callbackEndpoint=new URL(env.CONVEX_CALLBACK_URL);}catch{throw Error('CONVEX_CALLBACK_URL must be an HTTPS endpoint');}
 if(callbackEndpoint.protocol!=='https:'||callbackEndpoint.username||callbackEndpoint.password||callbackEndpoint.hash)throw Error('CONVEX_CALLBACK_URL must be an HTTPS endpoint');
 try{phoneNumber(env.VOBIZ_FROM_NUMBER);}catch{throw Error('VOBIZ_FROM_NUMBER must include its country code');}
 return {publicUrl:publicEndpoint.origin,callbackUrl:callbackEndpoint.href};
}

function createBridge({env=process.env,secret=env.CALL_BRIDGE_SECRET,publicUrl=env.CALL_BRIDGE_PUBLIC_URL,callbackUrl=env.CONVEX_CALLBACK_URL,journalPath=env.CALL_BRIDGE_JOURNAL || path.join(__dirname,'data','attempts.json'),bindHost=env.CALL_BRIDGE_BIND_HOST || '127.0.0.1',maxConcurrent=Number(env.CALL_BRIDGE_MAX_CONCURRENT || 1),maxSeconds=Number(env.CALL_BRIDGE_MAX_SECONDS || 180),agentFactory=createPhoneAgent,fetchImpl=fetch}={}){
 if(!secret || secret.length<32)throw Error('CALL_BRIDGE_SECRET must contain at least 32 characters');
 if(!publicUrl || new URL(publicUrl).protocol!=='https:')throw Error('CALL_BRIDGE_PUBLIC_URL must use HTTPS');
 if(!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>10)throw Error('Concurrency must be 1–10');
 if(!['127.0.0.1','0.0.0.0'].includes(bindHost))throw Error('CALL_BRIDGE_BIND_HOST must be 127.0.0.1 or 0.0.0.0');
 callLimit(maxSeconds);
 let runtimeConfigured=agentFactory!==createPhoneAgent;
 if(!runtimeConfigured){try{validateRuntimeEnv({...env,CALL_BRIDGE_SECRET:secret,CALL_BRIDGE_PUBLIC_URL:publicUrl,CONVEX_CALLBACK_URL:callbackUrl});runtimeConfigured=true;}catch{}}
 const attempts=new Map(),routes=new Map(),agents=new Map(),delivering=new Set(),watchdogs=new Map(),reconciling=new Map();
 if(journalPath&&fs.existsSync(journalPath))for(const r of JSON.parse(fs.readFileSync(journalPath,'utf8')))attempts.set(r.attemptId,{...r,status:['requested','dispatching','calling','answered'].includes(r.status)?'reconciliation_required':r.status});
 function persist(){if(!journalPath)return;fs.mkdirSync(path.dirname(journalPath),{recursive:true});fs.writeFileSync(journalPath+'.tmp',JSON.stringify([...attempts.values()]),{mode:0o600});fs.renameSync(journalPath+'.tmp',journalPath);}
 const reply=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 function authorised(req){const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+secret);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
 async function callback(record){
  if(!callbackUrl)return;
  const body={eventId:crypto.randomUUID(),attemptId:record.attemptId,taskId:record.taskId,shopJobId:record.shopJobId,status:record.status,...record.result};
  record.pendingCallbacks=[...(record.pendingCallbacks||[]),body];persist();
  await deliver(record);
 }
 async function deliver(record){if(delivering.has(record.attemptId))return;delivering.add(record.attemptId);try{while(record.pendingCallbacks?.length){const r=await fetchImpl(callbackUrl,{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify(record.pendingCallbacks[0]),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Callback rejected');record.pendingCallbacks.shift();record.callbackPending=false;persist();}}catch{record.callbackPending=true;persist();}finally{delivering.delete(record.attemptId);}}
 async function reconcile(record){
  if(agents.has(record.attemptId)||record.status!=='reconciliation_required')return;
  if(reconciling.has(record.attemptId))return reconciling.get(record.attemptId);
  const operation=(async()=>{
   const recovered=await reconcileAttempt(record,{env,fetchImpl});
   Object.assign(record,recovered);
   if(record.status==='completed'&&!record.result.answer)record.result.answer=await extractAnswer({transcript:record.result.transcript,productDescription:record.productDescription,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_SUMMARY_MODEL||'gpt-4.1-mini',fetchImpl});
   const signature=JSON.stringify([record.status,record.reconciliation.source,record.reconciliation.reason,record.reconciliation.providerStatus]);
   const changed=record.recoverySignature!==signature;record.recoverySignature=signature;persist();
   if(changed)await callback(record);
  })();reconciling.set(record.attemptId,operation);try{await operation;}finally{reconciling.delete(record.attemptId);}
 }
 async function recover(){for(const record of attempts.values())await reconcile(record);}
 async function startRecording(record,callId){
  if(record.recording||!env.VOBIZ_AUTH_ID||!env.VOBIZ_AUTH_TOKEN)return;
  record.recording={status:'starting',token:crypto.randomBytes(24).toString('hex'),callId};persist();
  try{const response=await fetchImpl('https://api.vobiz.ai/api/v1/Account/'+encodeURIComponent(env.VOBIZ_AUTH_ID)+'/Call/'+encodeURIComponent(callId)+'/Record/',{method:'POST',headers:{'X-Auth-ID':env.VOBIZ_AUTH_ID,'X-Auth-Token':env.VOBIZ_AUTH_TOKEN,'content-type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({time_limit:maxSeconds,file_format:'mp3',record_channel_type:'mono',callback_url:publicUrl+'/recording/'+record.recording.token,callback_method:'POST'})});if(!response.ok)throw Error();const data=await response.json();record.recording.status='processing';record.recording.recordingId=data.recording_id;persist();}catch{record.recording.status='unavailable';persist();}
 }
 async function start(record){
  let agent;
  try{
   agent=agentFactory({env:{...env,PHONE_TEST_MAX_SECONDS:String(maxSeconds)},publicUrl,to:record.to,port:0,openingInstructions:`Give a brief greeting: identify yourself as an automated assistant calling on behalf of ${record.customerName}. Ask the shop about availability of ${record.productDescription}, using a short natural summary without adding facts. If a screening service answers, give only your identity and reason, then wait silently.`,instructions:`You are the buyer's representative: an automated assistant calling a shop on behalf of ${record.customerName}. You are not a seller, support agent or order taker.
Customer's requested product: ${record.productDescription}
Customer's additional requirements: ${record.instructions||'None'}
Speak English unless the person clearly requests another language. Keep each spoken turn to one or two short sentences and ask one question at a time.
First establish that you are speaking to the shop. For call screening, give your identity and purchase-enquiry reason once. When asked to hold or stay on the line, acknowledge once and wait silently until a person addresses you. Do not ask product questions during screening or hold announcements.
Ask the shop whether it sells the requested product. For uncertain compatibility, quote the model exactly as supplied and ask the shop to identify the compatible item. Never invent a cartridge number, model, compatibility, stock, price or offer. A hello, yes, noise or unclear word is not evidence for a specific identifier. If the shop supplies a number, repeat it once to confirm; do not propose an unprovided number.
You supply the customer's requirements; the shop supplies stock and product knowledge. Do not ask the shop what printer it owns, what it wants to buy or what cartridge it needs. Never offer to place an order, reserve stock or pay.
Ask availability, final price including taxes and applicable offers in sequence; skip already answered questions. If the shop cannot identify compatibility without more details, mark it unconfirmed and finish instead of asking the same model question repeatedly.
If speech is unclear, say you did not catch it and ask for that specific detail once. After two unclear replies, explain that the line is unclear and politely finish using end_call. Do not say you understood an unclear answer. Ignore unrelated background speech and do not narrate your thinking.
If the shop wants a person, refuses, says goodbye or asks to end, call end_call immediately. When the enquiry is complete, call end_call; the application handles the final goodbye.`,log:()=>{},saveResult:result=>{record.result={...record.result,...normalize(result)};persist();if(result.status==='answered'&&!record.answeredAt){record.answeredAt=Date.now();record.status='answered';void callback(record);if(result.callId)void startRecording(record,result.callId);}},fetchImpl:async(url,options)=>{
    if(options?.method==='POST'&&String(url).endsWith('/Call/')){const dial=JSON.parse(options.body);const token=new URL(dial.answer_url).pathname.split('/').pop();routes.set(token,agent.localUrl);}
    return fetchImpl(url,options);
   }});
   agents.set(record.attemptId,agent);await agent.start();const result=await agent.call();if(!record.answeredAt)record.status='requested';record.result=normalize(result);persist();
   const watchdog=setTimeout(async()=>{record.status='reconciliation_required';await callback(record);await agent.stop();agents.delete(record.attemptId);},(maxSeconds+90)*1000);watchdog.unref();watchdogs.set(record.attemptId,watchdog);
   agent.completed.then(async result=>{clearTimeout(watchdog);watchdogs.delete(record.attemptId);record.result={...record.result,...normalize(result)};record.result.answer=await extractAnswer({transcript:result.transcript,productDescription:record.productDescription,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_SUMMARY_MODEL||'gpt-4.1-mini',fetchImpl});record.status=result.status==='request_unknown'?'reconciliation_required':'completed';await callback(record);agents.delete(record.attemptId);const localUrl=agent.localUrl;await agent.stop();for(const [token,url]of routes)if(url===localUrl)routes.delete(token);}).catch(()=>{});
  }catch{record.status=record.result?.transportStatus==='request_unknown'?'reconciliation_required':'failed';await callback(record);agents.delete(record.attemptId);if(agent)await agent.stop();}
 }
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/health')return reply(res,runtimeConfigured?200:503,{ready:runtimeConfigured,active:agents.size,reconciliationRequired:[...attempts.values()].filter(x=>x.status==='reconciliation_required').length});
  const recordingRoute=/^\/recording\/([a-f0-9]{48})$/.exec(req.url||'');
  if(recordingRoute&&req.method==='POST'){
   const record=[...attempts.values()].find(r=>r.recording?.token===recordingRoute[1]);if(!record)return reply(res,404,{error:'Not found'});
   let text='';for await(const chunk of req){text+=chunk;if(text.length>16000)return reply(res,413,{error:'Request too large'});}
   try{const data=req.headers['content-type']?.includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));if(data.call_uuid!==record.recording.callId||!data.recording_id||record.recording.recordingId&&record.recording.recordingId!==data.recording_id)throw Error();const url=new URL(data.record_url);if(url.protocol!=='https:')throw Error();const duration=Number(data.recording_duration);const durationFields=data.recording_duration!==undefined&&data.recording_duration!==null&&data.recording_duration!==''&&Number.isFinite(duration)&&duration>=0?{durationSeconds:duration}:{};record.recording={...record.recording,status:'ready',recordingId:data.recording_id,url:url.href,...durationFields};record.result={...record.result,recording:{status:'ready',recordingId:data.recording_id,url:url.href,...durationFields}};persist();await callback(record);return reply(res,200,{ok:true});}catch{return reply(res,400,{error:'Invalid recording callback'});}
  }
  const route=/^\/(answer|status)\/([a-zA-Z0-9]+)$/.exec(req.url||'');
  if(route&&req.method==='POST'&&routes.has(route[2])){const dest=new URL(routes.get(route[2]));const upstream=http.request({hostname:dest.hostname,port:dest.port,path:req.url,method:'POST',headers:{'content-type':req.headers['content-type']||'application/x-www-form-urlencoded'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});upstream.on('error',()=>reply(res,502,{error:'Call endpoint unavailable'}));req.pipe(upstream);return;}
  if(req.method==='GET'&&req.url.startsWith('/attempts/')){if(!authorised(req))return reply(res,401,{error:'Unauthorised'});let id;try{id=decodeURIComponent(req.url.slice('/attempts/'.length));}catch{return reply(res,400,{error:'Invalid attempt ID'});}const record=attempts.get(id);if(record)await reconcile(record);return reply(res,record?200:404,record||{error:'Attempt not found'});}
  if(req.method!=='POST'||req.url!=='/dispatch')return reply(res,404,{error:'Not found'});
  if(!authorised(req))return reply(res,401,{error:'Unauthorised'});
  if(!runtimeConfigured)return reply(res,503,{error:'Bridge provider and callback configuration is incomplete'});
  const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>64000)return reply(res,413,{error:'Request too large'});chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
  let data;try{data=JSON.parse(body);for(const k of ['attemptId','taskId','shopJobId','customerName','productDescription'])if(typeof data[k]!=='string'||!data[k].trim()||data[k].length>(k==='productDescription'?12000:1000))throw Error();data.to=phoneNumber(data.to);if(data.instructions!==undefined&&(typeof data.instructions!=='string'||data.instructions.length>3000))throw Error();}catch{return reply(res,400,{error:'Invalid dispatch'});}
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify([data.taskId,data.shopJobId,data.to,data.productDescription,data.customerName,data.instructions||''])).digest('hex');
  const existing=attempts.get(data.attemptId);
  if(existing)return reply(res,existing.fingerprint===fingerprint?200:409,{attemptId:existing.attemptId,status:existing.status});
  const unresolved=[...attempts.values()].filter(r=>r.status==='reconciliation_required'&&!agents.has(r.attemptId)).length;
  if(agents.size+unresolved>=maxConcurrent)return reply(res,429,{error:'Call capacity reached'});
  const record={...data,fingerprint,status:'dispatching',createdAt:Date.now()};attempts.set(data.attemptId,record);persist();
  // Reserve before awaiting anything, including provider model preflight.
  agents.set(data.attemptId,null);void start(record);reply(res,202,{attemptId:data.attemptId,status:'dispatching'});
 });
 server.on('upgrade',(req,socket,head)=>{const route=/^\/media\/([a-zA-Z0-9]+)$/.exec(req.url||'');if(!route||!routes.has(route[1]))return socket.destroy();const dest=new URL(routes.get(route[1]));const upstream=net.connect(Number(dest.port),dest.hostname,()=>{upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${req.rawHeaders.reduce((s,v,i)=>s+v+(i%2?'\r\n':': '),'')}\r\n`);if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());});
 const retry=setInterval(()=>{for(const r of attempts.values())if(r.pendingCallbacks?.length)void deliver(r);void recover();},30000);retry.unref();
 return {recover,listen:port=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,bindHost,()=>{server.removeListener('error',reject);void recover();resolve();});}),get bindAddress(){return server.address()?.address||null;},get localUrl(){return 'http://127.0.0.1:'+server.address().port;},async close(){clearInterval(retry);for(const timer of watchdogs.values())clearTimeout(timer);await Promise.all([...agents.values()].filter(Boolean).map(a=>a.stop()));await Promise.all([...reconciling.values()]);await new Promise(resolve=>server.close(resolve));}};
}
function normalize(r){return {providerCallId:r.callId||null,providerRequestId:r.requestId||null,durationSeconds:r.durationSeconds,endReason:r.endReason,transportStatus:r.status,transcript:r.transcript||[],errors:r.errors||[]};}
if(require.main===module){const runtime=validateRuntimeEnv();const bridge=createBridge(runtime);bridge.listen(Number(process.env.PORT||3212)).then(()=>console.log('Human MCP call bridge ready'));for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>bridge.close().then(()=>process.exit()));}
module.exports={createBridge,normalize,validateRuntimeEnv};
