import {NextRequest,NextResponse} from 'next/server';
import {getAdmin,verifyOrigin,rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {sendDevicePush} from '@/lib/push';
import {endpointHash,expiredPush} from '@/lib/push-core';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{await verifyOrigin()}catch{return NextResponse.json({error:'Invalid origin'},{status:403})}
 if(!rateLimit(`push-test:${admin.id}`,3,60000))return NextResponse.json({error:'Please wait a minute before sending another test.'},{status:429});
 const body=await req.json().catch(()=>null);if(typeof body?.endpoint!=='string'||body.endpoint.length>4096)return NextResponse.json({error:'Invalid device'},{status:400});
 const device=await prisma.adminPushSubscription.findFirst({where:{userId:admin.id,endpointHash:endpointHash(body.endpoint)}});
 if(!device)return NextResponse.json({error:'Enable notifications on this device first.'},{status:404});
 try{await sendDevicePush(device,{title:'Amanda Alves · Notifications ready',body:'This device can receive new request alerts.',url:'/admin',tag:'amanda-device-test'});return NextResponse.json({ok:true})}catch(error){
  if(expiredPush(error))await prisma.adminPushSubscription.deleteMany({where:{id:device.id,userId:admin.id}});
  return NextResponse.json({error:expiredPush(error)?'This device subscription expired. Enable notifications again.':'The test could not be sent. Please try again.'},{status:502});
 }
}
