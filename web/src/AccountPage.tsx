import {useEffect,useRef,useState} from 'react';
import {useMutation,useQuery,usePaginatedQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {Icon} from './Icon';
import {NameRow} from './CustomerName';
import {formatPaise} from './taskPresentation';
import {pageInfo,ROWS_PER_PAGE,type MoreState} from './callLogPresentation';
import {answersLine,connectionLines,historyRow,memberSinceDate,memberSinceMonth,profileInitial,totalsBoxes,HISTORY_FILTERS,type ConnectionStatus,type CreditTotals,type HistoryEntry,type HistoryFilter} from './accountPresentation';
import {SignOutDialog,useLiveSignOut} from './SignOutDialog';
import './pages.css';
const meRef=makeFunctionReference<'query'>('users:me');
const historyRef=makeFunctionReference<'query'>('credits:history');
const totalsRef=makeFunctionReference<'query'>('credits:totals');
const statusRef=makeFunctionReference<'query'>('connections:status');
const updateRef=makeFunctionReference<'mutation'>('users:updateProfile');
export type AccountSummary={email?:string;availableCents?:number;reservedCents?:number;answerPriceCents?:number|null;eligible?:boolean;callingEnabled?:boolean;name?:string;memberSince?:number};
export type MoneyRow=HistoryEntry&{_id:string;taskId?:string};

/** /account (and the old /credit address) for the signed-in user. The filter is a server argument, so each filter pages on its own. */
export function LiveAccountPage(){
 const signOut=useLiveSignOut();const [filter,setFilter]=useState<HistoryFilter>('all');
 const account=useQuery(meRef,{}) as AccountSummary|undefined;const totals=useQuery(totalsRef,{}) as CreditTotals|undefined;const connection=useQuery(statusRef,{}) as ConnectionStatus|undefined;
 const {results,status,loadMore}=usePaginatedQuery(historyRef,filter==='all'?{}:{type:filter},{initialNumItems:ROWS_PER_PAGE});
 const update=useMutation(updateRef);
 return <AccountView account={account} totals={totals} connection={connection} filter={filter} onFilter={setFilter}
  rows={status==='LoadingFirstPage'?undefined:results as MoneyRow[]} more={status==='CanLoadMore'?'can':status==='LoadingMore'?'loading':'done'} onLoadMore={()=>loadMore(ROWS_PER_PAGE)}
  onSaveName={name=>update({name})} onSignOut={signOut}/>;
}

export type AccountViewProps={account?:AccountSummary;totals?:CreditTotals;connection?:ConnectionStatus;
 /** rows loaded so far for the current filter, newest first; undefined while the first batch loads */rows?:MoneyRow[];more:MoreState;onLoadMore:()=>void;
 filter:HistoryFilter;onFilter:(filter:HistoryFilter)=>void;onSaveName:(name:string)=>Promise<unknown>;
 /** runs after the customer confirms in the sign-out dialog */onSignOut:()=>Promise<void>|void;/** /demo: links stay inside the demo */demo?:boolean};
/**
 * "Profile and credit" (mockups Wallet.dc.html phone, ProfileLaptop.dc.html laptop). Who you are first, then credit and
 * every credit, charge and refund. No payment or top-up buttons (D140). No backend of its own, so /demo can render it.
 */
export function AccountView({account,totals,connection,rows,more,onLoadMore,filter,onFilter,onSaveName,onSignOut,demo}:AccountViewProps){
 const [confirm,setConfirm]=useState(false);const [page,setPage]=useState(1);
 const prefix=demo?'/demo':'';const available=account?.availableCents??0;const per=answersLine(available,account?.answerPriceCents);
 const info=pageInfo(rows?.length??0,page,more);const shown=rows?.slice(info.start,info.end);
 const top=useRef<HTMLDivElement>(null);const moved=useRef(false);
 useEffect(()=>{const previous=document.title;document.title='Profile and credit · Boomerang';return()=>{document.title=previous}},[]);
 // Same paging as the call log: a page that is not full pulls the next batch; past the end goes to the last page.
 useEffect(()=>{if(rows!==undefined&&info.needsMore&&more==='can')onLoadMore()},[rows!==undefined,info.needsMore,more]);
 useEffect(()=>{if(info.lastPage!==undefined&&page>info.lastPage)setPage(info.lastPage)},[info.lastPage,page]);
 useEffect(()=>{if(!moved.current)return;moved.current=false;const el=top.current;if(!el)return;el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},[page]);
 const go=(next:number)=>{moved.current=true;setPage(next)};
 const name=account?.name?.trim();const empty=HISTORY_FILTERS.find(f=>f.id===filter)!.empty;
 const connectionText=connection?.connected?connectionLines(connection)[0]:connection?'Not connected':'Checking…';
 return <section className="page profile-page">
  <header className="page-heading"><h1>Profile and credit</h1></header>
  <div className="profile-grid">
   <section className="profile-head" aria-label="You">
    <span className="profile-badge" aria-hidden="true">{account?profileInitial(name,account.email):''}</span>
    <span className="profile-who"><span className={`profile-name${name?'':' muted'}`}>{account?name||'Add your name':'…'}</span><span className="profile-meta">{[account?.email,account?.memberSince?`Member since ${memberSinceMonth(account.memberSince)}`:''].filter(Boolean).join(' · ')}</span></span>
   </section>
   <section className="card profile-card details-card" aria-labelledby="details-heading">
    <h2 id="details-heading">Your details</h2>
    <NameRow saved={account?(account.name??''):undefined} onSave={onSaveName}/>
    <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{account?.email??'…'}<span className="log-sub">Used to sign in. Can’t be changed here.</span></span></div>
    <div className="detail-row"><span className="detail-label">Member since</span><span className="detail-value">{account?.memberSince?memberSinceDate(account.memberSince):'…'}</span></div>
    <a className="detail-row detail-link" href={`${prefix}/connect-assistant`}><span className="detail-label">ChatGPT or Claude</span><span className="detail-value muted">{connectionText}<Icon name="right" size={16}/></span></a>
   </section>
   <div className="profile-money">
    <section className="card profile-card credit-card" aria-labelledby="credit-heading">
     <h2 id="credit-heading">Credit</h2>
     {account?<><strong className="balance">{formatPaise(available)}</strong>{per&&<p className="muted">{per}</p>}{(account.reservedCents??0)>0&&<p className="muted">{formatPaise(account.reservedCents!)} on hold for calls in progress</p>}{account.eligible===false&&<p className="amber">Account approval pending</p>}{account.callingEnabled===false&&<p className="amber">Live calling is being connected</p>}</>:<p role="status" className="muted">Checking your credit…</p>}
     <div className="money-totals">{totalsBoxes(totals).map(b=><div className="stat" key={b.label}><span className="stat-label">{b.label}</span><strong>{b.value}</strong></div>)}</div>
     <p className="small-note">All time. Paid top-ups aren’t available yet.</p>
    </section>
    <section className="card profile-card history-card" aria-labelledby="history-heading">
     <h2 id="history-heading">Credits, charges and refunds</h2>
     <div role="group" aria-label="Show" className="filter-chips">{HISTORY_FILTERS.map(f=><button key={f.id} type="button" className="chip" aria-pressed={filter===f.id} onClick={()=>{if(f.id===filter)return;onFilter(f.id);setPage(1)}}>{f.label}</button>)}</div>
     <div ref={top} tabIndex={-1} className="log-top" aria-label={`Credits, charges and refunds, ${info.label}`}/>
     {rows===undefined||(!shown!.length&&more!=='done')?<p className="muted history-empty" role="status">Loading…</p>:shown!.length===0?<p className="muted history-empty">{empty}</p>:<ul className="money-rows">{shown!.map(row=>{const text=historyRow(row);return <li key={row._id}><span><span className="money-title">{text.title}</span><span className="log-sub">{text.sub}</span></span><span className="money-amount">{text.amount}</span></li>})}</ul>}
     {rows!==undefined&&rows.length>0&&!info.single&&<nav className="pager history-pager" aria-label="Credit history pages">
      <span className="pager-label" aria-live="polite">{info.label}</span>
      <span className="pager-buttons"><button type="button" className="secondary" disabled={!info.hasPrev} onClick={()=>go(page-1)}><span aria-hidden="true">‹ </span>Previous</button><button type="button" className="secondary" disabled={!info.hasNext||info.needsMore} onClick={()=>go(page+1)}>Next<span aria-hidden="true"> ›</span></button></span>
     </nav>}
    </section>
   </div>
   <div className="profile-signout"><button type="button" className="secondary sign-out" onClick={()=>setConfirm(true)}>Sign out</button></div>
  </div>
  <SignOutDialog open={confirm} onClose={()=>setConfirm(false)} onConfirm={onSignOut}/>
 </section>;
}
