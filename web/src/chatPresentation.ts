/** Pure chat wording helpers (no React), shared by the live and demo chat. */
/** One saved chat message (`chat.messages`), or a scripted one on /demo. */
export type ChatItem={_id:string;role:'user'|'assistant';kind:'text'|'question'|'brief'|'picker'|'calls'|'test_call';text:string;payload?:{briefId?:string;question?:string;choices?:string[];index?:number;total?:number;questions?:string[];noun?:string;draftId?:string;taskId?:string;businessName?:string}};
/** "offices" → "office", "businesses" → "business", "branches" → "branch" (same rule as convex/domain.ts singularNoun). */
export const one=(noun:string)=>{const n=noun.trim();if(/(?:ss|sh|ch|x|z)es$/i.test(n))return n.slice(0,-2);if(/[^aeiou]ies$/i.test(n))return n.slice(0,-3)+'y';return /[^s]s$/i.test(n)?n.slice(0,-1):n};
export const count=(n:number,noun:string)=>`${n} ${n===1?one(noun):noun}`;
export const STARTERS={service:'Plumber near 500032 to fix a leaking tap',product:'iPhone 17 256GB near 500032, best price after card offers',test:'Call me first, so I hear how it sounds'};

/** Composer hint from where the conversation is (spec "Chat flow"). */
export function composerHint(items:ChatItem[]){const last=items.at(-1);if(!last)return 'Ask us to call about anything nearby…';if(last.kind==='question')return 'Type your own answer…';const picker=[...items].reverse().find(i=>i.kind==='picker');if(picker&&!picker.payload?.taskId&&!items.some(i=>i.kind==='calls'&&items.indexOf(i)>items.indexOf(picker)))return `Ask about these ${picker.payload?.noun||'businesses'}…`;if(items.some(i=>i.kind==='calls'))return 'Ask a follow-up…';return last.role==='assistant'?'Type your answer…':'Ask us to call about anything nearby…'}


/** Where a picker searched: the area the customer gave, or the pincode. */
export const pickerPlace=(d:{area?:string;pincode?:string})=>d.area||d.pincode||'you';
/**
 * Picker list foot (DESIGN.md "Shop picker"): "Show 5 more <noun>" adds the next five to the same card; at the end an
 * end-of-list line. "Search up to 20 km" is offered when the list is short (under 10) and the search was 10 km.
 */
export function pickerFoot(total:number,visible:number,radiusKm:number|undefined,noun:string){
 const radius=radiusKm??10;const left=total-visible;
 const more=left>0?`Show ${Math.min(5,left)} more ${Math.min(5,left)===1?one(noun):noun}`:undefined;
 const Noun=noun.charAt(0).toUpperCase()+noun.slice(1);
 const end=left>0?undefined:total?`No more ${noun} within ${radius} km. ${Noun} with fewer than 50 Google ratings are hidden.`:`No ${noun} came up within ${radius} km.`;
 return {more,end,widen:!more&&radius<20&&total<10};
}

/** Where a picker's rows came from: Google nearby, Google matches for a named business, numbers the customer sent, or numbers found on the web. */
export type PickerKind='nearby'|'named'|'sent'|'web';
export function pickerKind(d:{source?:string;shops:{source?:string}[]},businessName?:string):PickerKind{if(d.source==='supplied')return d.shops.some(s=>s.source==='assistant')?'web':'sent';return businessName?'named':'nearby'}
/** Picker headline (D163): "1 office near Miyapur", "Matches for “X” near Miyapur", "2 businesses you sent", "Web results for “X”". */
export function pickerTitle(kind:PickerKind,total:number,noun:string,place:string,businessName?:string){
 if(kind==='web')return `Web results for “${businessName||'this business'}”`;
 if(kind==='sent')return `${count(total,noun)} you sent`;
 if(kind==='named')return `Matches for “${businessName}” near ${place}`;
 return `${count(total,noun)} near ${place}`;
}
