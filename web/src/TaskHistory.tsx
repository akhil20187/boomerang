import {useState} from 'react';
import {useQuery,usePaginatedQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import type {TaskSummary} from './types';
import {taskLabel,taskDate,taskOutcome,formatPaise,taskChargeText} from './taskPresentation';
export function TaskHistory(){
 const {results,status,loadMore}=usePaginatedQuery(makeFunctionReference<'query'>('tasks:history'),{},{initialNumItems:15});
 const tasks=status==='LoadingFirstPage'?undefined:results as TaskSummary[];
 const account=useQuery(makeFunctionReference<'query'>('users:me'),{});
 const [filter,setFilter]=useState('all');
 const active=(tasks??[]).filter(t=>t.summary.active);const finished=(tasks??[]).filter(t=>!t.summary.active);
 return <section className="task-history"><div className="task-page-heading"><div><h1>My tasks</h1><p>Available credit <strong>{account?formatPaise(account.availableCents??0):'…'}</strong> · <a href="/credit">View credit</a></p>{account?.reservedCents>0&&<p className="muted">{formatPaise(account.reservedCents)} on hold for calls in progress</p>}</div><a className="primary link-button" href="/app">Find shops</a></div><div className="task-tabs" role="tablist" aria-label="Task status">{[['all','All'],['active','In progress'],['finished','Finished']].map(([value,label])=><button role="tab" id={`task-tab-${value}`} aria-selected={filter===value} aria-controls="task-history-list" key={value} onClick={()=>setFilter(value)}>{label}</button>)}</div><div id="task-history-list" role="tabpanel" aria-labelledby={`task-tab-${filter}`}>{tasks===undefined?<p className="task-empty" role="status">Loading your tasks…</p>:tasks.length===0?<div className="task-empty"><h2>No tasks yet</h2><p>Your shop calls and their answers will appear here.</p><a href="/app">Find nearby shops</a></div>:<>{filter!=='finished'&&<HistoryGroup heading="In progress" tasks={active}/>} {filter!=='active'&&<HistoryGroup heading={filter==='finished'?'Finished':'Recent'} tasks={finished}/>} {(filter==='active'&&active.length===0||filter==='finished'&&finished.length===0)&&<p className="task-empty">{filter==='active'?'No tasks in progress.':'No finished tasks yet.'}</p>}</>}</div>{status!=='Exhausted'&&status!=='LoadingFirstPage'&&<button className="task-load-more" disabled={status==='LoadingMore'} onClick={()=>loadMore(15)}>{status==='LoadingMore'?'Loading tasks…':'Load more tasks'}</button>}<p className="task-privacy">Only your tasks appear here.</p></section>
}
function HistoryGroup({heading,tasks}:{heading:string;tasks:TaskSummary[]}){
 if(!tasks.length)return null;
 return <section className="task-group"><h2>{heading}</h2><div className="task-history-rows">{tasks.map(task=>{
  const [outcome,color]=task.selfTest?[task.summary.active?'Test call in progress':'Test call finished',task.summary.active?'blue':'grey']:taskOutcome(task.summary);
  return <a className="task-history-row" href={task.selfTest?`/app?test=${encodeURIComponent(task._id)}`:`/status?task=${encodeURIComponent(task._id)}`} key={task._id}><div><h3>{taskLabel(task.product?.name||task.title)}</h3><p>{task.selfTest?'Personal rehearsal':task.summary.active?`${task.summary.shopCount} shops selected`:`${task.summary.shopCount} ${task.summary.shopCount===1?'shop':'shops'} checked`} · {taskDate(task.approvedAt??task._creationTime)}</p><p className={`task-row-outcome ${color}`}><span className="task-status-dot"/>{outcome}</p><p className="task-row-charge">{task.selfTest?'Free test call · no credit charged':task.verification?'Test task · no real shops called':taskChargeText(task.summary)}</p></div><span aria-hidden="true" className="task-chevron">›</span></a>;
 })}</div></section>;
}
