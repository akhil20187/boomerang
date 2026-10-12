import {useEffect,useRef,useState} from 'react';
import {ChatView,ChatPicker,ChatCalls,STARTERS,type ChatItem} from './Chat';
import {demoPlumberDiscovery,demoPlumberTask} from './demo';

/** /demo: a scripted chat with no backend and no model (spec D). Two questions → brief → picker → Call → simulated calls → results. */
export function DemoChat(){
 const [step,setStep]=useState(0);const [request,setRequest]=useState('');const [a1,setA1]=useState('');const [a2,setA2]=useState('');
 const [selected,setSelected]=useState<string[]>([]);const [stage,setStage]=useState(0);const [extra,setExtra]=useState<ChatItem[]>([]);const [test,setTest]=useState(false);const [thinking,setThinking]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(step!==4||stage>=2)return;const id=setTimeout(()=>setStage(stage+1),2500);return()=>clearTimeout(id)},[step,stage]);
 const later=(fn:()=>void)=>{setThinking(true);clearTimeout(timer.current);timer.current=setTimeout(()=>{setThinking(false);fn()},500)};
 const reset=()=>{setStep(0);setRequest('');setA1('');setA2('');setSelected([]);setStage(0);setExtra([]);setTest(false)};
 async function onSend(text:string){
  if(test)reset();
  if(step===0&&!test){setRequest(text);later(()=>setStep(1))}
  else if(step===1){setA1(text);later(()=>setStep(2))}
  else if(step===2){setA2(text);later(()=>setStep(3))}
  else{const n=extra.length;setExtra(e=>[...e,{_id:'u'+n,role:'user',kind:'text',text}]);later(()=>setExtra(e=>[...e,{_id:'a'+n,role:'assistant',kind:'text',text:'This is a demo, so I can’t look that up. Sign in to ask about real calls.'}]))}
  return true;
 }
 const items:ChatItem[]=[];
 if(test)items.push({_id:'t0',role:'user',kind:'text',text:STARTERS.test},{_id:'t1',role:'assistant',kind:'test_call',text:'In the real app we call your own mobile now. Pick up to hear our AI ask about an iPhone, the way it would with a shop. It’s free.'});
 if(step>=1)items.push({_id:'r',role:'user',kind:'text',text:request},{_id:'intro',role:'assistant',kind:'text',text:'Got it. Two quick questions, so plumbers can give you a real answer on the phone.'},{_id:'q1',role:'assistant',kind:'question',text:'When do you need them?',payload:{question:'When do you need them?',choices:['Today','Tomorrow','This week','Flexible'],index:1,total:2}});
 if(step>=2)items.push({_id:'a1',role:'user',kind:'text',text:a1},{_id:'q2',role:'assistant',kind:'question',text:'What needs fixing?',payload:{question:'What needs fixing?',choices:['A leaking tap','Tap and a pipe leak','Not sure'],index:2,total:2}});
 if(step>=3)items.push({_id:'a2',role:'user',kind:'text',text:a2},{_id:'brief',role:'assistant',kind:'brief',text:'',payload:{noun:'plumbers',questions:[`Can you come to 500032 ${a1.toLowerCase()}?`,'What’s the visit charge?',`Rough cost to fix: ${a2.toLowerCase()}?`]}},{_id:'picker',role:'assistant',kind:'picker',text:'',payload:{noun:'plumbers',...(step>=4?{taskId:'demo'}:{})}});
 if(step>=4)items.push({_id:'calls',role:'assistant',kind:'calls',text:'',payload:{noun:'plumbers',taskId:'demo'}});
 items.push(...extra);
 return <ChatView items={items} thinking={thinking} error="" balanceCents={10000} priceCents={1000} onSend={onSend} onTestStarter={()=>{reset();setTest(true)}}
  renderCard={(item,latest)=>item.kind==='picker'?(item.payload?.taskId?null:<ChatPicker data={demoPlumberDiscovery} noun="plumbers" busy={false} onCall={ids=>{setSelected(ids);setStage(0);setStep(4)}}/>):item.kind==='calls'?<ChatCalls data={demoPlumberTask(selected,stage,a1)} taskId="demo" noun="plumbers" latest={latest&&!extra.length} onMore={()=>void onSend('Call more plumbers')} onNew={reset}/>:item.kind==='test_call'?<div className="bubble-assistant">{item.text}</div>:null}/>
}
