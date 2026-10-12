import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useQuery,usePaginatedQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {Icon} from './Icon';
import {businessCopy} from './ContactSource';
import {formatPaise} from './taskPresentation';
import {sidebarGroups,type SidebarGroup} from './statusPresentation';
import type {TaskSummary} from './types';
const historyRef=makeFunctionReference<'query'>('tasks:history');
const meRef=makeFunctionReference<'query'>('users:me');
export function Logo(){return <svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-12 50 50)" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round"><path d="M30 12 V60"/><path d="M30 56 Q32 38 53 38 Q75 38 75 61 Q75 84 55 84"/></g><circle cx="32" cy="82" r="8.5" fill="#16A34A" transform="rotate(-12 50 50)"/></svg>}
export type AppShellProps={children:ReactNode;/** undefined while loading */groups?:SidebarGroup[];/** rupee balance in paise; undefined while loading */balanceCents?:number;/** /demo: sample tasks, links stay on the demo, banner shown */demo?:boolean};
/** Signed-in frame (D153): fixed 270px sidebar on laptops (≥900px); top bar + drawer on phones. */
export function AppShell({children,groups,balanceCents,demo=false}:AppShellProps){
 const [open,setOpen]=useState(false);const menuButton=useRef<HTMLButtonElement>(null);const closeButton=useRef<HTMLButtonElement>(null);const wasOpen=useRef(false);
 useEffect(()=>{if(open){wasOpen.current=true;closeButton.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',key)}}if(wasOpen.current){wasOpen.current=false;menuButton.current?.focus()}},[open]);
 useEffect(()=>{const wide=matchMedia('(min-width: 900px)');const change=()=>{if(wide.matches)setOpen(false)};wide.addEventListener('change',change);return()=>wide.removeEventListener('change',change)},[]);
 const path=location.pathname;const params=new URLSearchParams(location.search);const home=demo?'/demo':'/app';
 const current=(on:boolean)=>on?{'aria-current':'page' as const}:{};
 const balance=balanceCents===undefined?'…':formatPaise(balanceCents);
 return <div className={`app-shell${open?' menu-open':''}`}>
  <header className="app-topbar" inert={open}><button ref={menuButton} type="button" className="menu-button" aria-label="Open menu: your tasks" aria-expanded={open} aria-controls="app-menu" onClick={()=>setOpen(true)}><Icon name="menu" size={20}/></button><a href={home} className="app-brand" aria-label="Boomerang home"><Logo/><span>boomerang</span></a><a href="/account" className="balance-pill" aria-label={`Account and credit · ${balance} available`}><span>{balance}</span></a></header>
  {open&&<div className="menu-scrim" aria-hidden="true" onClick={()=>setOpen(false)}/>}
  <nav id="app-menu" className="app-sidebar" aria-label="Menu">
   <div className="sidebar-head"><a href={home} className="app-brand" aria-label="Boomerang home"><Logo/><span>boomerang</span></a><button ref={closeButton} type="button" className="menu-close" aria-label="Close menu" onClick={()=>setOpen(false)}><Icon name="close" size={20}/></button></div>
   <a href={home} className="new-request" {...current(path===home&&!params.has('task')&&!params.has('test'))}><Icon name="plus"/>New request</a>
   <div className="sidebar-tasks">{groups===undefined?<p className="sidebar-note" role="status">Loading your tasks…</p>:groups.length===0?<p className="sidebar-note">No tasks yet. Your requests will appear here.</p>:groups.map(group=><section key={group.heading} aria-labelledby={`menu-${group.heading.replace(/\s/g,'-')}`}><h2 className="sidebar-label" id={`menu-${group.heading.replace(/\s/g,'-')}`}>{group.heading}</h2><ul>{group.tasks.map(task=>{const [text,color]=task.status;return <li key={task.id}><a className="sidebar-task" href={demo?'/demo':task.href} {...current(!demo&&(path==='/status'&&params.get('task')===task.id||path==='/app'&&params.get('test')===task.id))}><span className="sidebar-task-label">{task.label}</span><span className={`sidebar-task-status ${color}`}>{task.live&&<i className="pulse" aria-hidden="true"/>}{businessCopy(text,task.supplied)}</span></a></li>})}</ul></section>)}{!demo&&groups!==undefined&&groups.length>0&&<a className="sidebar-all" href="/tasks" {...current(path==='/tasks')}>All tasks</a>}</div>
   <div className="sidebar-links"><a href="/calls" {...current(path==='/calls')}><Icon name="list"/>Call log</a><a href="/connect-assistant" {...current(path==='/connect-assistant')}><Icon name="link"/>Use in ChatGPT or Claude</a><a href="/account" {...current(path==='/account'||path==='/credit')}><span className="sidebar-link-text"><Icon name="user"/>Account and credit</span><span className="sidebar-balance">{balance}</span></a></div>
  </nav>
  <main className="workspace app-main" inert={open}>{demo&&<div className="demo-banner">Interactive demo · sample shops, dummy phone numbers and answers · no calls or charges</div>}{children}</main>
 </div>
}
/** AppShell with the signed-in user's first 15 tasks and balance. */
export function LiveAppShell({children}:{children:ReactNode}){const {results,status}=usePaginatedQuery(historyRef,{},{initialNumItems:15});const account=useQuery(meRef,{});return <AppShell groups={status==='LoadingFirstPage'?undefined:sidebarGroups(results as TaskSummary[])} balanceCents={account?(account.availableCents??0):undefined}>{children}</AppShell>}
