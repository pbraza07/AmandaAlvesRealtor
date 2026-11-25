import {senderToken} from './gmail-connection';

type State='connected'|'reconnect'|'unavailable';
let cached:Promise<State>|undefined;
let expires=0;

async function check():Promise<State>{
 try{
  const refresh=await senderToken();
  if(!refresh)return 'reconnect';
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(10000),body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh,client_id:process.env.GMAIL_CLIENT_ID||'',client_secret:process.env.GMAIL_CLIENT_SECRET||''})});
  const grant=await response.json();
  if(response.ok&&grant.access_token)return 'connected';
  return grant.error==='invalid_grant'?'reconnect':'unavailable';
 }catch{return 'unavailable'}
}
export function gmailHealth(){
 if(!cached||Date.now()>=expires){expires=Date.now()+60000;cached=check()}
 return cached;
}
