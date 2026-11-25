import {gmailHealth} from './gmail-health';
import {prisma} from './prisma';
import {hasDatabase} from './database';
import {pushConfiguration,sendDevicePush} from './push';

const prefix='gmail-disconnect-alert:';
let timer:ReturnType<typeof setInterval>|undefined;
let running=false;

async function monitor(){
 if(running)return;
 running=true;
 try{
  const status=await gmailHealth();
  if(status==='connected'){
   await prisma.siteContent.deleteMany({where:{id:{startsWith:prefix}}});
   return;
  }
  if(status!=='reconnect'||!pushConfiguration())return;
  for(const device of await prisma.adminPushSubscription.findMany()){
   const id=prefix+device.id;
   const claimed=await prisma.siteContent.createMany({data:[{id,content:'pending'}],skipDuplicates:true});
   if(!claimed.count)continue;
   try{
    await sendDevicePush(device,{title:'Amanda Realtor · Reconnect Gmail',body:'Website email delivery needs your Google approval. Tap to reconnect the sender.',url:'/admin/email',tag:'amanda-gmail-disconnected'});
   }catch{
    await prisma.siteContent.deleteMany({where:{id}});
   }
  }
 }catch{console.warn('Gmail connection check temporarily unavailable.')}
 finally{running=false}
}

export function startGmailMonitor(){
 if(timer||!hasDatabase()||process.env.NEXT_PHASE==='phase-production-build')return;
 void monitor();
 timer=setInterval(()=>void monitor(),5*60_000);
 timer.unref();
}
