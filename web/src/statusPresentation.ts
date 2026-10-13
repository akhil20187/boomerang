/** Shared status wording and colours (DESIGN.md "one meaning per colour") for the call card, task pages, sidebar and call log. */
import type {Shop,TaskSummary} from './types';
import {itemsStatus,taskDate,taskLabel,taskOutcome,type ChargeNote} from './taskPresentation.ts';
import {count} from './chatPresentation.ts';
export type Tone='green'|'blue'|'amber'|'grey'|'error';
export const rupees=(n:number)=>'₹'+n.toLocaleString('en-IN');
export const clock=(t:number)=>new Date(t).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}).toLowerCase();
/** Shop states after which no more calls happen for that shop. */
export const terminal=new Set(['answered','unreachable','personal_call_needed','incomplete_answer','technical_error','completed','failed']);
/** A service / brief task (supplied contacts, or answers with questions): its wording follows the questions, never stock. */
export const isBriefTask=(supplied:boolean,shops:Shop[])=>supplied||shops.some(s=>!!s.answer?.items?.length);
/** One status line per shop on the call card (chat card, website card, call log). `brief`: never stock wording. A shop that prefers a personal call never also reads "In stock". */
export function shopStatus(s:Shop,brief=false):[string,Tone]{if(s.state==='reconciling')return ['Call status unconfirmed · checking provider','amber'];if(s.state==='personal_call_needed')return ['Prefers a personal call','amber'];const byItems=(s.state==='answered'||s.state==='incomplete_answer')&&itemsStatus(s.answer?.items);if(byItems)return byItems as [string,Tone];if(!brief&&s.answer?.stock==='available')return [`In stock${s.answer.finalPrice!==undefined?' · '+rupees(s.answer.finalPrice):''}`,'green'];if(!brief&&s.answer?.stock==='unavailable')return ['No stock','grey'];switch(s.state){case'calling':return ['AI agent calling','blue'];case'retry_scheduled':return ['No answer · retry scheduled','amber'];case'unreachable':return ['Couldn’t reach · 2 attempts','amber'];case'incomplete_answer':return ['Partial answer · details unconfirmed','amber'];case'technical_error':return ['Call interrupted · try again','error'];case'answered':return brief?['Answered · see notes','grey']:['Answered · stock unconfirmed','grey'];default:return ['Waiting to call','grey']}}
/** Status line on the full task page (/status). Kept word-for-word from the previous TaskDetails. */
export function taskPageStatus(s:Shop):[string,Tone]{if(s.state==='reconciling')return ['Call status unconfirmed · checking provider','amber'];if(s.state==='calling')return ['AI agent calling','blue'];if(s.state==='waiting')return ['Waiting to call','grey'];if(s.state==='retry_scheduled')return ['No answer · retry scheduled','amber'];if(s.state==='personal_call_needed')return ['Prefers a personal call','amber'];if(s.state==='unreachable')return ['Couldn’t reach the shop','amber'];if(s.state==='technical_error')return ['Call interrupted','error'];const byItems=(s.state==='answered'||s.state==='incomplete_answer')&&itemsStatus(s.answer?.items);if(byItems)return byItems as [string,Tone];if(s.answer?.stock==='available')return [`In stock${s.answer.finalPrice!==undefined?' · '+rupees(s.answer.finalPrice):''}`,'green'];if(s.answer?.stock==='unavailable')return ['No stock','grey'];return ['Some details unconfirmed','amber']}
/** Timeline marks: ✓ ok, • live, ! warn, … wait, × fail. */
export type StepKind='ok'|'live'|'warn'|'wait'|'fail';
export const stepMark:Record<StepKind,string>={ok:'✓',live:'•',warn:'!',wait:'…',fail:'×'};
export function stepKind(text:string,live:boolean):StepKind{if(live)return 'live';if(/no answer|busy|not in service|unreachable|couldn|fail|interrupt/i.test(text))return 'fail';if(/person|ended the call|hung up|refus/i.test(text))return 'warn';if(/retry|try once more|scheduled|waiting|requested|start|best to call/i.test(text))return 'wait';return 'ok'}
/** Chips above the call card. Stock chips follow each shop's status line; a brief task counts answers instead of stock. */
export function summaryTags(shops:Shop[],brief=false):[string,Tone][]{const count=(test:(s:Shop)=>boolean)=>shops.filter(test).length;const line=(s:Shop)=>shopStatus(s,brief)[0];const answers:[number,string,Tone][]=brief?[[count(s=>line(s)==='Answered your questions'),'answered','green'],[count(s=>(s.state==='answered'||s.state==='incomplete_answer')&&line(s)!=='Answered your questions'),'partly answered','amber']]:[[count(s=>line(s).startsWith('In stock')),'in stock','green'],[count(s=>line(s)==='No stock'),'no stock','grey']];const tags:[number,string,Tone][]=[...answers,[count(s=>s.state==='calling'),'calling','blue'],[count(s=>s.state==='personal_call_needed'),'prefer a personal call','amber'],[count(s=>s.state==='retry_scheduled'),'retrying','amber'],[count(s=>s.state==='unreachable'),'couldn’t reach','amber'],[count(s=>line(s)==='Waiting to call'),'waiting','grey']];return tags.filter(([n])=>n>0).map(([n,text,color])=>[`${n} ${n===1&&text==='prefer a personal call'?'prefers a personal call':text}`,color])}
/** Where a call card is shown: the Boomerang website (chat, /app) or the ChatGPT/Claude widget. */
export type CardPlace='website'|'assistant';
/**
 * Call card footer link (DESIGN.md "Call card"). Website: "See full call details" to /status on this site, same tab,
 * no external icon. Assistant widget: "Open full results on website" to the public site, with the external icon.
 * The demo card stays on /demo.
 */
