import {useEffect,useRef,useState} from 'react';
import {customerError} from './errors';
import {firstNameNote} from './accountPresentation';

/**
 * "Name" row of Your details (Wallet.dc.html / ProfileLaptop.dc.html). Shows the saved name and what shops hear; "Edit"
 * opens an inline form. Validation matches users.updateProfile (required, up to 80 characters). No backend of its own,
 * so /demo can show it.
 */
export function NameRow({saved,onSave}:{/** undefined while loading */saved?:string;onSave:(name:string)=>Promise<unknown>}){
 const [editing,setEditing]=useState(false);const [draft,setDraft]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null);const editButton=useRef<HTMLButtonElement>(null);const backToButton=useRef(false);
 // Opening moves focus into the field; closing (Save or Cancel) returns it to "Edit".
 useEffect(()=>{if(editing)input.current?.focus();else if(backToButton.current){backToButton.current=false;editButton.current?.focus()}},[editing]);
 const close=()=>{backToButton.current=true;setError('');setEditing(false)};
 const save=async()=>{setBusy(true);setMessage('');setError('');try{await onSave(draft.trim());setMessage('Name saved.');close()}catch(e){setError(customerError(e,'Couldn’t save your name. Try again.'))}finally{setBusy(false)}};
 return <div className="name-detail">
  {editing?<form className="name-form" onSubmit={e=>{e.preventDefault();void save()}}>
   <label htmlFor="profile-name" className="detail-label">Name</label>
   <input id="profile-name" ref={input} autoComplete="name" required maxLength={80} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.preventDefault();close()}}} aria-describedby="profile-name-note"/>
   <span id="profile-name-note" className="log-sub">Shops hear only your first name. We never share your email, phone or address.</span>
   <div className="name-actions"><button type="submit" className="primary" disabled={busy}>{busy?'Saving…':'Save'}</button><button type="button" className="secondary" disabled={busy} onClick={close}>Cancel</button></div>
   <p role="alert" className="error">{error}</p>
  </form>
  :<div className="detail-row">
   <span className="detail-text"><span className="detail-label">Name</span><span>{saved===undefined?'…':saved||'Not added yet'}</span><span className="log-sub">{saved===undefined?'':firstNameNote(saved)}</span></span>
   <button ref={editButton} type="button" className="secondary" aria-label={saved?'Edit name':'Add your name'} disabled={saved===undefined} onClick={()=>{setDraft(saved??'');setMessage('');setError('');setEditing(true)}}>{saved?'Edit':'Add'}</button>
  </div>}
  <p role="status" className="name-saved">{message}</p>
 </div>;
}
