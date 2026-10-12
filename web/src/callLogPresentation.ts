/** Call log page (/calls, spec "Call log"): pure helpers for rows, filters, day groups, totals and the CSV download. */
import {chargeText,formatPaise,taskDate} from './taskPresentation.ts';
import {callLogDetail,clock,shopStatus,type CallLogRow,type Tone} from './statusPresentation.ts';

/** One row of `api.callLog.log`: one call attempt. */
export type LogRow=CallLogRow&{shopJobId?:string;taskLabel:string;attemptNumber:number;executor?:string;isLatestAttempt?:boolean;attemptStatus?:string;jobState?:string;answeredAt?:number;endedAt?:number;selfTest?:boolean;verification?:boolean};
/** `api.callLog.summary`: this calendar month (India time). */
export type LogSummary={calls:number;tries:number;answered:number;chargedPaise:number;refundedPaise:number;notChargedCount:number;availablePaise:number;truncated?:boolean};
export type LogFilter='all'|'charged'|'not_charged'|'needs_you';
export const LOG_FILTERS:{id:LogFilter;label:string}[]=[{id:'all',label:'All calls'},{id:'charged',label:'Charged'},{id:'not_charged',label:'Not charged'},{id:'needs_you',label:'Needs you'}];

/** Simulated verification tasks are not real calls, so the log never shows them. */
export const realRows=(rows:LogRow[])=>rows.filter(r=>!r.verification);

/** Business column: the customer's own test call reads "Test call to you". */
export const rowBusiness=(r:LogRow)=>r.selfTest?'Test call to you':r.businessName;

/** Result line in its DESIGN.md colour. An earlier unanswered try that we retried reads "No answer · tried again". */
export function rowResult(r:LogRow):[string,Tone]{if(r.isLatestAttempt===false&&(r.state==='retry_scheduled'||r.attemptStatus==='unanswered'))return ['No answer · tried again','amber'];return shopStatus(callLogDetail(r).shop)}

/** Charge column. Never green (D72): the page renders it in grey. Test calls are free. */
export function rowCharge(r:LogRow){if(r.selfTest||r.chargeNote?.kind==='free')return 'Free';return chargeText(r.chargeNote)||'Not charged'}

/** Amount actually charged for this try, in paise (0 unless charged). */
export const chargedPaise=(r:LogRow)=>r.chargeNote?.kind==='charged'&&!r.selfTest?r.chargeNote.amountCents:0;

const NEEDS_YOU=new Set(['personal_call_needed','unreachable','incomplete_answer']);
/** Needs you: the shop's final try ended with a personal-call request, no answer after retries, or a partial answer. */
export function needsYou(r:LogRow){if(r.selfTest||r.isLatestAttempt===false)return false;if(NEEDS_YOU.has(r.state||''))return true;return r.state==='answered'&&rowResult(r)[1]==='amber'}

export function filterRows(rows:LogRow[],filter:LogFilter){return rows.filter(r=>{const kind=r.selfTest?'free':r.chargeNote?.kind;switch(filter){case 'charged':return kind==='charged';case 'not_charged':return kind!=='charged'&&kind!=='held';case 'needs_you':return needsYou(r);default:return true}})}

/** "1:42" from seconds; "—" when unknown. */
export function lengthText(seconds?:number){if(seconds===undefined||seconds===null||!Number.isFinite(seconds))return '—';const s=Math.max(0,Math.round(seconds));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}

/** "Today 4:04 pm", "Yesterday 6:10 pm", "9 Oct 11:20 am". */
export const whenText=(t?:number)=>t?`${taskDate(t)} ${clock(t)}`:'—';

/** Phone view: rows grouped by day, keeping their newest-first order. */
export function groupByDay(rows:LogRow[]){const groups:{day:string;rows:LogRow[]}[]=[];for(const r of rows){const day=r.startedAt?taskDate(r.startedAt):'Earlier';const last=groups[groups.length-1];if(last&&last.day===day)last.rows.push(r);else groups.push({day,rows:[r]})}return groups}

/** Totals strip from the monthly summary. */
export function totals(s:LogSummary){return [
 {label:'Calls this month',value:String(s.calls),note:`${s.tries} ${s.tries===1?'try':'tries'}`},
 {label:'Answered',value:String(s.answered),note:s.calls?`of ${s.calls} ${s.calls===1?'call':'calls'}`:''},
 {label:'Charged',value:formatPaise(s.chargedPaise),note:[s.notChargedCount?`${s.notChargedCount} not charged`:'',s.refundedPaise?`${formatPaise(s.refundedPaise)} refunded`:''].filter(Boolean).join(' · ')},
 {label:'Credit left',value:formatPaise(s.availablePaise),note:''}]}

/** Spreadsheet-safe cell (CSV formula injection guard): every text cell starting with = + - @ tab or carriage return gets a leading ', then normal CSV quoting. Numbers (rupee amounts) stay unprefixed. */
export function csvCell(value:string|number){if(typeof value==='number')return `"${value}"`;const safe=/^[=+\-@\t\r]/.test(value)?`'${value}`:value;return `"${safe.replace(/"/g,'""')}"`}

/** CSV of the rows on screen. No recording links. Amounts are in rupees. */
export function callLogCsv(rows:LogRow[]){const head=['When','Business','Task','Phone','Try','Caller','Result','Length','Charge','Charged (₹)'];const lines=rows.map(r=>[r.startedAt?new Date(r.startedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'',rowBusiness(r),r.taskLabel,r.phone||'',`Try ${r.attemptNumber}`,'AI agent',rowResult(r)[0],lengthText(r.durationSeconds),rowCharge(r),chargedPaise(r)/100]);return [head,...lines].map(line=>line.map(csvCell).join(',')).join('\r\n')+'\r\n'}

/** Call log page size (rows, after the filter). */
export const ROWS_PER_PAGE=10;
export type MoreState='can'|'loading'|'done';
/**
 * Page controls for the call log. `count` is the number of loaded rows that match the filter; `more` says whether the
 * server has older calls. A total ("of M") is shown only once every call is loaded; until then the label gives the range.
 */
export function pageInfo(count:number,page:number,more:MoreState,per=ROWS_PER_PAGE){
 const start=(page-1)*per,end=Math.min(count,start+per),complete=more==='done';
 const totalPages=complete?Math.max(1,Math.ceil(count/per)):undefined;
 const range=end>start?`Showing ${start+1}–${end}`:'';
 return {start,end,totalPages,
  /** this page is not full yet and older calls exist: load the next batch */
  needsMore:!complete&&count<page*per,
  hasPrev:page>1,
  hasNext:count>page*per||!complete,
  /** last valid page once everything is loaded (a filter or a deleted call can shrink the list) */
  lastPage:totalPages,
  label:totalPages?`Page ${page} of ${totalPages}`:`Page ${page}${range?` · ${range}`:''}`,
  /** hide the controls when everything fits on one page */
  single:totalPages===1};
}
