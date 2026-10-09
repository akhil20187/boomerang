import {Icon} from './Icon';
import {useQuery,usePaginatedQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {formatPaise,creditRowText,taskDate,CHARGE_RULE,type CreditEntry} from './taskPresentation';
type Row=CreditEntry&{_id:string;_creationTime:number;taskId?:string};
export function CreditHistory(){
 const account=useQuery(makeFunctionReference<'query'>('users:me'),{});
 const {results,status,loadMore}=usePaginatedQuery(makeFunctionReference<'query'>('credits:history'),{},{initialNumItems:25});
 const rows=status==='LoadingFirstPage'?undefined:results as Row[];
 return <section className="credit-history"><a className="task-back" href="/tasks"><Icon name="left"/> My tasks</a><div className="task-page-heading"><div><h1>Credit & charges</h1></div></div>
  <div className="card credit-summary">{account?<><p className="credit-available"><strong>{formatPaise(account.availableCents??0)}</strong> available</p>{account.reservedCents>0&&<p className="muted">{formatPaise(account.reservedCents)} on hold for calls in progress</p>}{account.answerPriceLabel&&<p>{account.answerPriceLabel} per shop that answers</p>}</>:<p role="status">Checking your credit…</p>}<p className="small-note">{CHARGE_RULE}</p></div>
  <h2 className="task-section-title">History</h2>
  {rows===undefined?<p className="task-empty" role="status">Loading your credit history…</p>:rows.length===0?<p className="task-empty">No credit activity yet.</p>:<div className="credit-rows">{rows.map(row=>{const text=creditRowText(row);const body=<><div><h3>{text.title}</h3><p>{[text.detail,taskDate(row._creationTime)].filter(Boolean).join(' · ')}</p></div><strong className="credit-amount">{text.amount}</strong></>;return row.taskId?<a key={row._id} className="credit-row" href={`/status?task=${encodeURIComponent(row.taskId)}`}>{body}</a>:<div key={row._id} className="credit-row">{body}</div>})}</div>}
  {status==='CanLoadMore'||status==='LoadingMore'?<button className="task-load-more" disabled={status==='LoadingMore'} onClick={()=>loadMore(25)}>{status==='LoadingMore'?'Loading…':'Load more'}</button>:null}
  <p className="task-privacy">Only your credit appears here. Paid top-ups aren’t available yet.</p>
 </section>;
}
