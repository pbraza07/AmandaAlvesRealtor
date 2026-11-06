import {NextRequest,NextResponse} from 'next/server';
import {getAdmin,verifyOrigin,rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {pushConfiguration} from '@/lib/push';
import {endpointHash,pushSubscriptionSchema} from '@/lib/push-core';
export const runtime='nodejs';
const noCache={'Cache-Control':'private, no-store'};
export async function GET(req:NextRequest){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401,headers:noCache});
 const key=pushConfiguration()?.publicKey;const hash=req.nextUrl.searchParams.get('subscription');
 const enabled=hash&&/^[a-f0-9]{64}$/.test(hash)?!!await prisma.adminPushSubscription.findFirst({where:{userId:admin.id,endpointHash:hash},select:{id:true}}):false;
 return NextResponse.json({configured:!!key,publicKey:key||null,enabled},{headers:noCache});
}
export async function POST(req:NextRequest){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{await verifyOrigin()}catch{return NextResponse.json({error:'Invalid origin'},{status:403})}
 if(!rateLimit(`push-save:${admin.id}`,30,60000))return NextResponse.json({error:'Please wait before trying again.'},{status:429});
 if(!pushConfiguration())return NextResponse.json({error:'Device notifications are not configured yet.'},{status:503});
 const text=await req.text();if(text.length>8000)return NextResponse.json({error:'Subscription too large'},{status:413});
 let body:unknown;try{body=JSON.parse(text)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
 const parsed=pushSubscriptionSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Invalid device subscription.'},{status:400});
 const {endpoint,keys}=parsed.data;const hash=endpointHash(endpoint);
 // A browser can belong to one signed-in owner at a time. Re-enabling transfers its subscription.
 const existing=await prisma.adminPushSubscription.findUnique({where:{endpointHash:hash},select:{id:true}});
 if(!existing&&await prisma.adminPushSubscription.count({where:{userId:admin.id}})>=30)return NextResponse.json({error:'Device limit reached. Disable an old device first.'},{status:409});
 await prisma.adminPushSubscription.upsert({where:{endpointHash:hash},create:{userId:admin.id,endpointHash:hash,endpoint,p256dh:keys.p256dh,auth:keys.auth},update:{userId:admin.id,endpoint,p256dh:keys.p256dh,auth:keys.auth}});
 return NextResponse.json({ok:true,enabled:true},{headers:noCache});
}
export async function DELETE(req:NextRequest){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{await verifyOrigin()}catch{return NextResponse.json({error:'Invalid origin'},{status:403})}
 const body=await req.json().catch(()=>null);if(typeof body?.endpoint!=='string'||body.endpoint.length>4096)return NextResponse.json({error:'Invalid subscription'},{status:400});
 await prisma.adminPushSubscription.deleteMany({where:{userId:admin.id,endpointHash:endpointHash(body.endpoint)}});
 return NextResponse.json({ok:true},{headers:noCache});
}
