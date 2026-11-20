'use client';
import {useState} from 'react';
import {saveListings} from './actions';
import {type ListingSettings,type ListingTour,videoSource} from '@/lib/listing-tour';
export function Editor({settings,revision}:{settings:ListingSettings;revision:string}){
 const [enabled,toggle]=useState(settings.enabled),[tours,setTours]=useState(settings.tours),[version,setVersion]=useState(revision);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function update(id:string,patch:Partial<ListingTour>){setMessage('');setTours(all=>all.map(t=>t.id===id?{...t,...patch}:t))}
 return <form className="admin-form" onSubmit={async event=>{
   event.preventDefault();setBusy(true);setMessage('');
   try{setVersion(await saveListings({enabled,tours},version));setMessage(enabled?'Listing tours are published.':'Listing tours are hidden.')}
   catch{setMessage('Unable to save. Check the listing details and your sign-in. Refresh if another owner edited these listings.')}
   finally{setBusy(false)}
 }}>
 <fieldset disabled={busy} className="editor-section"><legend>Homepage visibility</legend>
 <label className="check"><input type="checkbox" checked={enabled} onChange={e=>{toggle(e.target.checked);setMessage('')}}/> Show featured listings on the homepage</label>
 <p>The first listing is featured. Public YouTube, Vimeo and direct video links support muted autoplay when the browser allows it. Instagram controls playback for its embeds. Other sites open from a tour link.</p>
 {tours.map((t,i)=><fieldset key={t.id} className="panel editor-fields"><legend>{t.title||'New listing'}</legend>
 <label>Listing title or address<input required maxLength={160} value={t.title} onChange={e=>update(t.id,{title:e.target.value})}/></label>
 <label>Video link<input type="url" required pattern="https://.+" maxLength={4096} placeholder="https://" value={t.url} onChange={e=>update(t.id,{url:e.target.value})}/></label>
 <label className="full">Property highlights<textarea maxLength={1000} value={t.description} onChange={e=>update(t.id,{description:e.target.value})}/></label>
 {videoSource(t.url)?.kind==='link'&&<small className="full">This listing will open the tour on its original website.</small>}
 <div className="actions">{i>0&&<button type="button" className="button outline" onClick={()=>{setTours([t,...tours.filter(x=>x.id!==t.id)]);setMessage('')}}>Feature first</button>}<button type="button" className="button outline" onClick={()=>{setTours(tours.filter(x=>x.id!==t.id));if(tours.length===1)toggle(false);setMessage('')}}>Remove listing</button></div>
 </fieldset>)}
 <div className="actions"><button className="button outline" type="button" onClick={()=>{setTours([{id:crypto.randomUUID(),title:'',url:'',description:''},...tours]);setMessage('')}}>Add listing</button>
 <button className="button dark" disabled={enabled&&!tours.length}>{busy?'Saving…':'Save homepage listings'}</button></div>
 </fieldset><p role="status">{message}</p></form>
}
