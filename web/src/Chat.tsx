import {Component,Fragment,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useAction,useMutation,useQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {Icon} from './Icon';
import {customerError} from './errors';
import {CallCard,ListingAttribution,Rating,approvalKey} from './CallCard';
import {TestCallResult,TestCallsView,type TrialStatus} from './TestCalls';
import {formatPaise,CHARGE_RULE} from './taskPresentation';
import {terminal} from './statusPresentation';
import type {Discovery,TaskView} from './types';
import type {RecordingLoader} from './VoicePlayer';
import './chat.css';

import {composerHint,one,count,STARTERS,type ChatItem} from './chatPresentation';
export {STARTERS};
export type {ChatItem};
type ViewProps={items:ChatItem[];thinking:boolean;error:string;onSend:(text:string)=>Promise<boolean>;onTestStarter:()=>void;balanceCents?:number;priceCents?:number|null;loading?:boolean;renderCard:(item:ChatItem,latest:boolean)=>ReactNode};
/** The chat page (mockups Main.dc.html + Desktop.dc.html): message list, cards, and a composer that is always visible. */
export function ChatView({items,thinking,error,onSend,onTestStarter,balanceCents,priceCents,loading,renderCard}:ViewProps){
 const [draft,setDraft]=useState('');const [failed,setFailed]=useState('');const end=useRef<HTMLDivElement>(null);const input=useRef<HTMLInputElement>(null);
 const lastKey=items.length+':'+(items.at(-1)?._id??'')+':'+thinking+':'+!!error;
 useLayoutEffect(()=>{if(items.length||thinking)end.current?.scrollIntoView({block:'end'})},[lastKey]);
 async function submit(text:string){const clean=text.trim();if(!clean||thinking)return;setDraft('');setFailed('');const ok=await onSend(clean);if(!ok){setFailed(clean);setDraft(current=>current||clean)}}
 const price=priceCents??1000;
 return <div className="chat">
  <div className="chat-log" aria-live="polite">
   {loading?<p className="chat-note" role="status">Loading your chat…</p>:!items.length&&!thinking?<div className="chat-empty"><div><h1>What should we call about?</h1><p>Tell us what you need. We find nearby shops or services, call them, and bring the answers back here.</p></div><div className="chat-starters"><button type="button" className="chip" onClick={()=>void submit(STARTERS.service)}>{STARTERS.service}</button><button type="button" className="chip" onClick={()=>void submit(STARTERS.product)}>{STARTERS.product}</button><button type="button" className="chip chip-test" onClick={onTestStarter}><span>{STARTERS.test}</span><span className="chip-note">Free</span></button></div>{balanceCents!==undefined&&<p className="chat-credit">You have {formatPaise(balanceCents)} credit{price>0?`, about ${Math.floor(Math.max(0,balanceCents)/price)} answers`:''}. You pay {formatPaise(price)} only when a shop answers what you asked.</p>}</div>:null}
   {items.map((item,i)=>{const latest=i===items.length-1;if(item.role==='user')return <div key={item._id} className="bubble-user">{item.text}</div>;if(item.kind==='text')return <div key={item._id} className="bubble-assistant">{item.text}</div>;if(item.kind==='question')return <QuestionCard key={item._id} item={item} open={latest&&!thinking} onChoice={c=>void submit(c)}/>;if(item.kind==='brief')return <BriefBox key={item._id} item={item}/>;return <Fragment key={item._id}>{renderCard(item,latest)}</Fragment>})}
   {thinking&&<p className="chat-thinking" role="status"><span className="pulse" aria-hidden="true"/>Thinking…</p>}
   {error&&<div className="chat-error" role="alert"><p>{error}</p>{failed&&<button type="button" onClick={()=>void submit(draft.trim()||failed)}>Try again</button>}</div>}
   <div ref={end}/>
  </div>
  <form className="composer" onSubmit={e=>{e.preventDefault();void submit(draft)}}>
   <label htmlFor="chat-input" className="visually-hidden">Your message</label>
   <input id="chat-input" ref={input} value={draft} maxLength={2000} autoComplete="off" onChange={e=>setDraft(e.target.value)} placeholder={composerHint(items)}/>
   <button type="submit" className="send" aria-label="Send" disabled={thinking||!draft.trim()}><Icon name="send" size={18}/></button>
  </form>
 </div>
}
function QuestionCard({item,open,onChoice}:{item:ChatItem;open:boolean;onChoice:(choice:string)=>void}){const p=item.payload||{};const choices=p.choices||[];return <div className="question-card">{p.index!==undefined&&<p className="question-count">Question {p.index}{p.total?` of ${p.total}`:''}</p>}<p className="question-text">{p.question||item.text}</p>{open&&choices.length>0&&<div className="choices">{choices.map(c=><button type="button" key={c} className="choice" onClick={()=>onChoice(c)}>{c}</button>)}</div>}{open&&<p className="question-hint">Or type your own answer below{choices.length?'. “Don’t know” is fine.':'.'}</p>}</div>}
function BriefBox({item}:{item:ChatItem}){const questions=item.payload?.questions||[];return <div className="brief-box"><p className="brief-head">We’ll ask each {one(item.payload?.noun||'businesses')}</p><ol>{questions.map((q,i)=><li key={i}>{q}</li>)}</ol><p className="brief-note">We share only what changes their answer. No address or booking.</p></div>}

/** Business picker inside the chat: rows, tick boxes, and the price + Call button inside the card (spec step 4). */
export function ChatPicker({data,noun,busy,error,onCall,onWiden}:{data:Discovery;noun:string;busy:boolean;error?:string;onCall:(selected:string[])=>void;onWiden?:()=>void}){
 const [selected,setSelected]=useState<string[]>([]);const [visible,setVisible]=useState(5);const shown=data.shops.slice(0,visible);
 const price=data.answerPriceCents;const blocked=data.callingAvailable===false||price==null;const available=data.availableCents??undefined;
 const affordable=price&&available!==undefined?Math.floor(Math.max(0,available)/price):null;const short=affordable!==null&&selected.length>affordable;
 const toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);
 const rule=noun==='shops'?CHARGE_RULE:CHARGE_RULE.replace(/a shop/g,'a '+one(noun));
 return <section className="card chat-card chat-picker" aria-label={`${noun} to call`}>
  <div className="chat-card-head"><h2>{data.shops.length} {noun} near {data.pincode}</h2><p>{data.shops.length?'Pick who we call. Highest rated first.':'Nothing found nearby yet.'}</p></div>
  {!data.shops.length?<div className="chat-card-body"><p>No {noun} near {data.pincode} came up. Search a wider area?</p><button type="button" onClick={onWiden} disabled={!onWiden||busy}>Search up to 20 km</button></div>:<>
   <div className="chat-rows">{shown.map(s=>{const on=selected.includes(s.placeId);return <button type="button" key={s.placeId} className="chat-row" aria-pressed={on} onClick={()=>toggle(s.placeId)} disabled={busy}><span className="tick" aria-hidden="true">{on&&<Icon name="check"/>}</span><span className="chat-row-text"><span className="shop-name">{s.name}{s.area&&` · ${s.area}`}</span><span className="chat-row-meta"><Rating shop={s}/>{s.distanceKm!==undefined&&` · ${s.distanceKm.toFixed(1)} km`} · <span className={s.hours?'':'amber'}>{s.hours||'Hours unknown'}</span></span></span></button>})}</div>
   {visible<data.shops.length&&<div className="chat-card-body"><button type="button" className="show-more" onClick={()=>setVisible(visible+5)}><Icon name="plus"/>Show {Math.min(5,data.shops.length-visible)} more</button></div>}
   <div className="chat-card-foot">
    {blocked?<p className="blocked">{data.callingUnavailableMessage||'Calling is not available yet. Calls cannot start.'}</p>:<div className="chat-price"><p><span>{selected.length?<><strong>Up to {formatPaise(price*selected.length)}</strong> for {count(selected.length,noun)} · </>:null}{formatPaise(price)} per answer</span>{available!==undefined&&!short&&<span className="grey">You have {formatPaise(available)}</span>}</p>{short&&<p className="blocked">You have {formatPaise(available??0)}, enough for {count(affordable??0,noun)}. Pick fewer {noun}.</p>}</div>}
    <button type="button" className="primary" disabled={!selected.length||busy||blocked||short} onClick={()=>onCall(selected)}>{busy?`Starting calls to ${count(selected.length,noun)}…`:selected.length?`Call ${count(selected.length,noun)}`:`Pick ${noun} to call`}</button>
    <p className="small-print">{rule} {noun==='shops'?'A listing doesn’t confirm stock.':'A listing doesn’t confirm they’re free.'}</p>
    {error&&<p className="error" role="alert">{error}</p>}
    {data.attribution==='Google Maps'&&<ListingAttribution/>}
   </div>
  </>}
 </section>
}

