import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useAuthActions} from '@convex-dev/auth/react';
import {Logo} from './AppShell';
import {customerError} from './errors';
import {EXAMPLE_REQUESTS,RESEND_COOLDOWN_MS,SIGNED_OUT_FLAG,SIGNED_OUT_NOTE,expiredLine,expiresLine,lastEmail,newHereLine,rememberEmail,signInReturnUrl} from './signInPresentation';
import './signin.css';

/**
 * The email link lands on the site with `?code=…`. @convex-dev/auth removes the code from the address bar and
 * verifies it; an expired or used code just leaves the visitor signed out, with no error. So we note here, before
 * the auth provider runs, that this page load came from a link: signed out afterwards means the link failed.
 */
export const ARRIVED_WITH_LINK=typeof location!=='undefined'&&new URLSearchParams(location.search).has('code')&&!location.pathname.startsWith('/demo');

/** Signed-out frame (mockups SignIn.dc.html, JourneyPhone.dc.html): logo and "See a demo", one centred column. */
export function SignedOutFrame({children,demo=false}:{children:ReactNode;demo?:boolean}){
 return <div className="signed-out">
  <header className="signed-out-top"><a href={demo?'/demo/signin':'/app'} className="app-brand" aria-label="Boomerang home"><Logo/><span>boomerang</span></a><a href="/demo" className="see-demo">See a demo</a></header>
  <main className="signin-main">{children}</main>
 </div>
}

export type SignInStage='signin'|'sent'|'expired';
type SignInProps={send:(email:string)=>Promise<void>;stage?:SignInStage;email?:string;signedOut?:boolean;demo?:boolean};
/** Sign in → check your email (send again, use a different email) → or, after a failed link, "That link has expired". */
export function SignInPage({send,stage:initialStage='signin',email:initialEmail='',signedOut=false,demo=false}:SignInProps){
 const [stage,setStage]=useState<SignInStage>(initialStage);const [email,setEmail]=useState(initialEmail);const [sentTo,setSentTo]=useState(initialStage==='sent'?initialEmail:'');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [resent,setResent]=useState(false);const [cooling,setCooling]=useState(initialStage==='sent');
 const heading=useRef<HTMLHeadingElement>(null);const first=useRef(true);const cool=useRef<ReturnType<typeof setTimeout>>(undefined);
 // Move focus to the new heading when the step changes, so screen readers hear it (not on first load).
 useEffect(()=>{if(first.current){first.current=false;return}heading.current?.focus()},[stage]);
 useEffect(()=>{if(!cooling)return;cool.current=setTimeout(()=>setCooling(false),RESEND_COOLDOWN_MS);return()=>clearTimeout(cool.current)},[cooling]);
 async function deliver(to:string,again=false){const clean=to.trim();if(!clean||busy)return;setBusy(true);setError('');try{await send(clean);rememberEmail(clean);setSentTo(clean);setResent(again);setCooling(true);setStage('sent')}catch(e){setError(customerError(e,'Couldn’t send the sign-in email. Check the address and try again.'))}finally{setBusy(false)}}
 const errorLine=<p className="error" role="alert">{error}</p>;
 const emailForm=(button:string)=><form onSubmit={e=>{e.preventDefault();void deliver(email)}}>
  <label htmlFor="signin-email">Email</label>
  <input id="signin-email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" aria-describedby={error?'signin-error':undefined}/>
  <button type="submit" className="primary" disabled={busy}>{busy?'Sending your link…':button}</button>
  <p className="error" role="alert" id="signin-error">{error}</p>
 </form>;
 return <div className="signin">
  {demo&&<p className="demo-banner">Demo of the sign-in page · no email is sent</p>}
  {signedOut&&stage==='signin'&&<p className="signin-status" role="status">{SIGNED_OUT_NOTE}</p>}
  {stage==='signin'&&<>
   <div><h1 ref={heading} tabIndex={-1}>Sign in to Boomerang</h1><p className="signin-lede">We’ll email you a link. No password.</p></div>
   {emailForm('Email me a sign-in link')}
   <p className="signin-note">{newHereLine()}</p>
   <section className="signin-examples" aria-labelledby="signin-examples"><h2 id="signin-examples">Then just tell us what to call about</h2><ul>{EXAMPLE_REQUESTS.map(x=><li key={x}>{x}</li>)}</ul></section>
  </>}
  {stage==='sent'&&<div className="signin-step" role="status">
   <h1 ref={heading} tabIndex={-1}>Check your email</h1>
   <p className="signin-lede">We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device. {expiresLine()}</p>
   <p className="signin-note">Not there? Check spam, or wait a minute and send it again.</p>
   <div className="link-actions"><button type="button" onClick={()=>void deliver(sentTo,true)} disabled={busy||cooling}>{busy?'Sending…':resent&&cooling?'Sent again':'Send it again'}</button><button type="button" onClick={()=>{setStage('signin');setError('');setEmail(sentTo)}}>Use a different email</button></div>
   {errorLine}
  </div>}
  {stage==='expired'&&<>
   <div className="signin-step" role="alert"><h1 ref={heading} tabIndex={-1}>That link has expired</h1><p className="signin-lede">{expiredLine()}</p></div>
   {initialEmail&&email===initialEmail?<div className="signin-step">
    <button type="button" className="primary" disabled={busy} onClick={()=>void deliver(email)}>{busy?'Sending your link…':'Send a new link'}</button>
    <p className="signin-note">We’ll send it to <strong>{email}</strong>.</p>
    <div className="link-actions"><button type="button" onClick={()=>setEmail('')}>Use a different email</button></div>
    {errorLine}
   </div>:emailForm('Send a new link')}
  </>}
 </div>
}

/** The live sign-in page for every signed-out route. The email link returns to the page the customer was on. */
export function LiveSignIn(){
 const {signIn}=useAuthActions();
 const [signedOut]=useState(()=>new URLSearchParams(location.search).has(SIGNED_OUT_FLAG));
 // Show the signed-out note once: drop the flag from the address so a refresh or the email link doesn't repeat it.
 useEffect(()=>{if(signedOut)history.replaceState(history.state,'',signInReturnUrl(location.href))},[signedOut]);
 const expired=ARRIVED_WITH_LINK;
 return <SignedOutFrame><SignInPage stage={expired?'expired':'signin'} email={expired?lastEmail():''} signedOut={signedOut} send={async email=>{await signIn('resend',{email,redirectTo:signInReturnUrl(location.href)})}}/></SignedOutFrame>
}
