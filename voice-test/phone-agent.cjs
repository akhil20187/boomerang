const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocket, WebSocketServer } = require('ws');
const { answerXml, dialPayload, ClosingGate, callLimit } = require('./phone-core.cjs');

function createPhoneAgent({env = process.env, publicUrl, to = env.TEST_TO_NUMBER, from = env.VOBIZ_FROM_NUMBER, instructions, openingInstructions, port = 3211, log = console.log, fetchImpl = fetch, openAISocketFactory, saveResult} = {}) {
for(const key of ['OPENAI_API_KEY','VOBIZ_AUTH_ID','VOBIZ_AUTH_TOKEN'])if(!env[key])throw Error('Missing '+key);
const maxSeconds = callLimit(env.PHONE_TEST_MAX_SECONDS || 300);
const model = env.OPENAI_VOICE_MODEL || 'gpt-realtime-2.1-mini';
const token = crypto.randomBytes(24).toString('hex');
dialPayload({from,to,publicUrl,token,maxSeconds});
const transcript = [];
let requestId, callId, active, requested = false, ended = false, started = false, stopping = false;
let status = 'idle', durationSeconds = null, endReason = null;
const errors = [];
let complete;
const completed = new Promise(resolve => { complete = resolve; });
const console = {log};
const headers = {'X-Auth-ID':env.VOBIZ_AUTH_ID, 'X-Auth-Token':env.VOBIZ_AUTH_TOKEN, 'Content-Type':'application/json'};
const base = 'https://api.vobiz.ai/api/v1/Account/' + encodeURIComponent(env.VOBIZ_AUTH_ID);
const session = {
  type:'realtime', model,
  instructions:instructions || `You are Boomerang's automated assistant on a short test phone call with the person building Boomerang. Introduce yourself honestly as their automated calling assistant. Start in ${env.PHONE_TEST_LANGUAGE || 'Telugu'}, using a short, friendly greeting. Hold a natural conversation about how this phone test sounds. Ask one short question at a time. Switch between Telugu, Hindi and English whenever asked. Keep replies concise and pronounce English product names naturally. Do not pretend to be a human, a shopkeeper or to have checked stock. When the person says goodbye, asks to end, or the conversation is finished, call end_call immediately. The application will ask you for a final goodbye and then hang up. Never prolong the call with 'anything else'.`,
  audio:{input:{format:{type:'audio/pcmu'},noise_reduction:{type:'near_field'},transcription:{model:'gpt-4o-mini-transcribe'},turn_detection:{type:'server_vad',threshold:0.7,prefix_padding_ms:300,silence_duration_ms:700,create_response:true,interrupt_response:false}},output:{format:{type:'audio/pcmu'},voice:'marin'}},
  tools:[{type:'function',name:'end_call',description:'Finish the call when the caller says goodbye or asks to end.',parameters:{type:'object',properties:{},additionalProperties:false}}],
  tool_choice:'auto',max_output_tokens:400
};
function send(socket, message) { if(socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
async function vobiz(url, options={}) {
  return fetchImpl(base + url, {...options,headers,signal:AbortSignal.timeout(15000)});
}
function getResult() {return structuredClone({model,callId,requestId,status,durationSeconds,endReason,errors,transcript});}
function save() {
  if(saveResult) {saveResult(getResult());return;}
  const folder = path.join(__dirname,'phone-results'); fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'latest.json'), JSON.stringify(getResult(),null,2),{mode:0o600});
}
async function hangup(reason) {
  endReason = reason;
  console.log('Ending test: ' + reason);
  if (callId && !ended) {
    try { const r=await vobiz('/Call/'+encodeURIComponent(callId)+'/',{method:'DELETE'}); console.log('Telephone hangup: HTTP '+r.status); } catch { console.log('Hangup request failed; stream timeout remains active.'); }
  }
  if(active) active.close(); save();
}
function connectOpenAI() { return openAISocketFactory ? openAISocketFactory() : new WebSocket('wss://api.openai.com/v1/realtime?model='+encodeURIComponent(model),{headers:{Authorization:'Bearer '+env.OPENAI_API_KEY}}); }
async function checkModelSession() {
  await new Promise((resolve,reject)=>{
    const ws=connectOpenAI(); const timer=setTimeout(()=>{ws.close();reject(new Error('Model session timeout'));},20000);
    ws.on('open',()=>send(ws,{type:'session.update',session}));
    ws.on('message',raw=>{const e=JSON.parse(raw);if(e.type==='session.updated'){clearTimeout(timer);ws.close();console.log('Realtime audio session accepted for '+model);resolve();} if(e.type==='error'){clearTimeout(timer);ws.close();console.log('OpenAI session error: '+e.error?.code);reject(new Error('Model configuration rejected'));}});
    ws.on('error',()=>{clearTimeout(timer);reject(new Error('OpenAI socket failed'));});
  });
}
const server = http.createServer(async(req,res)=>{
  if(req.method==='GET' && req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ready:true,model}));}
  if(req.method!=='POST' || !['/answer/'+token,'/status/'+token].includes(req.url)){res.writeHead(404);return res.end();}
  let body=''; for await(const chunk of req){body+=chunk;if(body.length>16000){res.writeHead(413);return res.end();}}
  const fields=new URLSearchParams(body);
  if(req.url.startsWith('/answer/')) {
    if(callId || active){res.writeHead(200,{'Content-Type':'application/xml'});return res.end('<Response><Hangup/></Response>');}
    callId=fields.get('CallUUID') || fields.get('CallUuid');
    status = 'answered';
    save();
    res.writeHead(200,{'Content-Type':'application/xml'});res.end(answerXml(publicUrl,token,maxSeconds));
    console.log('Phone answered; connecting audio.');
  } else {
    ended = true;
    status = fields.get('CallStatus') || 'completed';
    const duration=fields.get('Duration') || fields.get('BillDuration');
    durationSeconds=duration !== null && Number.isFinite(Number(duration)) ? Number(duration) : null;
    console.log('Vobiz call status: '+(fields.get('CallStatus') || 'ended'));
    console.log('Call duration: '+(fields.get('Duration') || fields.get('BillDuration') || 'unknown'));
    if(active) active.close();save();complete(getResult());res.writeHead(200);res.end('OK');
  }
});
const wss=new WebSocketServer({noServer:true,maxPayload:100000});
server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/media/'+token || active){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
});
wss.on('connection', phone=>{
  active=phone; const gate=new ClosingGate(); const ai=connectOpenAI();
  let streamId,ready=false,queue=[],closingResponse,goodbyePending=false,endCommandPending=false,fallback;
  let itemId,outputStarted,outputBytes=0;
  let interruptionTimer,responseActive=false;
  const hardLimit=setTimeout(()=>hangup('configured '+maxSeconds+'-second limit'),maxSeconds*1000);
  ai.on('open',()=>send(ai,{type:'session.update',session}));
  const greet=()=>send(ai,{type:'response.create',response:{instructions:openingInstructions || 'Give your short opening greeting and ask how the person is doing.'}});
  phone.on('message',raw=>{
    let e;try{e=JSON.parse(raw);}catch{return;}
    if(e.event==='start') {
      streamId=e.start.streamId;callId=callId || e.start.callId;
      const fmt=e.start.mediaFormat;
      if(!fmt || !/mulaw|pcmu/i.test(fmt.encoding) || Number(fmt.sampleRate)!==8000){console.log('Unsupported incoming audio format.');hangup('audio format mismatch');return;}
      console.log('Telephone audio connected: mu-law 8 kHz.');if(ready)greet();
    }
    if(e.event==='media' && e.media?.payload){const msg={type:'input_audio_buffer.append',audio:e.media.payload};if(ready)send(ai,msg);else if(queue.length<250)queue.push(msg);}
    if(e.event==='playedStream' && gate.played(e.name || e.playedStream?.name || e.playedStream?.checkpointName)){hangup('goodbye playback finished');}
  });
  ai.on('message',raw=>{
    let e;try{e=JSON.parse(raw);}catch{return;}
    if(e.type==='session.updated'){ready=true;for(const q of queue)send(ai,q);queue=[];if(streamId)greet();}
    if(e.type==='response.created') {responseActive=true;outputStarted=undefined;outputBytes=0;itemId=undefined;if(goodbyePending){closingResponse=e.response.id;goodbyePending=false;}}
    if(e.type==='response.output_audio.delta' && streamId){itemId=e.item_id;outputStarted=outputStarted||Date.now();outputBytes+=Buffer.from(e.delta,'base64').length;send(phone,{event:'playAudio',streamId,media:{contentType:'audio/x-mulaw',sampleRate:8000,payload:e.delta}});}
    // Allow the 700 ms speech-stop silence window to resolve short bursts first.
    if(e.type==='input_audio_buffer.speech_started' && streamId){clearTimeout(interruptionTimer);interruptionTimer=setTimeout(()=>{if(!itemId)return;send(phone,{event:'clearAudio',streamId});if(responseActive){send(ai,{type:'response.cancel'});responseActive=false;}if(outputStarted){send(ai,{type:'conversation.item.truncate',item_id:itemId,content_index:0,audio_end_ms:Math.max(0,Math.min(Date.now()-outputStarted,Math.floor(outputBytes/8)))});}itemId=undefined;},900);}
    if(e.type==='input_audio_buffer.speech_stopped')clearTimeout(interruptionTimer);
    if(e.type==='response.done')responseActive=false;
    if(e.type==='conversation.item.input_audio_transcription.completed'){transcript.push({speaker:'caller',text:e.transcript});save();console.log('Caller transcript received.');}
    if(e.type==='response.output_audio_transcript.done'){transcript.push({speaker:'agent',text:e.transcript});save();console.log('Agent transcript received.');}
    if(e.type==='response.function_call_arguments.done' && e.name==='end_call' && !gate.closing){gate.begin();send(ai,{type:'conversation.item.create',item:{type:'function_call_output',call_id:e.call_id,output:'Call ending. Say one brief goodbye in the current language.'}});endCommandPending=true;fallback=setTimeout(()=>hangup('closing fallback'),20000);}
    if(e.type==='response.done' && endCommandPending){endCommandPending=false;goodbyePending=true;send(ai,{type:'response.create',response:{tool_choice:'none',instructions:'Say one short goodbye in the current language. No questions.'}});}
    if(e.type==='response.done' && gate.closing && e.response.id===closingResponse){gate.queued();send(phone,{event:'checkpoint',streamId,name:'goodbye'});}
    if(e.type==='error'){errors.push({code:e.error?.code,param:e.error?.param});save();console.log('OpenAI event error: '+e.error?.code+'; field: '+(e.error?.param || 'unspecified'));if(!ready)hangup('model session error');}
  });
  ai.on('error',()=>hangup('OpenAI connection failed'));
  ai.on('close',()=>{if(phone.readyState===WebSocket.OPEN)phone.close();});
  phone.on('close',()=>{clearTimeout(hardLimit);clearTimeout(fallback);clearTimeout(interruptionTimer);ai.close();save();console.log('Telephone audio disconnected.');});
  phone.on('error',()=>hangup('telephone stream failed'));
});
async function start() {
  if(started || stopping)throw Error('Phone agent already started or stopped.');
  await checkModelSession();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  started=true;
  console.log('Phone-test server ready on port '+server.address().port+'.');
}
async function call() {
  if(!started || stopping)throw Error('Start the phone agent before calling.');
  if(requested)throw Error('A call was already requested by this agent.');
  requested=true;
  const payload=dialPayload({from,to,publicUrl,token,maxSeconds});
  try {
    const r=await vobiz('/Call/',{method:'POST',body:JSON.stringify(payload)});let j={};try{j=await r.json();}catch{}
    console.log('Outbound test request: HTTP '+r.status);
    if(!r.ok){status='failed';save();complete(getResult());throw Error('Vobiz rejected the call (HTTP '+r.status+').');}
    requestId=j.request_uuid || j.request_id;
    if(status==='idle')status='requested';
    save();console.log('One test call requested. No automatic redial.');return getResult();
  } catch(error) {
    if(status!=='failed'){status='request_unknown';save();complete(getResult());}
    throw error;
  }
}
async function stop() {
  if(stopping)return;
  stopping=true;
  if(requested && !ended)await hangup('test stopped');
  for(const socket of wss.clients)socket.terminate();
  await new Promise(resolve=>wss.close(resolve));
  if(started)await new Promise(resolve=>server.close(resolve));
}
return {start,call,stop,getResult,completed,get localUrl(){return started?'http://127.0.0.1:'+server.address()?.port:null;}};
}
module.exports = {createPhoneAgent};
