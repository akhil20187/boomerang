import {Fragment,useEffect,useRef,useState} from 'react';
import {useMutation,usePaginatedQuery,useQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {Icon} from './Icon';
import {ShopActions} from './CallCard';
import {CallDetail} from './CallDetail';
import {ShopPhone} from './ShopPhone';
import {businessCopy} from './ContactSource';
import {callLogDetail} from './statusPresentation';
import type {RecordingLoader} from './VoicePlayer';
import {LOG_FILTERS,ROWS_PER_PAGE,callLogCsv,filterRows,groupByDay,lengthText,pageInfo,realRows,rowBusiness,rowCharge,rowResult,totals,whenText,type LogFilter,type LogRow,type LogSummary,type MoreState} from './callLogPresentation';
import {clock} from './statusPresentation';
import './pages.css';
const logRef=makeFunctionReference<'query'>('callLog:log');
const summaryRef=makeFunctionReference<'query'>('callLog:summary');
const playbackRef=makeFunctionReference<'mutation'>('recordings:playback');
/** Requests fetched per server batch; the page itself always shows ROWS_PER_PAGE call tries. */
const TASKS_PER_BATCH=10;

/** True on laptops (≥900px), matching the app shell's sidebar breakpoint. */
export function useWide(){const query='(min-width: 900px)';const [wide,setWide]=useState(()=>typeof matchMedia==='function'&&matchMedia(query).matches);useEffect(()=>{const m=matchMedia(query);const change=()=>setWide(m.matches);m.addEventListener('change',change);return()=>m.removeEventListener('change',change)},[]);return wide}

/**
 * /calls for the signed-in user: attempts (callLog.log) and this month's totals (callLog.summary).
 * The server pages by request (each request has one or more tries), so rows per batch vary. usePaginatedQuery keeps every
 * loaded batch and its cursor, which lets the view cut exact pages of 10 rows and go back without refetching.
 */
export function LiveCallLog(){const {results,status,loadMore}=usePaginatedQuery(logRef,{},{initialNumItems:TASKS_PER_BATCH});const summary=useQuery(summaryRef,{}) as LogSummary|undefined;const playback=useMutation(playbackRef);return <CallLogView rows={status==='LoadingFirstPage'?undefined:results as LogRow[]} summary={summary} more={status==='CanLoadMore'?'can':status==='LoadingMore'?'loading':'done'} onLoadMore={()=>loadMore(TASKS_PER_BATCH)} loadRecording={async attemptId=>await playback({attemptId})}/>}

export type CallLogViewProps={/** undefined while loading */rows?:LogRow[];summary?:LogSummary;/** whether older calls exist on the server */more:MoreState;/** fetch the next batch; the view calls it when a page is not full yet */onLoadMore:()=>void;loadRecording?:RecordingLoader;/** /demo: links stay inside the demo */demo?:boolean};
/** Call log page (spec "Call log"; mockups CallLog / CallLogPhone). Laptop: table with the opened call in a full-width row. Phone: day groups of stacked cards. 10 rows per page; the filter applies to every loaded call, then the result is paged. */
export function CallLogView({rows,summary,more,onLoadMore,loadRecording,demo}:CallLogViewProps){
 const [filter,setFilter]=useState<LogFilter>('all');const [open,setOpen]=useState<string>();const [page,setPage]=useState(1);const wide=useWide();
 const all=rows&&realRows(rows);const matching=all&&filterRows(all,filter);const prefix=demo?'/demo':'';
 const info=pageInfo(matching?.length??0,page,more);const shown=matching?.slice(info.start,info.end);
 const top=useRef<HTMLDivElement>(null);const moved=useRef(false);
 // A page that is not full yet pulls the next server batch (repeats until it fills or the server has no more).
 useEffect(()=>{if(all!==undefined&&info.needsMore&&more==='can')onLoadMore()},[all!==undefined,info.needsMore,more]);
 // Everything loaded and this page is past the end (filter changed, list shrank): go to the last page.
 useEffect(()=>{if(info.lastPage!==undefined&&page>info.lastPage)setPage(info.lastPage)},[info.lastPage,page]);
 // On a page change, bring the top of the list into view and move focus there so keyboard and screen-reader users land on the new rows.
 useEffect(()=>{if(!moved.current)return;moved.current=false;const el=top.current;if(!el)return;el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},[page]);
 const go=(next:number)=>{moved.current=true;setOpen(undefined);setPage(next)};
 const toggle=(id:string)=>setOpen(open===id?undefined:id);
 const download=()=>{if(!shown)return;const blob=new Blob(['﻿'+callLogCsv(shown)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`boomerang-call-log-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const detail=(r:LogRow)=>{const d=callLogDetail(r);return <CallDetail {...d} loadRecording={loadRecording}/>};
 return <section className="page call-log">
  <header className="page-heading"><h1>Call log</h1><p>Every call we made for you, every try, and what it cost.</p></header>
  <div className="stat-grid" aria-label="This month">{summary?totals(summary).map(t=><div className="stat" key={t.label}><span className="stat-label">{t.label}</span><strong>{t.value}</strong>{t.label==='Credit left'?<a href={`${prefix}/account`}>Account and credit</a>:t.note&&<span className="stat-note">{t.note}</span>}</div>):<p className="stat-loading" role="status">Loading this month’s totals…</p>}</div>
  {summary?.truncated&&<p className="small-note">Totals count your latest 500 requests this month.</p>}
  <div className="log-tools"><div role="group" aria-label="Show" className="filter-chips">{LOG_FILTERS.map(f=><button key={f.id} type="button" className="chip" aria-pressed={filter===f.id} onClick={()=>{setFilter(f.id);setOpen(undefined);setPage(1)}}>{f.label}</button>)}</div><button type="button" className="secondary" onClick={download} disabled={!shown?.length}>Download CSV</button></div>
  <div ref={top} tabIndex={-1} className="log-top" aria-label={`Calls, ${info.label}`}/>
  {all===undefined||(!shown!.length&&more!=='done')?<p className="page-empty" role="status">Loading your calls…</p>:all.length===0?<div className="page-empty"><p>No calls yet.</p><a href={demo?'/demo':'/app'}>Start a request</a></div>:shown!.length===0?<p className="page-empty">No calls match this filter.</p>:wide?
   <div className="log-table-box"><table className="log-table"><thead><tr><th scope="col">When</th><th scope="col">Business</th><th scope="col">Try</th><th scope="col">Result</th><th scope="col">Length</th><th scope="col">Charge</th><th scope="col"><span className="visually-hidden">Details</span></th></tr></thead><tbody>{shown!.map(r=>{const [text,tone]=rowResult(r);const isOpen=open===r.attemptId;const supplied=r.source==='supplied';return <Fragment key={r.attemptId}><tr className={isOpen?'is-open':''}>
    <td className="nowrap muted">{whenText(r.startedAt)}</td>
    <td><span className="log-biz">{rowBusiness(r)}</span><span className="log-sub">{r.taskLabel}{' · '}{r.phone?<a href={`tel:${r.phone}`} aria-label={`Call ${r.businessName} at ${r.phone}`}>{r.phone}</a>:'Phone number unavailable'}</span></td>
    <td className="nowrap">Try {r.attemptNumber}<span className="log-sub">AI agent</span></td>
    <td className={`log-result ${tone}`}>{tone==='blue'&&<i className="pulse" aria-hidden="true"/>}{text}</td>
    <td className="nowrap muted">{lengthText(r.durationSeconds)}</td>
    <td className="log-charge">{businessCopy(rowCharge(r),supplied)}</td>
    <td className="nowrap"><button type="button" className="row-toggle" aria-expanded={isOpen} aria-controls={`call-${r.attemptId}`} aria-label={`${isOpen?'Close':'Open'} call to ${rowBusiness(r)}, try ${r.attemptNumber}`} onClick={()=>toggle(r.attemptId)}>{isOpen?'Close':'Open'}<Icon name={isOpen?'up':'down'} size={16}/></button></td>
   </tr>{isOpen&&<tr className="log-open" id={`call-${r.attemptId}`}><td colSpan={7}><div className="log-open-body"><div className="log-open-detail">{detail(r)}</div><ShopActions shop={callLogDetail(r).shop}/></div></td></tr>}</Fragment>})}</tbody></table></div>
  :<div className="log-days">{groupByDay(shown!).map(g=><section key={g.day} aria-label={g.day}><h2 className="log-day">{g.day}</h2>{g.rows.map(r=>{const [text,tone]=rowResult(r);const isOpen=open===r.attemptId;const supplied=r.source==='supplied';const shop=callLogDetail(r).shop;return <article className="log-card" key={r.attemptId}>
    <button type="button" className="log-card-summary" aria-expanded={isOpen} aria-controls={`call-${r.attemptId}`} onClick={()=>toggle(r.attemptId)}>
     <span className="log-card-line"><span className="log-biz">{rowBusiness(r)}</span><Icon name={isOpen?'up':'down'} size={16}/></span>
     <span className="log-sub">{r.taskLabel}</span>
     <span className={`log-result ${tone}`}>{tone==='blue'&&<i className="pulse" aria-hidden="true"/>}{text}</span>
     <span className="log-charge">{businessCopy(rowCharge(r),supplied)}</span>
     <span className="log-sub">{r.startedAt?clock(r.startedAt):'—'} · Try {r.attemptNumber} · AI agent · {lengthText(r.durationSeconds)}</span>
    </button>
    <div className="log-card-actions"><ShopPhone shop={shop}/><ShopActions shop={shop}/></div>
    {isOpen&&<div id={`call-${r.attemptId}`} className="log-card-detail">{detail(r)}</div>}
   </article>})}</section>)}</div>}
  {all!==undefined&&all.length>0&&!info.single&&<nav className="pager" aria-label="Call log pages">
   <button type="button" className="secondary" disabled={!info.hasPrev} onClick={()=>go(page-1)}><span aria-hidden="true">‹ </span>Previous</button>
   <span className="pager-label" aria-live="polite">{info.label}</span>
   <button type="button" className="secondary" disabled={!info.hasNext||info.needsMore} onClick={()=>go(page+1)}>Next<span aria-hidden="true"> ›</span></button>
  </nav>}
  <p className="small-note page-foot">You pay only when a business answers what you asked, even partly or with a condition. Missed calls, retries and “prefers a personal call” are never charged.</p>
 </section>;
}