/** Live call card in the chat, then a short summary line and next-step chips when everything is done (spec step 6). */
export function ChatCalls({data,taskId,noun,latest,loadRecording,onMore,onNew}:{data:TaskView;taskId:string;noun:string;latest:boolean;loadRecording?:RecordingLoader;onMore:()=>void;onNew:()=>void}){
 const done=data.task.status==='finished'||data.task.status==='error';const shops=data.shops;
 const answered=shops.filter(s=>s.state==='answered'||s.state==='incomplete_answer').length;const resolved=shops.filter(s=>terminal.has(s.state||'')).length;
 return <><CallCard data={data} taskId={taskId} noun={noun} loadRecording={loadRecording}/>{done&&<div className="bubble-assistant">{answered?`${count(answered,noun)} of ${shops.length} answered. Open a row to see what they said and hear the call.`:`None of the ${count(shops.length,noun)} could answer this time. You haven’t been charged for them.`}</div>}{done&&latest&&<div className="choices"><button type="button" className="choice" onClick={onMore}>Call more {noun}</button><button type="button" className="choice" onClick={onNew}>New request</button></div>}{!done&&<span className="visually-hidden" role="status">{resolved} of {shops.length} done</span>}</>
}

/** A card that failed to load (expired search, missing task) shows a plain message instead of breaking the chat. */
class CardBoundary extends Component<{children:ReactNode;fallback:string},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<p className="chat-note">{this.props.fallback}</p>:this.props.children}}

