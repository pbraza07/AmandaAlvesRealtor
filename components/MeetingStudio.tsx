'use client';
import {copy,textLanguage} from '@/lib/report-language';
import {adminResponse} from '@/lib/admin-response';
import {FirefliesUsage} from './FirefliesUsage';
import {useEffect,useRef,useState,type FormEvent} from 'react';
type Meeting={deliveryAttempts?:number;nextDeliveryAt?:string|null;lastCheckedAt?:string|null;uploadLanguage?:string|null;id:string;title:string;fileName:string;status:string;overview:string;agenda:string;notes:string;actionItems:string;reviewedAt:string|null;createdAt:string;expiresAt:string;error:string|null;transcript?:{sentences?:{text:string;start_time:number;speaker_name?:string}[]}};
type Connection={connected:boolean;email:string;canConnect:boolean;environmentKey:boolean};
const labels:Record<string,string>={QUEUED:'Saved · queued for Fireflies',RETRY_WAIT:'Automatic retry scheduled',INCOMPLETE:'Upload again',PROVIDER_DELAYED:'Waiting on Fireflies',ACTION_REQUIRED:'Needs attention',LANGUAGE_REVIEW:'Check source language',SAVING:'Saving recording',UPLOADING:'Submitting',PROCESSING:'Transcribing',SUMMARIZING:'Preparing summary',READY:'PDF ready',CHECK_REQUIRED:'Submission unconfirmed'};
const editorText={
 en:{review:'Review your report',title:'Meeting title',actions:'Commitments and next steps',save:'Save reviewed report',download:'Download branded PDF',include:'Include full transcript in PDF',saveFirst:'Save your edits to download the PDF.',hint:'Check names, facts, responsibilities and deadlines against the transcript before sharing.'},
 pt:{review:'Revisar relatório',title:'Título da reunião',actions:'Compromissos e próximos passos',save:'Salvar relatório revisado',download:'Baixar PDF',include:'Incluir transcrição completa no PDF',saveFirst:'Salve as alterações para baixar o PDF.',hint:'Confira os nomes, fatos, responsáveis e prazos com a transcrição antes de compartilhar.'},
 es:{review:'Revisar informe',title:'Título de la reunión',actions:'Compromisos y próximos pasos',save:'Guardar informe revisado',download:'Descargar PDF',include:'Incluir la transcripción completa en el PDF',saveFirst:'Guarde los cambios para descargar el PDF.',hint:'Compruebe los nombres, datos, responsables y plazos con la transcripción antes de compartir.'}
};
async function api(url:string,options?:RequestInit){return adminResponse(await fetch(url,options))}
export function MeetingStudio(){
 const [connection,setConnection]=useState<Connection|null>(null),[meetings,setMeetings]=useState<Meeting[]>([]),[selected,setSelected]=useState<Meeting|null>(null),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[includeTranscript,setIncludeTranscript]=useState(false),[dirty,setDirty]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null);
 const [retryLanguage,setRetryLanguage]=useState('');
 const [retryId,setRetryId]=useState<string|null>(null);
 const requested=selected?.uploadLanguage;
 const language=requested==='en'||requested==='pt'||requested==='es'?requested:textLanguage(selected?.notes||selected?.overview||'')||'en';
 const terms=copy[language],editor=editorText[language];
 const formRef=useRef<HTMLFormElement>(null);const activeRef=useRef(false);
 async function load(){const [c,m]=await Promise.all([api('/api/admin/fireflies'),api('/api/admin/meetings')]);setConnection(c);setMeetings(m.meetings)}
 useEffect(()=>{load().catch(e=>setError(e.message))},[]);
 useEffect(()=>{
  if(!meetings.some(m=>!['READY','INCOMPLETE','ACTION_REQUIRED','LANGUAGE_REVIEW'].includes(m.status)))return;
  const timer=setInterval(async()=>{
   if(document.hidden||activeRef.current)return;
   activeRef.current=true;
   try{
    const b=await api('/api/admin/meetings');setMeetings(b.meetings);
    if(selected&&!dirty && selected.status!=='READY'){
     const current=await api('/api/admin/meetings/'+selected.id);
     setSelected(current.meeting);
    }
   }catch(e){setError(e instanceof Error?e.message:'Refresh failed')}
   finally{activeRef.current=false}
  },15000);
  return()=>clearInterval(timer);
 },[meetings,selected,dirty]);
 async function connect(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await api('/api/admin/fireflies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});setKey('');await load();setNotice('Fireflies connected. You can upload a recording.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setNotice('Uploading securely. Keep this page open until the upload finishes.');try{const form=new FormData(e.currentTarget);const file=form.get('file') as File;if(file.size>60*1024*1024)throw new Error('Use an audio file up to 60 MB. Export a large WAV as MP3 or M4A first.');const b=await api('/api/admin/meetings',{method:'POST',body:form});await load();setSelected(b.meeting);setDirty(false);formRef.current?.reset();setNotice(b.duplicate?'This recording was already uploaded. Opened the existing report without sending it to Fireflies again.':'Recording saved. Meeting Studio will send it to Fireflies and track the transcript. You can close this page.')}catch(e){setError((e as Error).message);setNotice('');await load().catch(()=>{})}finally{setBusy(false)}}
 async function retry(m:Meeting){
  setBusy(true);setRetryId(null);setError('');setNotice('');
  try{
   await api('/api/admin/meetings/'+m.id+'/retry?language='+encodeURIComponent(m.uploadLanguage||retryLanguage),{method:'POST'});
   const result=await api('/api/admin/meetings/'+m.id);
   setSelected(result.meeting);
   setNotice(labels[result.meeting.status]||'Status updated.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to retry this recording.')}
  finally{await load().catch(()=>{});setBusy(false)}
 }
 async function invite(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   const form=event.currentTarget;
   setBusy(true);setError('');setNotice('');
   try{
     const data=await api('/api/admin/meetings/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
     await load();setSelected(data.meeting);form.reset();
     setNotice(data.existing?'Opened the existing invitation for this room.':'Invitation sent. Admit Fireflies in Google Meet. Your minutes will appear here after the call.');
   }catch(error){setError((error as Error).message);await load().catch(()=>{})}finally{setBusy(false)}
 }
 async function open(m:Meeting){if(dirty){setError('Save your edits before opening another meeting.');return}setError('');try{const b=await api(`/api/admin/meetings/${m.id}`);setSelected(b.meeting);setDirty(false)}catch(e){setError((e as Error).message)}}
 async function refresh(m:Meeting){setBusy(true);setError('');try{const b=await api(`/api/admin/meetings/${m.id}/refresh`,{method:'POST'});await load();if(selected?.id===m.id&&!dirty)setSelected(b.meeting);setNotice(b.meeting.status==='READY'?'Your report is ready.':b.meeting.error||labels[b.meeting.status]||'Status updated.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function save(){if(!selected)return;setBusy(true);setError('');try{const b=await api(`/api/admin/meetings/${selected.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:selected.title,overview:selected.overview,agenda:selected.agenda,notes:selected.notes,actionItems:selected.actionItems})});setSelected(b.meeting);setDirty(false);await load();setNotice('Report reviewed and saved. The PDF now includes your edits.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function remove(id:string){setBusy(true);setError('');try{await api(`/api/admin/meetings/${id}`,{method:'DELETE'});if(selected?.id===id){setSelected(null);setDirty(false)}setDeleteId(null);await load();setNotice('Report deleted from this website. The original Fireflies copy is managed in your Fireflies account.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="meeting-studio">
 {error&&<p className="meeting-message error" role="alert">{error}</p>}{notice&&<p className="meeting-message" role="status">{notice}</p>}
 <section className="panel">
   <h2>Live Google Meet</h2>
   <a className="button outline" href="https://meet.new" target="_blank" rel="noopener noreferrer">Start Google Meet ↗</a>
   <p>Copy the joining link from your meeting, then invite Fireflies below. Admit the notetaker when it requests entry.</p>
   <form className="stack" onSubmit={invite}>
     <label>Meeting title<input name="title" className="admin-input" required maxLength={180}/></label>
     <label>Spoken language<select name="language" className="admin-input" required defaultValue=""><option value="" disabled>Choose the meeting language</option><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></select></label>
     <label>Google Meet joining link<input type="url" name="link" className="admin-input" placeholder="https://meet.google.com/abc-defg-hij" required/></label>
     <label className="meeting-check"><input type="checkbox" name="consent" value="yes" required/>Participants have agreed to recording and transcription by Fireflies.</label>
     <button className="button dark" disabled={busy||dirty||!connection?.connected}>Invite Fireflies to take minutes</button>
     {!connection?.connected&&<p>Connect Fireflies below to enable invitations.</p>}
   </form>
 </section>
 <div className="meeting-top-grid"><section className="panel"><span className="eyebrow">Fireflies connection</span><h2>{connection?.connected?'Connected to Fireflies':'Connect your account'}</h2>{connection===null?<p>Checking connection…</p>:<>
 {connection.connected?<><p>{connection.email||'Connected through hosting settings'}</p><p>Transcription, summaries and action items come from your Fireflies account.</p>{!connection.environmentKey&&<button className="button outline" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/api/admin/fireflies',{method:'DELETE'});await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Disconnect Fireflies</button>}</>:<><p>Copy your API key from Fireflies Settings → Developer Settings. It is verified and encrypted on the server.</p><form onSubmit={connect} className="stack"><label>Fireflies API key<input className="admin-input" type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} required maxLength={4000}/></label><button className="button dark" disabled={busy||!connection.canConnect}>Connect Fireflies</button></form>{!connection.canConnect&&<p>Secure connection storage needs to be enabled in hosting settings.</p>}</>}
 <p className="meeting-help"><a href="https://app.fireflies.ai" target="_blank" rel="noreferrer">Open Fireflies</a> · <a href="https://fireflies.ai/pricing" target="_blank" rel="noreferrer">Plans and current limits</a></p></>}
 </section><section className="panel"><span className="eyebrow">Audio to action</span><h2>Upload a recording</h2><form onSubmit={upload} ref={formRef} className="stack"><label>Meeting title<input name="title" className="admin-input" placeholder="Buyer consultation · Wesley Chapel" required maxLength={180}/></label><label>Recording language<select className="admin-input" name="language"><option value="">Detect from audio (Português, English, Español)</option><option value="en">English</option><option value="pt">Portuguese</option><option value="es">Spanish</option></select></label><label>Audio recording<input type="file" name="file" accept=".mp3,.m4a,.mp4,.wav,.ogg" required/></label><p className="meeting-help">MP3, M4A, MP4, WAV or OGG · Up to 60 MB. Use compressed MP3/M4A for longer recordings. Fireflies plan limits also apply.</p><label className="meeting-check"><input type="checkbox" name="consent" value="yes" required/>I have permission to upload this recording and send it to Fireflies for processing.</label><button className="button dark" disabled={busy||!connection?.connected}>{busy?'Working…':'Upload and transcribe'}</button></form></section></div>
 <FirefliesUsage key={connection?.connected ? connection.email || 'connected' : 'disconnected'}/> 
 <div className="meeting-workspace"><section className="panel"><h2>Recording history</h2>{!meetings.length?<p>Your recordings and PDF reports will appear here.</p>:<div className="meeting-list">{meetings.map(m=><article key={m.id} className={selected?.id===m.id?'selected':''}><button className="meeting-open" onClick={()=>open(m)} disabled={busy}><strong>{m.title}</strong><small>{new Date(m.createdAt).toLocaleDateString()} · {m.fileName}</small></button><span className="pill">{labels[m.status]||m.status}</span>{m.status!=='READY'&&<button className="meeting-text-button" onClick={()=>refresh(m)} disabled={busy}>Refresh status</button>}<button className="meeting-text-button" onClick={()=>setDeleteId(m.id)} disabled={busy}>Delete</button>{deleteId===m.id&&<div className="meeting-delete" role="alert"><p>Delete this report and its temporary audio from the website? The Fireflies copy remains in your account.</p><button onClick={()=>remove(m.id)} disabled={busy}>Delete report</button><button onClick={()=>setDeleteId(null)}>Keep report</button></div>}</article>)}</div>}</section>
 <section className="panel meeting-editor"><h2>{selected?editor.review:'From conversation to follow-through'}</h2>{!selected?<p>Choose a recording to review its agenda, notes, and action items, then download your branded PDF.</p>:selected.status!=='READY'?<><h3>{selected.title}</h3><p>{labels[selected.status]||selected.status}</p>{selected.status==='RETRY_WAIT'&&selected.nextDeliveryAt&&<p>Next delivery attempt: {new Date(selected.nextDeliveryAt).toLocaleTimeString()}</p>}{selected.lastCheckedAt&&<p>Last sync check: {new Date(selected.lastCheckedAt).toLocaleString()}</p>}{selected.error&&<p role="alert">{selected.error}</p>}<button className="button outline" onClick={()=>refresh(selected)} disabled={busy}>Check progress</button>{selected.status==='CHECK_REQUIRED'&&selected.fileName!=='Google Meet'&&Date.parse(selected.expiresAt)>Date.now()&&<div><a href="https://app.fireflies.ai/uploads" target="_blank" rel="noreferrer">Check uploads in Fireflies</a>{retryId===selected.id?<div>{!selected.uploadLanguage&&<label>Spoken language<select className="admin-input" value={retryLanguage} onChange={e=>setRetryLanguage(e.target.value)}><option value="">Choose the language</option><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></select></label>}<p>If this recording is already queued or complete in Fireflies, another submission may use more transcription minutes.</p><button className="button outline" disabled={busy||!(selected.uploadLanguage||retryLanguage)} onClick={()=>retry(selected)}>I checked Fireflies. Retry saved audio</button><button disabled={busy} onClick={()=>setRetryId(null)}>Cancel</button></div>:<button className="button outline" disabled={busy} onClick={()=>(setRetryLanguage(''),setRetryId(selected.id))}>Retry saved audio</button>}</div>}<p className="meeting-help">Temporary audio expires after 48 hours.</p>{selected.status==='CHECK_REQUIRED'&&Date.parse(selected.expiresAt)<=Date.now()&&<p>The saved copy has expired. Check Fireflies for the original submission. If it is missing, delete this entry and upload the original file again.</p>}</>:<><p className="meeting-help">{selected.reviewedAt?terms.reviewed:terms.draft} · {editor.hint}</p>{(['title','overview','agenda','notes','actionItems'] as const).map(k=><label key={k}>{({title:editor.title,overview:terms.sections[0],agenda:terms.agenda,notes:terms.finding,actionItems:editor.actions})[k]}{k==='title'?<input className="admin-input" value={selected[k]} maxLength={180} onChange={e=>{setSelected({...selected,[k]:e.target.value});setDirty(true)}}/>:<textarea className="admin-input" rows={k==='overview'?4:7} value={selected[k]} maxLength={60000} onChange={e=>{setSelected({...selected,[k]:e.target.value});setDirty(true)}}/>}</label>)}<div className="meeting-actions"><button className="button dark" onClick={save} disabled={busy}>{editor.save}</button><label className="meeting-check"><input type="checkbox" checked={includeTranscript} onChange={e=>setIncludeTranscript(e.target.checked)}/>{editor.include}</label>{dirty?<span>{editor.saveFirst}</span>:<a className="button outline" href={`/api/admin/meetings/${selected.id}/pdf${includeTranscript?'?transcript=1':''}`}>{editor.download}</a>}</div>{selected.transcript?.sentences&&<details><summary>{terms.transcript}</summary><div className="meeting-transcript">{selected.transcript.sentences.map((s,i)=><p key={i}><strong>{s.speaker_name||terms.speaker}</strong> · {Math.floor(s.start_time/60)}:{String(Math.floor(s.start_time%60)).padStart(2,'0')}<br/>{s.text}</p>)}</div></details>}</>}
 </section></div></div>
}
