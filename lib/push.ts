import webpush from 'web-push';
import {prisma} from './prisma';
import {hasDatabase} from './database';
import {dispatchLeadPush,type PushDevice,type LeadPushInput} from './push-core';
export function pushConfiguration(){
 const publicKey=process.env.AMANDA_WEB_PUSH_PUBLIC_KEY?.trim(),privateKey=process.env.AMANDA_WEB_PUSH_PRIVATE_KEY?.trim();
 return publicKey&&privateKey?{subject:'mailto:amandaborgesalves@gmail.com',publicKey,privateKey}:null;
}
export async function sendDevicePush(device:PushDevice,payload:{title:string;body:string;url:string;tag:string}){
 const vapidDetails=pushConfiguration();if(!vapidDetails)throw Error('PUSH_NOT_CONFIGURED');
 return webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}},JSON.stringify(payload),{vapidDetails,TTL:86400,urgency:'high',timeout:8000});
}
export async function sendLeadPushNotifications(lead:LeadPushInput){
 if(!hasDatabase()||!pushConfiguration())return;
 return dispatchLeadPush(lead,{
  claim:async leadId=>{const result=await prisma.leadPushEvent.createMany({data:[{leadId}],skipDuplicates:true});return result.count===1},
  devices:()=>prisma.adminPushSubscription.findMany(),
  remove:async id=>{await prisma.adminPushSubscription.deleteMany({where:{id}})},
  complete:async(leadId,sent,failed)=>{await prisma.leadPushEvent.update({where:{leadId},data:{sent,failed,completedAt:new Date()}})}
 },sendDevicePush);
}
