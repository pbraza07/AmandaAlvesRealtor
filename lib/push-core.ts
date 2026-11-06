import {createHash,ECDH} from 'node:crypto';
import {z} from 'zod';
export function allowedPushEndpoint(value:string){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(
  u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'))}catch{return false}
}
function validKey(value:string,length:number){try{return /^[A-Za-z0-9_-]+$/.test(value)&&Buffer.from(value,'base64url').length===length}catch{return false}}
export const pushSubscriptionSchema=z.object({endpoint:z.string().max(4096).refine(allowedPushEndpoint,'Unsupported push service'),keys:z.object({p256dh:z.string().refine(value=>{if(!validKey(value,65))return false;try{ECDH.convertKey(Buffer.from(value,'base64url'),'prime256v1');return true}catch{return false}},'Invalid encryption key'),auth:z.string().refine(value=>validKey(value,16),'Invalid auth key')})});
export const endpointHash=(endpoint:string)=>createHash('sha256').update(endpoint).digest('hex');
export type PushDevice={id:string;endpoint:string;p256dh:string;auth:string};
export type LeadPushInput={id:string;type:string;details:unknown};
export function leadPushPayload(lead:LeadPushInput){
 const purpose=lead.details&&typeof lead.details==='object'?(lead.details as Record<string,unknown>).inquiryPurpose:undefined;
 const label=purpose==='Travel opportunities'?'travel interest':purpose==='Lifestyle consultation'?'lifestyle consultation':lead.type==='SELLER'?'seller':'buyer';
 return {title:'Amanda Alves · New request',body:`A new ${label} request is ready in your private dashboard.`,url:`/admin/leads/${encodeURIComponent(lead.id)}`,tag:`lead-${lead.id}`};
}
export function expiredPush(error:unknown){return !!error&&typeof error==='object'&&[404,410].includes(Number((error as {statusCode?:number}).statusCode))}
export type PushStore={claim:(leadId:string)=>Promise<boolean>;devices:()=>Promise<PushDevice[]>;remove:(id:string)=>Promise<void>;complete:(leadId:string,sent:number,failed:number)=>Promise<void>};
export async function dispatchLeadPush(lead:LeadPushInput,store:PushStore,send:(device:PushDevice,payload:ReturnType<typeof leadPushPayload>)=>Promise<unknown>){
 if(!await store.claim(lead.id))return {duplicate:true,sent:0,failed:0};
 const devices=await store.devices();let sent=0,failed=0;
 // Bound concurrency so an expired device cannot hold up every other notification.
 for(let i=0;i<devices.length;i+=5)await Promise.all(devices.slice(i,i+5).map(async device=>{try{await send(device,leadPushPayload(lead));sent++}catch(error){failed++;if(expiredPush(error))await store.remove(device.id).catch(()=>{})}}));
 await store.complete(lead.id,sent,failed);
 return {duplicate:false,sent,failed};
}
