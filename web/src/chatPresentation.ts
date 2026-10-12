/** Pure chat wording helpers (no React), shared by the live and demo chat. */
/** One saved chat message (`chat.messages`), or a scripted one on /demo. */
export type ChatItem={_id:string;role:'user'|'assistant';kind:'text'|'question'|'brief'|'picker'|'calls'|'test_call';text:string;payload?:{briefId?:string;question?:string;choices?:string[];index?:number;total?:number;questions?:string[];noun?:string;draftId?:string;taskId?:string}};
export const one=(noun:string)=>noun==='businesses'?'business':noun.replace(/s$/,'');
export const count=(n:number,noun:string)=>`${n} ${n===1?one(noun):noun}`;
export const STARTERS={service:'Plumber near 500032 to fix a leaking tap',product:'iPhone 17 256GB near 500032, best price after card offers',test:'Call me first, so I hear how it sounds'};

/** Composer hint from where the conversation is (spec "Chat flow"). */
export function composerHint(items:ChatItem[]){const last=items.at(-1);if(!last)return 'Ask us to call about anything nearby…';if(last.kind==='question')return 'Type your own answer…';const picker=[...items].reverse().find(i=>i.kind==='picker');if(picker&&!picker.payload?.taskId&&!items.some(i=>i.kind==='calls'&&items.indexOf(i)>items.indexOf(picker)))return `Ask about these ${picker.payload?.noun||'businesses'}…`;if(items.some(i=>i.kind==='calls'))return 'Ask a follow-up…';return last.role==='assistant'?'Type your answer…':'Ask us to call about anything nearby…'}

