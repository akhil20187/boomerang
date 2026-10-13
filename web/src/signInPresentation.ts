/** Pure sign-in and sign-out helpers (no React), shared by the live pages and /demo. */
import {formatPaise} from './taskPresentation.ts';

/** Email sign-in links last this long: convex/auth.ts Email `maxAge: 15 * 60` (a test keeps the two in step). */
export const SIGN_IN_LINK_MINUTES=15;
/** Welcome credit for a new account: convex/onboarding.ts grants 10000 paise (a test keeps the two in step). */
export const WELCOME_CREDIT_PAISE=10000;
/** The agreed ₹10 per answer (D135). The live price is a server setting that signed-out pages cannot read. */
export const DEFAULT_ANSWER_PAISE=1000;
/** "Send it again" waits this long after each email. */
export const RESEND_COOLDOWN_MS=30000;
/** Query flag set after signing out; the sign-in page shows its note once, then removes the flag. */
export const SIGNED_OUT_FLAG='signed_out';

export const EXAMPLE_REQUESTS=['Plumber in Gachibowli who can come today','iPhone 17 256GB near Ameerpet, best price after card offers','AI training institutes in Ameerpet: fees and next batch'];

const answers=(n:number)=>`${n} ${n===1?'answer':'answers'}`;
const per=(price?:number|null)=>price&&price>0?price:DEFAULT_ANSWER_PAISE;

export function newHereLine(welcomePaise=WELCOME_CREDIT_PAISE,pricePaise=DEFAULT_ANSWER_PAISE){return `New here? You start with ${formatPaise(welcomePaise)} credit, about ${answers(Math.floor(welcomePaise/per(pricePaise)))}. You pay ${formatPaise(per(pricePaise))} only when a shop answers what you asked.`}
export function welcomeLine(availablePaise:number,pricePaise?:number|null){return `You’re in. Your ${formatPaise(availablePaise)} welcome credit is ready, about ${answers(Math.floor(Math.max(0,availablePaise)/per(pricePaise)))}.`}
export const expiresLine=(minutes=SIGN_IN_LINK_MINUTES)=>`It expires in ${minutes} minutes.`;
export const expiredLine=(minutes=SIGN_IN_LINK_MINUTES)=>`Sign-in links work once, for ${minutes} minutes. We can send you a fresh one.`;
export const SIGNED_OUT_NOTE='You’re signed out. Sign in again any time to see your chats and calls.';
export const SIGN_OUT_TITLE='Sign out of Boomerang?';
/** Results emails exist (convex/notifications.ts "completed", D49), so the second sentence is true. */
export const SIGN_OUT_BODY='Calls already running keep going. Their answers will be here when you sign in again, and we also email you the results.';

/** Where the email link brings the customer back: the page they were on, without a used link code or the signed-out flag. */
export function signInReturnUrl(href:string){const url=new URL(href);url.searchParams.delete('code');url.searchParams.delete(SIGNED_OUT_FLAG);return url.toString()}
/** The page a signed-out customer lands on: the chat, with the one-time signed-out note. */
export const signedOutUrl=(demo=false)=>`${demo?'/demo/signin':'/app'}?${SIGNED_OUT_FLAG}=1`;
/** A new account: nothing asked yet and credit to spend. Used for the one-time welcome note in the empty chat. */
export function isNewAccount({chats,tasks,availablePaise}:{chats:number;tasks:number;availablePaise:number}){return chats===0&&tasks===0&&availablePaise>0}

/** Browser storage can be missing or blocked (private windows, previews): every read and write is optional. */
function read(key:string){try{return localStorage.getItem(key)}catch{return null}}
function write(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* not remembered */}}
export const rememberEmail=(email:string)=>write('boomerang.signin.email',email);
export const lastEmail=()=>read('boomerang.signin.email')||'';
export const welcomeSeen=(userId:string)=>read(`boomerang.welcome.${userId}`)==='1';
export const markWelcomeSeen=(userId:string)=>write(`boomerang.welcome.${userId}`,'1');
