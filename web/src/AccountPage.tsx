import type {ReactNode} from 'react';
import {useQuery,usePaginatedQuery} from 'convex/react';
import {makeFunctionReference} from 'convex/server';
import {useAuthActions} from '@convex-dev/auth/react';
import {Icon} from './Icon';
import {CustomerName} from './CustomerName';
import {formatPaise,creditRowText,taskDate,type CreditEntry} from './taskPresentation';
import {clock} from './statusPresentation';
import {answersLine,connectionLines,type ConnectionStatus} from './accountPresentation';
import './pages.css';
const meRef=makeFunctionReference<'query'>('users:me');
const historyRef=makeFunctionReference<'query'>('credits:history');
const statusRef=makeFunctionReference<'query'>('connections:status');
export type AccountSummary={email?:string;availableCents?:number;reservedCents?:number;answerPriceCents?:number|null;eligible?:boolean;callingEnabled?:boolean;name?:string};
export type MoneyRow=CreditEntry&{_id:string;_creationTime:number;taskId?:string};

export function LiveAccountPage(){const {signOut}=useAuthActions();const account=useQuery(meRef,{}) as AccountSummary|undefined;const {results,status}=usePaginatedQuery(historyRef,{},{initialNumItems:5});const connection=useQuery(statusRef,{}) as ConnectionStatus|undefined;return <AccountView account={account} money={status==='LoadingFirstPage'?undefined:(results as MoneyRow[]).slice(0,5)} connection={connection} nameForm={<CustomerName/>} onSignOut={()=>void signOut()}/>}

/** /account signed in (spec "Account and credit"; mockup Wallet.dc.html without its payment buttons, D140). No backend of its own, so /demo can render it. */
export function AccountView({account,money,connection,nameForm,onSignOut,demo}:{account?:AccountSummary;money?:MoneyRow[];connection?:ConnectionStatus;nameForm:ReactNode;onSignOut:()=>void;demo?:boolean}){
 const prefix=demo?'/demo':'';const available=account?.availableCents??0;const per=answersLine(available,account?.answerPriceCents);
 return <section className="page account-page">
  <header className="page-heading"><h1>Account and credit</h1></header>
  <div className="card balance-card">{account?<><span className="stat-label">Your credit</span><strong className="balance">{formatPaise(available)}</strong>{per&&<p>{per}</p>}{(account.reservedCents??0)>0&&<p className="muted">{formatPaise(account.reservedCents!)} on hold for calls in progress</p>}{account.eligible===false&&<p className="amber">Account approval pending</p>}{account.callingEnabled===false&&<p className="amber">Live calling is being connected</p>}<p className="small-note">Paid top-ups aren’t available yet.</p></>:<p role="status">Checking your credit…</p>}</div>
  <section className="card money-card" aria-labelledby="money-heading"><h2 id="money-heading">Charges and refunds</h2>{money===undefined?<p className="muted" role="status">Loading your recent charges…</p>:money.length===0?<p className="muted">No charges yet.</p>:<ul className="money-rows">{money.map(row=>{const text=creditRowText(row);const when=`${taskDate(row._creationTime)} ${clock(row._creationTime)}`;return <li key={row._id}><div><span className="money-title">{text.title}</span><span className="log-sub">{[text.detail,when].filter(Boolean).join(' · ')}</span></div><span className="money-amount">{text.amount}</span></li>})}</ul>}<div className="money-links"><a href={`${prefix}/calls`}>See all calls<Icon name="right" size={16}/></a>{!demo&&<a href="/credit">Credit & charges<Icon name="right" size={16}/></a>}</div></section>
  <div className="card account-card">{nameForm}<div className="account-row"><span className="stat-label">Email</span><span>{account?.email??'…'}</span></div><a className="account-row account-link" href={`${prefix}/connect-assistant`}><span><span className="stat-label">Use in ChatGPT or Claude</span><span className={connection?.connected?'':'muted'}>{connectionLines(connection)[0]}</span></span><Icon name="right" size={18}/></a></div>
  <button type="button" className="secondary sign-out" onClick={onSignOut}>Sign out</button>
 </section>;
}
