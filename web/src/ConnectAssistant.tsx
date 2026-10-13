import {useRef,useState,type ReactNode,type KeyboardEvent} from 'react';
import {useQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {AccessKeys} from './AccountDetails';
import {CONNECT_STEPS,connectAddresses,connectionLines,type ConnectApp,type ConnectionStatus} from './accountPresentation';
import './pages.css';
const statusRef=makeFunctionReference<'query'>('connections:status');
export const addresses=()=>connectAddresses({mcpUrl:import.meta.env.VITE_MCP_PUBLIC_URL,appUrl:import.meta.env.VITE_APP_PUBLIC_URL,origin:location.origin});

export function LiveConnectAssistant(){const status=useQuery(statusRef,{}) as ConnectionStatus|undefined;return <ConnectView status={status} accessKeys={<AccessKeys/>}/>}

/** Copy text to the clipboard; the button reads "Copied" for a moment. */
export function CopyButton({text,label='Copy'}:{text:string;label?:string}){const [state,setState]=useState<'idle'|'copied'|'failed'>('idle');return <button type="button" className="secondary copy-button" aria-live="polite" onClick={async()=>{try{await navigator.clipboard.writeText(text);setState('copied');setTimeout(()=>setState('idle'),2000)}catch{setState('failed')}}}>{state==='copied'?'Copied':state==='failed'?'Select and copy':label}</button>}

const APPS:{id:ConnectApp;name:string}[]=[{id:'chatgpt',name:'ChatGPT'},{id:'claude',name:'Claude'}];
/** /connect-assistant (spec "Use in ChatGPT or Claude"; mockup Connect.dc.html). No backend of its own, so /demo can render it. */
export function ConnectView({status,accessKeys}:{/** undefined while loading */status?:ConnectionStatus;accessKeys:ReactNode}){
 const [app,setApp]=useState<ConnectApp>('chatgpt');const [checked,setChecked]=useState(false);const tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const {mcp,skill}=addresses();const name=APPS.find(a=>a.id===app)!.name;
 const onKey=(e:KeyboardEvent)=>{const i=APPS.findIndex(a=>a.id===app);const next=e.key==='ArrowRight'?(i+1)%APPS.length:e.key==='ArrowLeft'?(i+APPS.length-1)%APPS.length:e.key==='Home'?0:e.key==='End'?APPS.length-1:-1;if(next<0)return;e.preventDefault();setApp(APPS[next].id);tabs.current[next]?.focus()};
 const lines=connectionLines(status);
 return <section className="page connect-page">
  <header className="page-heading"><h1>Use in ChatGPT or Claude</h1><p>Ask for calls from the assistant you already use. Same account, same credit, same tasks.</p></header>
  <div className="segmented" role="tablist" aria-label="Your AI assistant" onKeyDown={onKey}>{APPS.map((a,i)=><button key={a.id} ref={el=>{tabs.current[i]=el}} type="button" role="tab" id={`tab-${a.id}`} aria-selected={app===a.id} aria-controls="connect-panel" tabIndex={app===a.id?0:-1} onClick={()=>setApp(a.id)}>{a.name}</button>)}</div>
  <div className="card connect-card" role="tabpanel" id="connect-panel" aria-labelledby={`tab-${app}`}>
   <section><h2>1. Copy this address</h2><div className="copy-row"><code>{mcp}</code><CopyButton text={mcp}/></div></section>
   <section><h2>2. Add it in {name}</h2><ol className="steps">{CONNECT_STEPS[app].map((s,i)=><li key={i}><span className="step-n" aria-hidden="true">{i+1}</span><span>{s}</span></li>)}</ol><p className="small-note">Menu names change often. If you can’t find these, open {name}’s settings and add a custom connector.</p></section>
   <section><h2>3. Check it works</h2><button type="button" className="secondary" onClick={()=>setChecked(true)}>Check connection</button>{checked&&<ul className="connection-lines" role="status">{lines.map(l=><li key={l} className={l.startsWith('Connected')?'':'muted'}>{l}</li>)}</ul>}</section>
  </div>
  <div className="card paste-card"><h2>Or paste this into any AI assistant</h2><div className="copy-row"><code>Set me up with Boomerang using {skill}</code><CopyButton text={`Set me up with Boomerang using ${skill}`}/></div></div>
  <details className="card advanced"><summary>Advanced: access keys</summary><p className="small-note">For coding agents and scripts. Most people don’t need this.</p>{accessKeys}</details>
 </section>;
}
