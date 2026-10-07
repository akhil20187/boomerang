import {useRef,useState} from 'react';
import {useMutation,useQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {customerError} from './errors';
import {VoicePlayer} from './VoicePlayer';
import type {TaskView} from './types';
import './testCalls.css';

type Trial={taskId:string;createdAt:number;state:string;phone:string;active:boolean};
export type TrialStatus={limit:number;used:number;remaining:number;callingAvailable:boolean;calls:Trial[]};
export function TestCalls(){
 const status=useQuery(makeFunctionReference<'query'>('testCalls:status'),{}) as TrialStatus|undefined;
 const start=useMutation(makeFunctionReference<'mutation'>('testCalls:start'));
 const [selected,setSelected]=useState(new URLSearchParams(location.search).get('test')||'');
 const request=useRef<{phone:string;key:string}|undefined>(undefined);
 return <><TestCallsView status={status} onSelect={setSelected} onCall={async phone=>{
  if(!request.current||request.current.phone!==phone)request.current={phone,key:crypto.randomUUID()};
  const result=await start({phone,ownNumberConfirmed:true,idempotencyKey:request.current.key});
  request.current=undefined;setSelected(result.taskId);
  history.replaceState(null,'',`/app?test=${encodeURIComponent(result.taskId)}`);
 }}/>{selected&&status?.calls.some(c=>c.taskId===selected)&&<TestCallResult taskId={selected}/>}</>;
}
export function TestCallsView({status,onCall,onSelect}:{status?:TrialStatus;onCall:(phone:string)=>Promise<void>;onSelect:(taskId:string)=>void}){
 const [expanded,setExpanded]=useState(false),[phone,setPhone]=useState(''),[own,setOwn]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=status?.calls.some(c=>c.active),exhausted=status?.remaining===0;
 return <section className="test-call card" aria-labelledby="test-call-heading">
  <div className="test-call-heading"><div><h2 id="test-call-heading">Try a call to yourself</h2><p>Hear how Boomerang asks a shop for answers.</p></div><button type="button" aria-expanded={expanded} aria-controls="test-call-form" onClick={()=>setExpanded(!expanded)}>{expanded?'Close':'Try it'}</button></div>
  <p className="test-call-allowance" role="status">{status?`${status.remaining} of ${status.limit} free test calls left`:'Checking your test-call allowance…'}</p>
  {expanded&&<div id="test-call-form" className="test-call-body">
   <p>You play the shopkeeper. We’ll ask about an iPhone 17, 256 GB in lavender: stock, final price and card offers. Speak in English, Hindi or Telugu, or switch languages during the call.</p>
   {exhausted?<p className="test-call-limit">You’ve used your five free test calls. You can still find and call real shops below using your account credit.</p>:<form onSubmit={async e=>{
    e.preventDefault();if(!own||busy||active||!status?.remaining)return;setBusy(true);setError('');
    try{await onCall(phone.trim());}catch(e){setError(customerError(e,'Couldn’t confirm the call request. Try again to check the same request.'));}finally{setBusy(false);}
   }}>
    <label htmlFor="test-phone">Your mobile number<input id="test-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" required maxLength={40} value={phone} onChange={e=>{setPhone(e.target.value);setOwn(false)}} disabled={busy||active} aria-describedby="test-phone-help"/></label>
    <p id="test-phone-help" className="muted">Indian mobile numbers only. The call comes from +91 79654 80585.</p>
    <label className="test-own-number"><input type="checkbox" checked={own} required disabled={busy||active} onChange={e=>setOwn(e.target.checked)}/><span>This is my number, and I agree to receive this test call and have it recorded.</span></label>
    <button className="primary" disabled={!status||!status.callingAvailable||!own||!phone.trim()||busy||active}>{busy?'Requesting your call…':active?'Test call in progress':'Call me'}</button>
    {status&&!status.callingAvailable&&<p role="status">Test calls are temporarily unavailable. Your allowance hasn’t changed.</p>}
    <p className="test-call-small">Free, with no credit deducted. Each request uses one test, including missed calls. No automatic redial. Calls can last up to five minutes.</p>
    <p className="error" role="alert">{error}</p>
   </form>}
  </div>}
  {!!status?.calls.length&&<div className="test-call-history"><h3>Your test calls</h3>{status.calls.map((call,i)=><button type="button" key={call.taskId} onClick={()=>onSelect(call.taskId)}><span>Test {status.used-i} · •••• {call.phone.slice(-4)}</span><span className={call.active?'blue':'muted'}>{call.active?'In progress':'View results'} <span aria-hidden="true">›</span></span></button>)}</div>}
 </section>;
}
export function TestCallResult({taskId}:{taskId:string}){
 const data=useQuery(makeFunctionReference<'query'>('tasks:get'),{taskId}) as TaskView|undefined;
 const playback=useMutation(makeFunctionReference<'mutation'>('recordings:playback'));
 if(!data)return <p className="loading" role="status">Loading your test call…</p>;
 if(!data.task.selfTest)return null;
 const shop=data.shops[0],attempt=shop?.attempts?.at(-1),active=!['finished','error'].includes(data.task.status);
 const label=active?(shop?.state==='reconciling'?'Checking the call status. We won’t redial.':shop?.state==='waiting'?'Waiting for an available calling line…':'Calling your mobile. Please answer and play the shopkeeper.'):shop?.state==='unreachable'?'No conversation captured. You can request another test if you have calls left.':shop?.state==='technical_error'?'The call could not finish. No account credit was charged.':'Test call finished';
 return <section className="test-call-result card" aria-label="Your test call result"><h2>Your test call</h2><p className={active?'blue':'muted'} role="status">{label}</p><p className="test-call-small">Personal rehearsal · no real shop was called · no credit charged</p>
  {shop?.answer&&<><h3>Answers from your rehearsal</h3><dl className="test-call-answers"><div><dt>Stock</dt><dd>{shop.answer.stock==='available'?'Available':shop.answer.stock==='unavailable'?'Unavailable':'Unconfirmed'}</dd></div><div><dt>Final price</dt><dd>{shop.answer.finalPrice!==undefined?'₹'+shop.answer.finalPrice.toLocaleString('en-IN'):'Unconfirmed'}</dd></div><div><dt>Offers</dt><dd>{shop.answer.offers||'Unconfirmed'}</dd></div></dl>{shop.answer.notes&&<p>{shop.answer.notes}</p>}</>}
  {attempt&&<><h3>Recording</h3>{attempt.recordingAvailable?<VoicePlayer duration={attempt.durationSeconds||0} attemptId={attempt._id} calledAt={attempt.startedAt} loadRecording={async attemptId=>await playback({attemptId})} statusUrl={`/app?test=${encodeURIComponent(taskId)}`}/>:<p className="muted">{active?'Recording will appear after the call.':'The recording will appear here when available.'}</p>}<details className="task-transcript"><summary>View transcript</summary>{Array.isArray(attempt.transcript)&&attempt.transcript.length?attempt.transcript.map((line,i)=><p key={i}><strong>{['user','caller'].includes(line.speaker)?'You':'Boomerang'}: </strong>{line.text}</p>):<p className="muted">No transcript available yet.</p>}</details></>}
  <p className="test-call-small">Only you can access these test-call results and recordings.</p>
 </section>;
}
