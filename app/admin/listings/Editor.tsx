'use client';
import {useState} from 'react';
import {ListingPlayer} from '@/components/ListingPlayer';
import styles from '@/components/ListingTours.module.css';
import {saveListings} from './actions';
import {type ListingSettings,type ListingTour,autoplaySource,videoSource,zillowListingUrl,listingPlayer} from '@/lib/listing-tour';
function playerUrl(value:string){
 const text=value.trim();
 if(!text.startsWith('<'))return text;
 const doc=new DOMParser().parseFromString(text,'text/html');
 return doc.querySelector('iframe[src]')?.getAttribute('src') ||
   doc.querySelector('blockquote.instagram-media[data-instgrm-permalink]')?.getAttribute('data-instgrm-permalink') || '';
}
export function Editor({settings,revision}:{settings:ListingSettings;revision:string}){
 const [enabled,toggle]=useState(settings.enabled),[tours,setTours]=useState(settings.tours),[version,setVersion]=useState(revision);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [preview,setPreview]=useState<{id:string;src:string;kind:string}|null>(null);
 function update(id:string,patch:Partial<ListingTour>){setPreview(null);setMessage('');setTours(all=>all.map(t=>t.id===id?{...t,...patch}:t))}
 return <form className="admin-form" onSubmit={async event=>{
   event.preventDefault();
   if(tours.some(t=>t.autoplayUrl?.trim()&&!autoplaySource(t.autoplayUrl))){setMessage('Use a direct video file, YouTube video or Vimeo video for homepage autoplay.');return}
   if(tours.some(t=>t.zillowUrl?.trim()&&!zillowListingUrl(t.zillowUrl))){setMessage('Paste the Zillow home details link for this property. Open the home on Zillow and copy its full address from your browser.');return}
   const normalized=tours.map(t=>({...t,url:t.embed?playerUrl(t.url):t.url}));
   if(normalized.some(t=>!videoSource(t.url))){setMessage('Enter an HTTPS player URL or paste the embed code supplied by the video site.');return}
   setBusy(true);setMessage('');
   try{setVersion(await saveListings({enabled,tours:normalized},version));setTours(normalized);setMessage(enabled?'Listing tours are published.':'Listing tours are hidden.')}
   catch{setMessage('Unable to save. Check the listing details and your sign-in. Refresh if another owner edited these listings.')}
   finally{setBusy(false)}
 }}>
 <fieldset disabled={busy} className="editor-section"><legend>Homepage visibility</legend>
 <label className="check"><input type="checkbox" checked={enabled} onChange={e=>{toggle(e.target.checked);setMessage('')}}/> Show featured listings on the homepage</label>
 <p>The first listing is featured. Public YouTube, Vimeo and direct video links support muted autoplay when the browser allows it. Instagram controls playback for its embeds. Use the preview to check whether a tour plays on this page.</p>
 {tours.map((t,i)=><fieldset key={t.id} className="panel editor-fields"><legend>{t.title||'New listing'}</legend>
 <label>Listing title or address<input required maxLength={160} value={t.title} onChange={e=>update(t.id,{title:e.target.value})}/></label>
 <label>Video source<select value={t.embed?'embed':'link'} onChange={e=>update(t.id,{embed:e.target.value==='embed'})}><option value="link">Video link</option><option value="embed">Embed player</option></select></label>
 {t.embed?<div className="full"><label>Embed link or code<textarea required maxLength={32000} value={t.url} onChange={e=>update(t.id,{url:e.target.value})} placeholder="Paste the player URL or embed code"/></label>
 </div>:<label>Video link<input type="url" required pattern="https://.+" maxLength={4096} placeholder="https://" value={t.url} onChange={e=>update(t.id,{url:e.target.value})}/></label>}
 <label className="full">On-page video URL (optional)<input type="url" maxLength={4096} placeholder="https://" value={t.autoplayUrl||''} onChange={e=>update(t.id,{autoplayUrl:e.target.value})}/><small>If the preview says “Watch on Instagram” or does not play here, paste a direct MP4, YouTube or Vimeo link for this same tour. The link below the public player will still open the original listing video.</small></label>
 <div className="full"><button className="button outline" type="button" onClick={()=>{
   const player=listingPlayer({...t,url:t.embed?playerUrl(t.url):t.url},false);
   if(!player||t.autoplayUrl?.trim()&&!autoplaySource(t.autoplayUrl)){setMessage('Check the video links before previewing.');return}
   setPreview({id:t.id,...player});setMessage('');
 }}>Preview on-page playback</button>
 {preview?.id===t.id&&<div className={styles.media+' '+styles.preview}><ListingPlayer video={preview} title={t.title||'Listing preview'}/></div>}
 </div>
 <label className="full">Zillow listing URL<input type="url" maxLength={4096} placeholder="https://www.zillow.com/homedetails/…" value={t.zillowUrl||''} onChange={e=>update(t.id,{zillowUrl:e.target.value})}/><small>Paste this home's Zillow property page to show “See on Zillow” beneath the tour.</small></label>
 <label className="full">Property highlights<textarea maxLength={1000} value={t.description} onChange={e=>update(t.id,{description:e.target.value})}/></label>
 {!t.embed&&videoSource(t.url)?.kind==='link'&&!t.autoplayUrl&&<small className="full">Add an on-page video URL or choose Embed player to enable playback in the carousel.</small>}
 <div className="actions">{i>0&&<button type="button" className="button outline" onClick={()=>{setTours([t,...tours.filter(x=>x.id!==t.id)]);setMessage('')}}>Feature first</button>}<button type="button" className="button outline" onClick={()=>{setTours(tours.filter(x=>x.id!==t.id));if(tours.length===1)toggle(false);setMessage('')}}>Remove listing</button></div>
 </fieldset>)}
 <div className="actions"><button className="button outline" type="button" onClick={()=>{setTours([{id:crypto.randomUUID(),title:'',url:'',description:''},...tours]);setMessage('')}}>Add listing</button>
 <button className="button dark" disabled={enabled&&!tours.length}>{busy?'Saving…':'Save homepage listings'}</button></div>
 </fieldset><p role="status">{message}</p></form>
}