const sendRef=makeFunctionReference<'action'>('chat:send');
const messagesRef=makeFunctionReference<'query'>('chat:messages');
const attachRef=makeFunctionReference<'mutation'>('chat:attachTask');
const testCardRef=makeFunctionReference<'mutation'>('chat:startTestCard');
const attachTestRef=makeFunctionReference<'mutation'>('chat:attachTestCall');
const draftRef=makeFunctionReference<'query'>('drafts:get');
const taskRef=makeFunctionReference<'query'>('tasks:get');
const startRef=makeFunctionReference<'mutation'>('tasks:start');
const meRef=makeFunctionReference<'query'>('users:me');
const playbackRef=makeFunctionReference<'mutation'>('recordings:playback');
const trialRef=makeFunctionReference<'query'>('testCalls:status');
const trialStartRef=makeFunctionReference<'mutation'>('testCalls:start');

/** Signed-in /app chat. `/app?chat=<id>` reopens a saved chat. */
export function LiveChat(){
 const [chatId,setChatId]=useState<string|undefined>(new URLSearchParams(location.search).get('chat')||undefined);
 const data=useQuery(messagesRef,chatId?{chatId}:'skip') as {messages:ChatItem[]}|undefined;
 const me=useQuery(meRef,{});const send=useAction(sendRef);const startTest=useMutation(testCardRef);
 const [thinking,setThinking]=useState(false);const [pending,setPending]=useState<{text:string;after:number}>();const [error,setError]=useState('');
 const items=data?.messages??[];
 const open=(id:string)=>{setChatId(id);history.replaceState(null,'',`/app?chat=${encodeURIComponent(id)}`)};
 async function onSend(text:string){setThinking(true);setError('');setPending({text,after:items.length});try{const out=await send({chatId,text});if(out.chatId!==chatId)open(out.chatId);return true}catch(e){setError(customerError(e,'Couldn’t send that. Try again.'));return false}finally{setThinking(false);setPending(undefined)}}
 const shown=pending&&!items.slice(pending.after).some(i=>i.role==='user'&&i.text===pending.text)?[...items,{_id:'pending',role:'user' as const,kind:'text' as const,text:pending.text}]:items;
 return <ChatView items={shown} thinking={thinking} error={error} loading={!!chatId&&data===undefined} balanceCents={me?.availableCents} priceCents={me?.answerPriceCents} onSend={onSend}
  onTestStarter={async()=>{setError('');try{const out=await startTest(chatId?{chatId}:{});if(out.chatId!==chatId)open(out.chatId)}catch(e){setError(customerError(e,'Couldn’t open the test call. Try again.'))}}}
  renderCard={(item,latest)=><CardBoundary fallback={item.kind==='picker'?'This list has expired. Ask again to search for current listings.':'This card couldn’t load. Open it from your tasks.'}>{item.kind==='picker'?<LivePicker item={item} chatId={chatId!} onSend={onSend}/>:item.kind==='calls'?<LiveCalls item={item} latest={latest} onSend={onSend}/>:item.kind==='test_call'?<LiveTestCall item={item} chatId={chatId!}/>:null}</CardBoundary>}/>
}
function LivePicker({item,chatId,onSend}:{item:ChatItem;chatId:string;onSend:(text:string)=>Promise<boolean>}){
 const noun=item.payload?.noun||'businesses';const folded=!!item.payload?.taskId;
 const draft=useQuery(draftRef,!folded&&item.payload?.draftId?{draftId:item.payload.draftId}:'skip') as any;
 const start=useMutation(startRef);const attach=useMutation(attachRef);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 if(folded)return null;
 if(!draft)return <p className="chat-note" role="status">Loading {noun}…</p>;
 const discovery:Discovery={...draft,draftId:draft._id};
 return <ChatPicker data={discovery} noun={noun} busy={busy} error={error} onWiden={()=>void onSend('Search up to 20 km')} onCall={async selected=>{setBusy(true);setError('');try{const {taskId}=await start({draftId:discovery.draftId,selectedPlaceIds:selected,expectedAnswerPriceCents:discovery.answerPriceCents,idempotencyKey:approvalKey(discovery.draftId,selected,discovery.answerPriceCents),...(draft.briefId?{briefId:draft.briefId}:{})});await attach({chatId,taskId})}catch(e){setError(customerError(e,'Calls couldn’t start. You haven’t been charged. Try again.'))}finally{setBusy(false)}}}/>
}
function LiveCalls({item,latest,onSend}:{item:ChatItem;latest:boolean;onSend:(text:string)=>Promise<boolean>}){
 const taskId=item.payload?.taskId!;const data=useQuery(taskRef,{taskId}) as TaskView|undefined;const playback=useMutation(playbackRef);const noun=item.payload?.noun||'shops';
 if(!data)return <p className="chat-note" role="status">Starting calls…</p>;
 return <ChatCalls data={data} taskId={taskId} noun={noun} latest={latest} loadRecording={async attemptId=>await playback({attemptId})} onMore={()=>void onSend(`Call more ${noun}`)} onNew={()=>{location.href='/app'}}/>
}
function LiveTestCall({item,chatId}:{item:ChatItem;chatId:string}){
 const status=useQuery(trialRef,{}) as TrialStatus|undefined;const start=useMutation(trialStartRef);const attach=useMutation(attachTestRef);const key=useRef<{phone:string;key:string}>(undefined);
 const taskId=item.payload?.taskId;
 return <div className="chat-test"><div className="bubble-assistant">{item.text}</div>{taskId?<TestCallResult taskId={taskId}/>:<TestCallsView status={status} defaultExpanded onSelect={()=>{}} onCall={async phone=>{if(!key.current||key.current.phone!==phone)key.current={phone,key:crypto.randomUUID()};const result=await start({phone,ownNumberConfirmed:true,idempotencyKey:key.current.key});key.current=undefined;await attach({chatId,messageId:item._id,taskId:result.taskId})}}/>}</div>
}
