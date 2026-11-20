// Jobs are persisted in PostgreSQL. Each process resumes independently on startup.
export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs'||!process.env.DATABASE_URL||process.env.DATABASE_MODE==='disabled'||process.env.NEXT_PHASE==='phase-production-build')return;
 const {prisma}=await import('./lib/prisma');
 const {refreshMeeting,purgeExpiredAudio}=await import('./lib/fireflies');
 const {deliverRecording,maintainRecordingStates}=await import('./lib/recording-delivery');
 function schedule(name:string,interval:number,run:()=>Promise<void>){
  async function tick(){
   try{await run()}catch{console.error('Meeting Studio background task will retry:',name)}
   finally{setTimeout(()=>void tick(),interval).unref()}
  }
  setTimeout(()=>void tick(),1000).unref();
 }
 schedule('deliver saved audio',10_000,async()=>{
  const due=await prisma.meetingReport.findMany({where:{status:{in:['QUEUED','RETRY_WAIT']},nextDeliveryAt:{lte:new Date()}},orderBy:{nextDeliveryAt:'asc'},take:4,select:{id:true}});
  for(const job of due)await deliverRecording(job.id,process.env.RENDER_EXTERNAL_URL||process.env.NEXT_PUBLIC_SITE_URL||'');
 });
 schedule('reconcile reports',60_000,async()=>{
  await maintainRecordingStates();
  await purgeExpiredAudio();
  const checkedBefore=(ms:number)=>({OR:[{lastCheckedAt:null},{lastCheckedAt:{lt:new Date(Date.now()-ms)}}]});
  const reports=await prisma.meetingReport.findMany({where:{reviewedAt:null,OR:[
   {status:{in:['PROCESSING','SUMMARIZING']},...checkedBefore(120000)},
   {status:{in:['PROVIDER_DELAYED','CHECK_REQUIRED','UPLOADING']},createdAt:{lt:new Date(Date.now()-180000)},...checkedBefore(600000)}
  ]},orderBy:{lastCheckedAt:{sort:'asc',nulls:'first'}},take:8,select:{id:true,userId:true,status:true}});
  for(const r of reports){
   try{await refreshMeeting(r.id,r.userId)}
   catch(error){
    if(r.status==='CHECK_REQUIRED')continue; // Preserve the specific submission failure for the owner.
    const message=error instanceof Error&&error.message.startsWith('Fireflies')?error.message:'Meeting synchronization will retry.';
    await prisma.meetingReport.updateMany({where:{id:r.id,status:r.status},data:{error:message}});
   }
  }
 });
}