export function resultsLink({place,taskId,done,origin,publicUrl}:{place:CardPlace;taskId:string;done:boolean;origin:string;publicUrl?:string}):{href:string;text:string;external:boolean}{
 const path=`/status?task=${encodeURIComponent(taskId)}`;
 if(place==='website')return {href:taskId==='demo'?'/demo':origin+path,text:done?'See full call details':'See live call details',external:false};
 return {href:taskId==='demo'?'/demo':(publicUrl||origin)+path,text:done?'Open full results on website':'Open live status on website',external:true};
}
/** /status "Back" link: the chat the task was started from, else the Call log. */
export function taskBackLink(chatId:string|null):{href:string;text:string}{return chatId?{href:`/app?chat=${encodeURIComponent(chatId)}`,text:'Back to chat'}:{href:'/calls',text:'Back to Call log'}}
/** Call card headline. Counts read "1 business called", never "1 businesses". */
export function callCardTitle({shops,noun,done,brief}:{shops:Shop[];noun:string;done:boolean;brief:boolean}){
 const n=shops.length;const resolved=shops.filter(s=>terminal.has(s.state||'')).length;
 if(brief)return done?`${count(n,noun)} called`:`${resolved} of ${count(n,noun)} done`;
 if(!done)return resolved?`${resolved} of ${count(n,'shops')} done`:`Calling ${count(n,'shops')}…`;
 const available=shops.filter(s=>shopStatus(s)[0].startsWith('In stock')).length;
 if(available)return `${count(n,'shops')} called · ${available} ${available===1?'has':'have'} it`;
 if(shops.every(s=>s.state==='unreachable'))return n===1?'Couldn’t reach the shop. You haven’t been charged.':`Couldn’t reach any of the ${n} shops. You haven’t been charged.`;
 if(shops.every(s=>s.answer?.stock==='unavailable'))return 'No stock found at the shops we called.';
 return `${count(n,'shops')} checked · some details unconfirmed`;
}
/** Shop prepared for the opened-call view: clock times and plain variant wording. Safe to apply twice. */
export function displayShop(s:Shop):Shop{return {...s,timeline:s.timeline?.map(e=>({...e,time:typeof e.time==='number'?clock(e.time):e.time})),answer:s.answer?{...s.answer,variantMatch:s.answer.variantMatch==='yes'?'Confirmed':s.answer.variantMatch==='no'?'Different variant':s.answer.variantMatch==='unconfirmed'?'Unconfirmed':s.answer.variantMatch}:undefined}}

