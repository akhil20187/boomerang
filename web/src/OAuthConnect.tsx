import {useEffect,useState} from 'react';
import {useAuthToken} from '@convex-dev/auth/react';

export function OAuthConnect(){
 const jwt=useAuthToken();
 const requestId=new URLSearchParams(location.search).get('oauth_request');
 const origin=import.meta.env.VITE_MCP_PUBLIC_URL?.replace(/\/$/,'');
 const [request,setRequest]=useState<{clientName:string;scope:string}>();
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!requestId){setError('Start account linking from your AI assistant’s connection settings.');return;}
  if(!origin){setError('Account linking needs the public connection server address. Ask the owner to finish setup.');return;}
  const controller=new AbortController();
  void fetch(`${origin}/oauth/request?id=${encodeURIComponent(requestId)}`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('This account link has expired. Start again from your AI assistant.');setRequest(await response.json());}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>controller.abort();
 },[requestId,origin]);
 async function approve(approved:boolean){
  if(!jwt||!origin||!requestId)return;
  setBusy(true);setError('');
  try{
   const response=await fetch(`${origin}/oauth/approve`,{method:'POST',headers:{authorization:`Bearer ${jwt}`,'content-type':'application/json'},body:JSON.stringify({requestId,approved})});
   if(!response.ok)throw Error(response.status===401?'Sign in again before linking your account.':'This account could not be linked. Start again from your AI assistant.');
   const {redirectUrl}=await response.json();
   location.assign(redirectUrl);
  }catch(e){setError(e instanceof Error?e.message:'Could not link your account.');setBusy(false);}
 }
 const scopes=new Set(request?.scope.split(/\s+/).filter(Boolean));
 return <section className="card account"><h1>Link your Human MCP account</h1>{request?<><p>{request.clientName} wants to connect to this account.</p><ul>{scopes.has('shops:read')&&<li>Find nearby shops for your product.</li>}{scopes.has('shops:read')&&<li>Read your call progress, answers and available recordings.</li>}{scopes.has('calls:write')&&<li>Start calls to shops you select, using your account credit.</li>}</ul><p>{scopes.has('calls:write')?'Linking your account does not start a call.':'This connection cannot start calls or spend your account credit.'}</p><button className="primary" disabled={!jwt||busy} onClick={()=>void approve(true)}>{busy?'Linking account…':'Link account'}</button><button disabled={busy} onClick={()=>void approve(false)}>Cancel</button></>:!error?<p>Loading account connection…</p>:null}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
