import {useEffect,useRef,useState} from 'react';
import {useAuthActions} from '@convex-dev/auth/react';
import {SIGN_OUT_BODY,SIGN_OUT_TITLE,signedOutUrl} from './signInPresentation';
import './signin.css';

/**
 * "Sign out of Boomerang?" (JourneyPhone.dc.html): a bottom sheet on phones, a small dialog on laptops.
 * Focus starts on "Stay signed in", Tab stays inside, Escape or the backdrop closes, and focus returns to the
 * button that opened it (or `fallbackFocus` when that button is gone, e.g. inside a closed phone menu).
 */
export function SignOutDialog({open,onClose,onConfirm,fallbackFocus}:{open:boolean;onClose:()=>void;onConfirm:()=>Promise<void>|void;fallbackFocus?:()=>HTMLElement|null|undefined}){
 const box=useRef<HTMLDivElement>(null);const stay=useRef<HTMLButtonElement>(null);const [busy,setBusy]=useState(false);
 const close=useRef(onClose);close.current=onClose;const fallback=useRef(fallbackFocus);fallback.current=fallbackFocus;
 useEffect(()=>{
  if(!open)return;
  const opener=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:null;
  stay.current?.focus();
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();return}
   if(e.key!=='Tab'||!box.current)return;
   const items=[...box.current.querySelectorAll<HTMLElement>('button:not(:disabled)')];if(!items.length){e.preventDefault();return}
   const a=items[0],z=items[items.length-1],at=document.activeElement;
   if(!box.current.contains(at)){e.preventDefault();a.focus()}else if(e.shiftKey&&at===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&at===z){e.preventDefault();a.focus()}
  };
  document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('keydown',key,true);document.body.style.overflow=previous;const shown=(el:HTMLElement|null)=>!!el&&el.isConnected&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';const target=shown(opener)?opener:fallback.current?.()??null;target?.focus()};
 },[open]);
 if(!open)return null;
 return <div className="dialog-scrim" onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <div ref={box} className="dialog" role="dialog" aria-modal="true" aria-labelledby="signout-title" aria-describedby="signout-body">
   <h2 id="signout-title">{SIGN_OUT_TITLE}</h2>
   <p id="signout-body">{SIGN_OUT_BODY}</p>
   <div className="dialog-actions">
    <button type="button" className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{await onConfirm()}finally{setBusy(false)}}}>{busy?'Signing out…':'Sign out'}</button>
    <button ref={stay} type="button" className="secondary" disabled={busy} onClick={onClose}>Stay signed in</button>
   </div>
  </div>
 </div>
}

/** Sign out, then land on the sign-in page with its one-time note. A full page load clears everything from the old session. */
export function useLiveSignOut(){const {signOut}=useAuthActions();return async()=>{await signOut();location.replace(signedOutUrl())}}
