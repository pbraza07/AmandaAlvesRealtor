'use client';
import {useEffect,useState} from 'react';

type Usage={studio:{uploads:number;live:number;minutes:number;pendingDuration:number};account:{minutes_consumed:number|null;num_transcripts:number|null}|null;message:string;checkedAt:string};
const number=(value:number|null|undefined)=>value==null?'Unavailable':value.toLocaleString(undefined,{maximumFractionDigits:1});

export function FirefliesUsage(){
  const [revision,refresh]=useState(0);
  const [usage,setUsage]=useState<Usage|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    let last=0;
    let loading=false;
    async function load(){
      if(document.hidden||loading||Date.now()-last<60000)return;
      loading=true;last=Date.now();setBusy(true);
      try{
        const response=await fetch('/api/admin/fireflies/usage',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error();
        const result=await response.json();
        if(!controller.signal.aborted){setUsage(result);setError('')}
      }catch{if(!controller.signal.aborted)setError('Usage could not be refreshed.')}
      finally{loading=false;if(!controller.signal.aborted)setBusy(false)}
    }
    void load();
    document.addEventListener('visibilitychange',load);
    const timer=setInterval(load,300000);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',load)};
  },[revision]);
  return <section className="panel" aria-label="Fireflies usage">
    <h2>Fireflies usage</h2>
    {usage&&<div className="meeting-top-grid">
      <div><h3>Meeting Studio this month</h3>
        <p>{number(usage.studio.uploads)} saved uploads · {number(usage.studio.live)} saved Meet invitations</p>
        <p><strong>{number(usage.studio.minutes)} min</strong> of uploaded audio with a reported duration.</p>
        {usage.studio.pendingDuration>0&&<p>{number(usage.studio.pendingDuration)} uploads awaiting a duration.</p>}
        <small>Calendar month in UTC. Includes recordings still in your Studio history.</small>
      </div>
      <div><h3>Connected Fireflies user · all time</h3>
        <p>Meeting minutes used · <strong>{number(usage.account?.minutes_consumed)}</strong></p>
        <p>Transcripts · <strong>{number(usage.account?.num_transcripts)}</strong></p>
        {usage.message&&<p role="status">{usage.message}</p>}
      </div>
    </div>}
    <h3>Current plan and remaining allowance</h3>
    <p>Fireflies keeps your subscription and remaining upload allowance in its workspace. Open Settings → Billing for your current subscription and AI credit balance. Live Meet sessions are excluded from the monthly upload limit.</p>
    <div className="meeting-actions"><a className="button outline" href="https://app.fireflies.ai/" target="_blank" rel="noreferrer">Open Fireflies workspace</a><button className="meeting-text-button" disabled={busy} onClick={()=>refresh(value=>value+1)}>{busy?'Checking usage…':'Refresh usage'}</button></div>
    {error&&<p role="alert">{error}</p>}
    {usage&&<small>Last checked {new Date(usage.checkedAt).toLocaleString()}</small>}
  </section>
}
