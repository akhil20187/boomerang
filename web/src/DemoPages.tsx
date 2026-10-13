import {signedOutUrl} from './signInPresentation';
import {useEffect,useRef,useState} from 'react';
import {CallLogView} from './CallLog';
import {ConnectView} from './ConnectAssistant';
import {AccountView,type MoneyRow} from './AccountPage';
import type {HistoryFilter} from './accountPresentation';
import {sampleRecording} from './demo';
import type {LogRow} from './callLogPresentation';
import type {AnswerItem} from './types';

/** /demo pages for the call log, connect and account (sample data, no backend, no calls). */
const minute=60000,day=86400000;
function at(daysAgo:number,h:number,m:number){const d=new Date(Date.now()-daysAgo*day);d.setHours(h,m,0,0);return d.getTime()}
const item=(id:string,text:string,status:AnswerItem['status'],answer?:string,kind:AnswerItem['kind']='must_confirm'):AnswerItem=>({id,text,kind,status,answer});
const plumber='Plumber in Gachibowli',iphone='iPhone 17 256GB near 500037',notary='Notary in Balanagar';
const charged={kind:'charged' as const,amountCents:1000};
const free=(reason:string)=>({kind:'not_charged' as const,amountCents:1000,reason});
const steps=(start:number,...texts:[string,number][])=>texts.map(([text,offset])=>({text,time:start+offset*minute}));
export function demoLogRows():LogRow[]{const t0=Math.min(Date.now()-10*minute,at(0,16,4));return ([
 {attemptId:'d1',taskId:'demo',businessName:'Sri Sai Plumbing Works',area:'Gachibowli',taskLabel:plumber,phone:'+91 00000 00001',address:'Plot 12, Gachibowli Main Road, Hyderabad 500032',mapsUrl:'https://www.google.com/maps/search/?api=1&query=Gachibowli+Hyderabad',source:'google',attemptNumber:1,isLatestAttempt:true,state:'answered',startedAt:t0,durationSeconds:102,recordingAvailable:true,answer:{stock:'unconfirmed',items:[item('q1','Can you come to Gachibowli today?','answered','“Yes, at 4 pm.”'),item('q2','Visit charge?','answered','“₹200 for the visit.”'),item('q3','Cost to fix the tap?','conditional','“Usually ₹150 to ₹300, parts extra.”','deciding')]},timeline:steps(t0,['AI called on your behalf',0],['Shop answered · notes saved',2]),chargeNote:charged},
 {attemptId:'d2',taskId:'demo',businessName:'Quick Fix Plumbers',area:'Kondapur',taskLabel:plumber,phone:'+91 00000 00002',address:'Kothaguda X Roads, Kondapur, Hyderabad 500084',source:'google',attemptNumber:2,isLatestAttempt:true,state:'answered',startedAt:t0-minute,durationSeconds:65,recordingAvailable:true,answer:{stock:'unconfirmed',items:[item('q1','Can you come to Gachibowli today?','answered','“Tomorrow morning, not today.”'),item('q2','Visit charge?','answered','“₹150 visit.”'),item('q3','Cost to fix the tap?','not_answered',undefined,'deciding')]},timeline:steps(t0-minute,['Second attempt · AI called on your behalf',0],['Shop answered · notes saved',1]),chargeNote:charged},
 {attemptId:'d3',taskId:'demo',businessName:'Quick Fix Plumbers',area:'Kondapur',taskLabel:plumber,phone:'+91 00000 00002',address:'Kothaguda X Roads, Kondapur, Hyderabad 500084',source:'google',attemptNumber:1,isLatestAttempt:false,attemptStatus:'unanswered',state:'retry_scheduled',startedAt:t0-6*minute,durationSeconds:40,answer:null,timeline:steps(t0-6*minute,['AI called on your behalf',0],['No answer · retry scheduled',1]),chargeNote:free('shop didn’t answer')},
 {attemptId:'d4',taskId:'demo',businessName:'AquaCare Plumbing',area:'Madhapur',taskLabel:plumber,phone:'+91 00000 00003',address:'Ayyappa Society, Madhapur, Hyderabad 500081',source:'google',attemptNumber:1,isLatestAttempt:true,state:'personal_call_needed',startedAt:t0-2*minute,durationSeconds:22,answer:null,timeline:steps(t0-2*minute,['AI called on your behalf',0],['Shop asked to speak to a person',1]),chargeNote:free('shop prefers a personal call')},
 {attemptId:'d5',taskId:'demo',businessName:'Balanagar Notary Office',taskLabel:notary,phone:'+91 00000 00006',address:'Balanagar Main Road, Hyderabad 500042',source:'supplied',contactSource:'assistant',attemptNumber:1,isLatestAttempt:true,state:'personal_call_needed',startedAt:at(2,11,20),durationSeconds:31,answer:null,timeline:steps(at(2,11,19),['AI called on your behalf',0],['Business asked to speak to a person',1]),chargeNote:free('shop prefers a personal call')},
 {attemptId:'d6',taskId:'demo',businessName:'Aptronix',area:'Jubilee Hills',taskLabel:iphone,phone:'+91 00000 00007',address:'Road No. 36, Jubilee Hills, Hyderabad 500033',source:'google',attemptNumber:1,isLatestAttempt:true,state:'answered',startedAt:at(3,18,10),durationSeconds:130,recordingAvailable:true,answer:{stock:'available',finalPrice:75900,offers:'“₹4,000 instant discount on HDFC credit card.”',notes:'Black and blue in stock. Demo recording is a sample tone, not a real call.',variantMatch:'yes'},timeline:steps(at(3,18,10),['AI called on your behalf',0],['Shop answered · notes saved',2]),chargeNote:charged},
 {attemptId:'d7',taskId:'demo',businessName:'Croma',area:'Banjara Hills',taskLabel:iphone,phone:'+91 00000 00008',address:'Road No. 1, Banjara Hills, Hyderabad 500034',source:'google',attemptNumber:1,isLatestAttempt:true,state:'answered',startedAt:at(3,18,9),durationSeconds:75,answer:{stock:'unavailable',notes:'“Not right now. Expected Friday.”'},timeline:steps(at(3,18,9),['AI called on your behalf',0],['Shop answered · notes saved',1]),chargeNote:charged},
 {attemptId:'d8',taskId:'demo',businessName:'Vijay Sales',area:'Ameerpet',taskLabel:iphone,phone:'+91 00000 00009',address:'Ameerpet Main Road, Hyderabad 500016',source:'google',attemptNumber:2,isLatestAttempt:true,state:'unreachable',startedAt:at(3,18,14),durationSeconds:40,answer:null,timeline:steps(at(3,18,8),['AI called on your behalf',0],['No answer · retry scheduled',1],['Second attempt · no answer',6]),chargeNote:free('shop didn’t answer')},
 {attemptId:'d9',taskId:'demo-test',businessName:'+91 00000 00000',taskLabel:'Hear how our AI sounds',phone:'+91 00000 00000',source:'google',attemptNumber:1,isLatestAttempt:true,state:'answered',startedAt:at(4,10,2),durationSeconds:48,answer:null,timeline:steps(at(4,10,2),['AI called on your behalf',0]),selfTest:true,chargeNote:{kind:'free',amountCents:0}},
] as LogRow[]).concat(olderRows()).sort((a,b)=>(b.startedAt??0)-(a.startedAt??0))}
/** Older sample calls (last month) so /demo/calls shows more than one page. */
function olderRows():LogRow[]{const jobs:[string,string,string][]=[['Electrician in Kondapur','Bright Spark Electricals','Kondapur'],['Painter in Madhapur','Colour Craft Painters','Madhapur'],['AC service in Kukatpally','CoolAir Services','Kukatpally'],['Tailor in Chintal','Chintal Ladies Tailors','Chintal'],['Carpenter in Miyapur','WoodWorks Carpentry','Miyapur']];return Array.from({length:14},(_,i)=>{const [label,name,area]=jobs[i%jobs.length];const answered=i%3!==2;const start=at(14+i,10+(i%7),(i*7)%60);return {attemptId:'o'+i,taskId:'demo',businessName:name,area,taskLabel:label,phone:`+91 00000 ${String(20+i).padStart(5,'0')}`,address:`${area}, Hyderabad`,source:'google',attemptNumber:1,isLatestAttempt:true,state:answered?'answered':'unreachable',startedAt:start,durationSeconds:answered?60+i*3:30,answer:answered?{stock:'unconfirmed',notes:'Sample answer from last month.'}:null,timeline:steps(start,['AI called on your behalf',0],...(answered?[['Shop answered · notes saved',1] as [string,number]]:[['No answer · retry scheduled',1] as [string,number],['Second attempt · no answer',6] as [string,number]])),chargeNote:answered?charged:free('shop didn’t answer')} as LogRow})}
const demoLoader=async()=>({url:sampleRecording,expiresAt:Date.now()+day});
/** Like the live page, rows arrive in batches: the first 12 sample calls, then the rest when the next page needs them. */
export function DemoCallLog(){const [all]=useState(demoLogRows);const [loaded,setLoaded]=useState(12);const [loading,setLoading]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
 const more=loading?'loading':loaded<all.length?'can':'done';
 return <CallLogView demo rows={all.slice(0,loaded)} summary={{calls:8,tries:9,answered:4,chargedPaise:4000,refundedPaise:0,notChargedCount:4,availablePaise:8000}} more={more} onLoadMore={()=>{if(loading)return;setLoading(true);timer.current=setTimeout(()=>{setLoaded(n=>n+10);setLoading(false)},400)}} loadRecording={demoLoader}/>}
