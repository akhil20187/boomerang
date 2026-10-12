/** Connect page (/connect-assistant) and Account page (/account): pure helpers. */
import {formatPaise,taskDate} from './taskPresentation.ts';
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
