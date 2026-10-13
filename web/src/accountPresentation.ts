/** Connect page (/connect-assistant) and Account page (/account): pure helpers. */
import {formatPaise,taskDate,taskLabel} from './taskPresentation.ts';
import {clock} from './statusPresentation.ts';

/** MCP address and SKILL.md link from the existing build settings (VITE_MCP_PUBLIC_URL, VITE_APP_PUBLIC_URL), falling back to this site. */
export function connectAddresses({mcpUrl,appUrl,origin}:{mcpUrl?:string;appUrl?:string;origin:string}){const base=(value:string)=>{try{return new URL(value).origin}catch{return origin}};const mcp=base(mcpUrl||appUrl||origin);const app=base(appUrl||origin);return {mcp:`${mcp}/mcp`,skill:`${app}/SKILL.md`}}

export type ConnectionStatus={connected:boolean;clients:{name?:string;lastUsedAt?:number}[]};
/** "Connected · ChatGPT · last refreshed today 4:04 pm" or "Not connected yet". One line per connected app. */
export function connectionLines(status:ConnectionStatus|undefined){if(!status)return ['Checking…'];if(!status.connected||!status.clients.length)return ['Not connected yet'];return status.clients.map(c=>['Connected',c.name||'AI assistant',c.lastUsedAt?`last refreshed ${taskDate(c.lastUsedAt).replace(/^Today$/,'today').replace(/^Yesterday$/,'yesterday')} ${clock(c.lastUsedAt)}`:''].filter(Boolean).join(' · '))}

/** "About 8 answers · ₹10 per shop that answers". Price comes from the server (users.me answerPriceCents). */
export function answersLine(availableCents:number,priceCents?:number|null){if(!priceCents||priceCents<=0)return '';const n=Math.floor(Math.max(0,availableCents)/priceCents);return `About ${n} ${n===1?'answer':'answers'} · ${formatPaise(priceCents)} per shop that answers`}

export type ConnectApp='chatgpt'|'claude';
/** Three short steps per app. Kept generic on purpose (menu names change often); matches web/public/SKILL.md. */
export const CONNECT_STEPS:Record<ConnectApp,string[]>={
 chatgpt:['Open ChatGPT Settings and turn on Developer mode. It depends on your plan and workspace.','Add a custom connector (app), name it Boomerang and paste the address.','Sign in with the same email you use here, then add Boomerang to a chat from the + menu.'],
 claude:['In Claude, open your settings and find Connectors.','Add a custom connector, name it Boomerang and paste the address.','Choose Connect and sign in with the same email you use here.'],
};

/** Profile header badge: first letter of the name, else of the email. */
export function profileInitial(name?:string,email?:string){const source=(name?.trim()||email?.trim()||'');return source?Array.from(source)[0].toUpperCase():'?'}
/** The name our AI says on calls. Mirrors convex/calls.ts: the first word of the saved name, or "our customer". */
export function callerFirstName(name?:string){return name?.trim().split(' ')[0]||'our customer'}
/** Line under the Name row (D159: shops never get the full name). */
export function firstNameNote(name?:string){return name?.trim()?`Shops hear only your first name: “calling for ${callerFirstName(name)}”.`:'No name yet. Shops hear “calling for our customer”.'}
const IST='Asia/Kolkata';
/** "Oct 2026" for the profile header; "1 Oct 2026" for the Member since row. India time. */
export function memberSinceMonth(t:number){return new Date(t).toLocaleDateString('en-IN',{month:'short',year:'numeric',timeZone:IST})}
export function memberSinceDate(t:number){return new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:IST})}

export type HistoryFilter='all'|'charge'|'refund'|'grant';
export const HISTORY_FILTERS:{id:HistoryFilter;label:string;empty:string}[]=[
 {id:'all',label:'All',empty:'No credits, charges or refunds yet.'},
 {id:'charge',label:'Charges',empty:'No charges yet.'},
 {id:'refund',label:'Refunds',empty:'No refunds yet.'},
 {id:'grant',label:'Credits',empty:'No credits yet.'},
];
export type HistoryEntry={type:string;amountCents:number;_creationTime:number;shopName?:string;productName?:string;note?:string;welcome?:boolean};
/** "today 4:04 pm", "yesterday 9:10 am", "9 Oct 4:04 pm". */
export function historyWhen(t:number){return `${taskDate(t).replace(/^Today$/,'today').replace(/^Yesterday$/,'yesterday')} ${clock(t)}`}
/** One row of "Credits, charges and refunds": title, "Charge · Plumber in Gachibowli · today 4:04 pm", amount (never green). */
export function historyRow(e:HistoryEntry){
 const task=e.productName?taskLabel(e.productName):'';const shop=e.shopName??'Shop';const when=historyWhen(e._creationTime);const sub=(...parts:(string|undefined)[])=>parts.filter(Boolean).join(' · ');
 switch(e.type){
  case 'grant':return {title:e.welcome?'Welcome credit':'Credit added',sub:sub('Credit',when),amount:'+'+formatPaise(e.amountCents)};
  case 'charge':return {title:shop,sub:sub('Charge',task,when),amount:'−'+formatPaise(Math.abs(e.amountCents))};
  case 'refund':return {title:shop,sub:sub('Refund',task,when),amount:'+'+formatPaise(Math.abs(e.amountCents))};
  case 'release':return {title:shop,sub:sub('Not charged',e.note,task,when),amount:'₹0'};
  default:return {title:shop,sub:sub(task,when),amount:formatPaise(e.amountCents)};
 }
}
export type CreditTotals={creditsCents:number;chargesCents:number;refundsCents:number};
/** The three all-time boxes under the balance. */
export function totalsBoxes(t:CreditTotals|undefined){return [{label:'Credits',value:t?formatPaise(t.creditsCents):'…'},{label:'Charges',value:t?formatPaise(t.chargesCents):'…'},{label:'Refunds',value:t?formatPaise(t.refundsCents):'…'}]}