export function DemoConnect(){return <ConnectView status={{connected:false,clients:[]}} accessKeys={<p className="small-note">Sign in to create access keys. The demo doesn’t create real keys.</p>}/>}
/** Sample money movements: ₹100 welcome credit, 4 charges (₹40), 2 refunds (₹20) and 7 "not charged" rows, so the balance is ₹80 and All has two pages. */
function demoMoney():MoneyRow[]{const now=Date.now();const row=(id:string,t:number,type:string,amountCents:number,shopName?:string,productName?:string,note?:string):MoneyRow=>({_id:id,_creationTime:t,type,amountCents,shopName,productName,note,taskId:'demo'});return [
 row('m1',now-12*minute,'charge',-1000,'Sri Sai Plumbing Works',plumber),
 row('m2',now-13*minute,'charge',-1000,'Quick Fix Plumbers',plumber),
 row('m3',now-14*minute,'release',1000,'AquaCare Plumbing',plumber,'shop prefers a personal call'),
 row('m4',at(2,11,21),'release',1000,'Balanagar Notary Office',notary,'shop prefers a personal call'),
 row('m5',at(3,18,30),'refund',1000,'Aptronix',iphone),
 row('m6',at(3,18,15),'release',1000,'Vijay Sales',iphone,'shop didn’t answer'),
 row('m7',at(3,18,12),'charge',-1000,'Aptronix',iphone),
 row('m8',at(14,10,40),'release',1000,'Bright Spark Electricals','Electrician in Kondapur','shop didn’t answer'),
 row('m9',at(15,12,0),'refund',1000,'Colour Craft Painters','Painter in Madhapur'),
 row('m10',at(15,11,50),'charge',-1000,'Colour Craft Painters','Painter in Madhapur'),
 row('m11',at(16,12,20),'release',1000,'CoolAir Services','AC service in Kukatpally','shop didn’t answer'),
 row('m12',at(17,13,30),'release',1000,'Chintal Ladies Tailors','Tailor in Chintal','shop didn’t answer'),
 row('m13',at(18,14,10),'release',1000,'WoodWorks Carpentry','Carpenter in Miyapur','shop didn’t answer'),
 {_id:'m14',_creationTime:at(20,9,0),type:'grant',amountCents:10000,welcome:true},
]}
/** Like the live page: the filter picks rows "on the server", which arrive in batches of 10. */
export function DemoAccount(){
 const [name,setName]=useState('Asha Rao');const [filter,setFilter]=useState<HistoryFilter>('all');const [all]=useState(demoMoney);const [loaded,setLoaded]=useState(10);const [loading,setLoading]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
 const matching=all.filter(r=>filter==='all'?r.type!=='reservation':r.type===filter);const sum=(type:string)=>all.filter(r=>r.type===type).reduce((n,r)=>n+Math.abs(r.amountCents),0);
 return <AccountView demo account={{email:'asha@example.com',availableCents:8000,reservedCents:0,answerPriceCents:1000,eligible:true,callingEnabled:true,name,memberSince:at(20,9,0)}} totals={{creditsCents:sum('grant'),chargesCents:sum('charge'),refundsCents:sum('refund')}} connection={{connected:false,clients:[]}}
  filter={filter} onFilter={f=>{clearTimeout(timer.current);setLoading(false);setFilter(f);setLoaded(10)}} rows={matching.slice(0,loaded)} more={loading?'loading':loaded<matching.length?'can':'done'} onLoadMore={()=>{if(loading)return;setLoading(true);timer.current=setTimeout(()=>{setLoaded(n=>n+10);setLoading(false)},400)}}
  onSaveName={async n=>{if(!n||n.length>80)throw new Error('Enter your name using up to 80 characters.');setName(n)}} onSignOut={()=>{location.href=signedOutUrl(true)}}/>;
}