/** One row of `api.callLog.log` (one call attempt). Only the fields the opened-call view reads. */
export type CallLogRow={attemptId:string;taskId:string;businessName:string;area?:string;phone?:string;address?:string;mapsUrl?:string;source?:'supplied'|'google';contactSource?:'customer'|'assistant';sourceUrl?:string;state?:string;startedAt?:number;durationSeconds?:number;recordingAvailable?:boolean;answer?:Shop['answer']|null;timeline?:{text:string;time:number|string}[];chargeNote?:ChargeNote;/** the questions this try asked (brief tasks) */askedItems?:{id:string;text:string;kind:string}[];/** brief (service) task: wording follows the questions, never stock */briefTask?:boolean};
/** Props for <CallDetail> from a call-log row. The row's own try (not the job's latest) supplies the recording, answer and timeline. */
/** A brief try's answer always carries its questions, so the status reads "Answered 2 of 3 questions", never "stock". */
export function briefAnswer(row:CallLogRow):Shop['answer']|undefined{const answer=row.answer??undefined;const asked=row.askedItems??[];if(!asked.length||answer?.items?.length)return answer;if(!answer&&row.state!=='answered'&&row.state!=='incomplete_answer')return answer;return {...(answer??{stock:'unconfirmed'}),items:asked.map(i=>({...i,status:'not_answered'}))} as Shop['answer']}
/** Brief tasks whose answer has no questions at all: never "stock" wording. */
export function briefStatus(line:[string,Tone],briefTask?:boolean):[string,Tone]{if(!briefTask)return line;return line[0]==='Answered · stock unconfirmed'?['Answered · see notes','grey']:line}
export function callLogDetail(row:CallLogRow):{shop:Shop;supplied:boolean;taskId:string}{return {taskId:row.taskId,supplied:row.source==='supplied',shop:{placeId:row.attemptId,name:row.businessName,area:row.area,phone:row.phone,address:row.address,mapsUrl:row.mapsUrl,source:row.contactSource,sourceUrl:row.sourceUrl,state:row.state,answer:briefAnswer(row),timeline:row.timeline,recordingAvailable:!!row.recordingAvailable,latestAttemptId:row.attemptId,calledAt:row.startedAt,durationSeconds:row.durationSeconds,chargeNote:row.chargeNote}}}

/** Sidebar / phone menu groups from the first page of `tasks.history`. */
export type SidebarTask={id:string;label:string;href:string;status:[string,Tone];live:boolean;supplied:boolean};
export type SidebarGroup={heading:'Live now'|'Today'|'Needs you'|'Earlier';tasks:SidebarTask[]};
export function sidebarTask(t:TaskSummary):SidebarTask{const live=t.summary.active;const status:[string,Tone]=t.selfTest?[live?'Test call in progress':'Test call finished',live?'blue':'grey']:taskOutcome(t.summary) as [string,Tone];return {id:t._id,label:taskLabel(t.product?.name||t.title),href:t.selfTest?`/app?test=${encodeURIComponent(t._id)}`:`/status?task=${encodeURIComponent(t._id)}`,status,live,supplied:t.source==='supplied'}}
/** Live now (calls running) · Today · Needs you (finished with an amber outcome or an error) · Earlier. Empty groups are dropped. */
export function sidebarGroups(tasks:TaskSummary[]):SidebarGroup[]{const groups:SidebarGroup[]=[{heading:'Live now',tasks:[]},{heading:'Today',tasks:[]},{heading:'Needs you',tasks:[]},{heading:'Earlier',tasks:[]}];for(const t of tasks){const row=sidebarTask(t);const index=row.live?0:!t.selfTest&&(t.status==='error'||row.status[1]==='amber')?2:taskDate(t.approvedAt??t._creationTime)==='Today'?1:3;groups[index].tasks.push(row)}return groups.filter(g=>g.tasks.length)}
