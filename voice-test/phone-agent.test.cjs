const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { execFileSync } = require('node:child_process');
const { createPhoneAgent } = require('./phone-agent.cjs');
const {WebSocket}=require('ws');

test('brief background speech preserves playback but sustained speech interrupts once',async()=>{
 const sent=[],played=[];let model,dial;
 const env={OPENAI_API_KEY:'test',VOBIZ_AUTH_ID:'test',VOBIZ_AUTH_TOKEN:'test',VOBIZ_FROM_NUMBER:'+919876543210',TEST_TO_NUMBER:'+919876543211'};
 const factory=()=>{const s=new EventEmitter();s.readyState=1;s.send=raw=>{const e=JSON.parse(raw);sent.push(e);if(e.type==='session.update')queueMicrotask(()=>s.emit('message',JSON.stringify({type:'session.updated'})));};s.close=()=>{s.readyState=3;s.emit('close');};model=s;queueMicrotask(()=>s.emit('open'));return s;};
 const agent=createPhoneAgent({env,port:0,publicUrl:'https://example.com',openAISocketFactory:factory,log:()=>{},saveResult:()=>{},fetchImpl:async(_u,o)=>{dial=JSON.parse(o.body);return {ok:true,status:201,json:async()=>({request_uuid:'test'})};}});
 let phone;const wait=ms=>new Promise(r=>setTimeout(r,ms));const emit=e=>model.emit('message',JSON.stringify(e));
 try{
  await agent.start();await agent.call();const token=new URL(dial.answer_url).pathname.split('/').pop();phone=new WebSocket(agent.localUrl.replace('http','ws')+'/media/'+token);phone.on('message',raw=>played.push(JSON.parse(raw)));await new Promise(r=>phone.once('open',r));phone.send(JSON.stringify({event:'start',start:{streamId:'s',callId:'c',mediaFormat:{encoding:'pcmu',sampleRate:8000}}}));await wait(25);
  const input=sent.find(e=>e.type==='session.update').session.audio.input;
  assert.deepEqual(input.noise_reduction,{type:'near_field'});
  assert.equal(input.turn_detection.interrupt_response,false);
  assert.ok(input.turn_detection.threshold>=0.7);
  emit({type:'response.created',response:{id:'r'}});emit({type:'response.output_audio.delta',item_id:'i',delta:Buffer.alloc(8000).toString('base64')});
  // Speech-stop arrives after the configured 700 ms silence window.
  emit({type:'input_audio_buffer.speech_started'});await wait(740);emit({type:'input_audio_buffer.speech_stopped'});await wait(250);
  assert.equal(played.filter(e=>e.event==='clearAudio').length,0);
  assert.equal(sent.filter(e=>e.type==='response.cancel').length,0);
  emit({type:'input_audio_buffer.speech_started'});await wait(1050);
  assert.equal(played.filter(e=>e.event==='clearAudio').length,1);
  assert.equal(sent.filter(e=>e.type==='response.cancel').length,1);
  assert.equal(sent.filter(e=>e.type==='conversation.item.truncate').length,1);
 }finally{phone?.terminate();await agent.stop();}
});

test('shop call uses supplied opening instead of test greeting',async()=>{
 const sent=[];let dialect;let sockets=0;
 const env={OPENAI_API_KEY:'test',VOBIZ_AUTH_ID:'test',VOBIZ_AUTH_TOKEN:'test',VOBIZ_FROM_NUMBER:'+919876543210',TEST_TO_NUMBER:'+919876543211'};
 function openAISocketFactory(){const s=new EventEmitter();s.readyState=1;s.send=raw=>{const e=JSON.parse(raw);sent.push(e);if(e.type==='session.update')queueMicrotask(()=>s.emit('message',JSON.stringify({type:'session.updated'})));};s.close=()=>{s.readyState=3;s.emit('close');};sockets++;queueMicrotask(()=>s.emit('open'));return s;}
 const agent=createPhoneAgent({env,port:0,publicUrl:'https://example.com',openingInstructions:'Ask whether the lavender phone is in stock.',openAISocketFactory,log:()=>{},saveResult:()=>{},fetchImpl:async(url,options)=>{if(options.method==='POST')dialect=JSON.parse(options.body);return {ok:true,status:201,json:async()=>({request_uuid:'test'})};}});
 try{await agent.start();await agent.call();const token=new URL(dialect.answer_url).pathname.split('/').pop();const socket=new WebSocket(agent.localUrl.replace('http','ws')+'/media/'+token);await new Promise(resolve=>socket.once('open',resolve));socket.send(JSON.stringify({event:'start',start:{streamId:'s',callId:'c',mediaFormat:{encoding:'pcmu',sampleRate:8000}}}));await new Promise(resolve=>setTimeout(resolve,25));assert.equal(sent.find(e=>e.type==='response.create').response.instructions,'Ask whether the lavender phone is in stock.');socket.terminate();}finally{await agent.stop();}
});

test('importing the reusable function does not start a server or place a call', () => {
  assert.equal(execFileSync(process.execPath,['-e',`require(${JSON.stringify(require.resolve('./phone-agent.cjs'))}); console.log('idle')`],{timeout:3000}).toString().trim(),'idle');
});
test('one agent instance places one call and returns its completed result', async () => {
  const requests=[];
  const env={OPENAI_API_KEY:'test',OPENAI_VOICE_MODEL:'gpt-realtime-2.1-mini',VOBIZ_AUTH_ID:'test',VOBIZ_AUTH_TOKEN:'test',VOBIZ_FROM_NUMBER:'919876543210',TEST_TO_NUMBER:'919876543211',PHONE_TEST_MAX_SECONDS:'300'};
  function openAISocketFactory(){const socket=new EventEmitter();socket.readyState=1;socket.send=()=>queueMicrotask(()=>socket.emit('message',JSON.stringify({type:'session.updated'})));socket.close=()=>{socket.readyState=3;socket.emit('close');};queueMicrotask(()=>socket.emit('open'));return socket;}
  const agent=createPhoneAgent({env,to:'+919876543212',publicUrl:'https://example.com',port:0,log:()=>{},saveResult:()=>{},openAISocketFactory,fetchImpl:async(url,options)=>{requests.push({url,payload:JSON.parse(options.body)});return {ok:true,status:201,json:async()=>({request_uuid:'request-test'})};}});
  await assert.rejects(agent.call(),/Start the phone agent/);
  try {
    await agent.start();
    assert.equal(requests.length,0);
    const requested=await agent.call();
    assert.equal(requested.requestId,'request-test');
    assert.equal(requests[0].payload.to,'+919876543212');
    assert.equal(requests[0].payload.time_limit,300);
    await assert.rejects(agent.call(),/already requested/);
    assert.equal(requests.length,1);
    const statusUrl=requests[0].payload.hangup_url.replace('https://example.com',agent.localUrl);
    const response=await fetch(statusUrl,{method:'POST',body:new URLSearchParams({CallStatus:'completed',Duration:'151'})});
    assert.equal(response.status,200);
    const result=await agent.completed;
    assert.equal(result.status,'completed');
    assert.equal(result.durationSeconds,151);
    result.transcript.push({speaker:'caller',text:'mutation'});
    assert.equal(agent.getResult().transcript.length,0);
  } finally {await agent.stop();}
});
