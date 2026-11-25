import {getAdmin,verifyOrigin} from '@/lib/security';
import {redirect} from 'next/navigation';
import {AdminNav} from '@/components/AdminNav';
import {redirectUri,saveSenderToken} from '@/lib/gmail-connection';

export default async function Email({searchParams}:{searchParams:Promise<{result?:string}>}){
 if(!await getAdmin())redirect('/admin/login');
 const sender=process.env.GMAIL_SENDER_EMAIL?.trim().toLowerCase();
 const consent=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 consent.search=new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID||'',redirect_uri:redirectUri,response_type:'code',scope:'email https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',login_hint:sender||''}).toString();
 async function connect(form:FormData){
  'use server';
  if(!await getAdmin())redirect('/admin/login');
  await verifyOrigin();
  let connected=false;
  try{
   const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID||'',client_secret:process.env.GMAIL_CLIENT_SECRET||'',redirect_uri:redirectUri,grant_type:'authorization_code',code:String(form.get('code')||'').trim()})});
   const grant=await response.json();
   if(response.ok&&grant.refresh_token&&grant.access_token&&String(grant.scope).split(' ').includes('https://www.googleapis.com/auth/gmail.send')){
    const profile=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+grant.access_token},cache:'no-store'});
    const identity=await profile.json();
    if(profile.ok&&identity.verified_email===true&&identity.email?.toLowerCase()===process.env.GMAIL_SENDER_EMAIL?.trim().toLowerCase()){
     await saveSenderToken(grant.refresh_token);connected=true;
    }
   }
  }catch{connected=false}
  redirect('/admin/email?result='+(connected?'connected':'retry'));
 }
 const {result}=await searchParams;
 return <div className="admin-shell"><AdminNav/><main className="admin-main"><h1>Email notifications</h1><div className="panel"><p>Authorize {sender} to send website notifications. Google will show an authorization code in OAuth Playground. Copy the code and return here.</p><a className="button outline" href={consent.href} target="_blank" rel="noopener noreferrer">Reconnect Gmail</a><form action={connect} className="admin-form"><label>Authorization code<input name="code" type="password" required autoComplete="off"/></label><button className="button dark">Save connection</button></form>{result&&<p role="status">{result==='connected'?'Gmail sender verified and connected.':'Connection failed. Authorize the configured mailbox again and use a fresh code.'}</p>}</div></main></div>
}
