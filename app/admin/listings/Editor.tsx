'use client';
import {useState} from 'react';
import {saveListings} from './actions';
import {type ListingSettings,type ListingTour,autoplaySource,videoSource,listingPlayer} from '@/lib/listing-tour';
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
   const normalized=tours.map(t=>({...t,url:t.embed?playerUrl(t.url):t.url}));
   if(normalized.some(t=>!videoSource(t.url))){setMessage('Enter an HTTPS player URL or paste the embed code supplied by the video site.');return}
   setBusy(true);setMessage('');
   try{setVersion(await saveListings({enabled,tours:normalized},version));setTours(normalized);setMessage(enabled?'Listing tours are published.':'Listing tours are hidden.')}
   catch{setMessage('Unable to save. Check the listing details and your sign-in. Refresh if another owner edited these listings.')}
   finally{setBusy(false)}
 }}>
 <fieldset disabled={busy} className="editor-section"><legend>Homepage visibility</legend>
 <label className="check"><input type="checkbox" checked={enabled} onChange={e=>{toggle(e.target.checked);setMessage('')}}/> Show featured listings on the homepage</label>
 <p>The first listing is featured. Public YouTube, Vimeo and direct video links support muted autoplay when the browser allows it. Instagram controls playback for its embeds. Other sites open from a tour link.</p>
 {tours.map((t,i)=><fieldset key={t.id} className="panel editor-fields"><legend>{t.title||'New listing'}</legend>
 <label>Listing title or address<input required maxLength={160} value={t.title} onChange={e=>update(t.id,{title:e.target.value})}/></label>
 <label>Video source<select value={t.embed?'embed':'link'} onChange={e=>update(t.id,{embed:e.target.value==='embed'})}><option value="link">Video link</option><option value="embed">Embed player</option></select></label>
 {t.embed?<div className="full"><label>Embed link or code<textarea required maxLength={32000} value={t.url} onChange={e=>update(t.id,{url:e.target.value})} placeholder="Paste the player URL or embed code"/></label>
 <button className="button outline" type="button" onClick={()=>{
   const player=listingPlayer({...t,url:playerUrl(t.url)},false);
   if(!player){setMessage('Paste a valid HTTPS embed link or iframe code to preview.');return}
   setPreview({id:t.id,...player});setMessage('');
 }}>Preview player</button>
 {preview?.id===t.id&&(preview.kind==='file'?<video controls playsInline src={preview.src} style={{width:'100%',maxHeight:400}}/>:<iframe title="Listing video preview" src={preview.src} sandbox={preview.kind==='embed'?'allow-scripts allow-presentation':undefined} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{width:'100%',aspectRatio:'16/9',border:0}}/>)}
 </div>:<label>Video link<input type="url" required pattern="https://.+" maxLength={4096} placeholder="https://" value={t.url} onChange={e=>update(t.id,{url:e.target.value,...(videoSource(e.target.value)?.kind==='instagram'?{}:{autoplayUrl:''})})}/></label>}
 {videoSource(t.url)?.kind==='instagram'&&<label className="full">Homepage autoplay video (optional)<input type="url" maxLength={4096} placeholder="https://" value={t.autoplayUrl||''} onChange={e=>update(t.id,{autoplayUrl:e.target.value})}/><small>Paste a direct MP4 link or a YouTube or Vimeo link to the same property tour. The Instagram button will still open your original Reel.</small></label>}
 <label className="full">Property highlights<textarea maxLength={1000} value={t.description} onChange={e=>update(t.id,{description:e.target.value})}/></label>
 {!t.embed&&videoSource(t.url)?.kind==='link'&&<small className="full">This listing will open the tour on its original website.</small>}
 <div className="actions">{i>0&&<button type="button" className="button outline" onClick={()=>{setTours([t,...tours.filter(x=>x.id!==t.id)]);setMessage('')}}>Feature first</button>}<button type="button" className="button outline" onClick={()=>{setTours(tours.filter(x=>x.id!==t.id));if(tours.length===1)toggle(false);setMessage('')}}>Remove listing</button></div>
 </fieldset>)}
 <div className="actions"><button className="button outline" type="button" onClick={()=>{setTours([{id:crypto.randomUUID(),title:'',url:'',description:''},...tours]);setMessage('')}}>Add listing</button>
 <button className="button dark" disabled={enabled&&!tours.length}>{busy?'Saving…':'Save homepage listings'}</button></div>
 </fieldset><p role="status">{message}</p></form>
}
