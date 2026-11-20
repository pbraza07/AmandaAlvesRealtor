// Run explicitly against a migrated database. All fixture rows are rolled back.
const {PrismaClient}=require('@prisma/client');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const db=new PrismaClient();
async function check(){
 const rollback=new Error('Rollback successful recording check');
 try{
  await db.$transaction(async tx=>{
   const id=randomUUID();
   await tx.meetingReport.create({data:{id,userId:'storage-check-'+id,title:'Storage check',status:'SAVING',fileName:'fixture.mp4',fileHash:id,mimeType:'video/mp4',audio:Buffer.alloc(0),accessHash:id,expiresAt:new Date()},select:{id:true}});
   const written=createHash('sha256'),read=createHash('sha256');
   const size=60*1024*1024, block=512*1024;
   for(let position=0;position<size;position+=block){
    const bytes=randomBytes(block);written.update(bytes);
    await tx.recordingPart.create({data:{reportId:id,position,bytes},select:{position:true}});
   }
   for(let position=0;position<size;position+=block){
    const part=await tx.recordingPart.findUniqueOrThrow({where:{reportId_position:{reportId:id,position}},select:{bytes:true}});
    read.update(part.bytes);
   }
   if(written.digest('hex')!==read.digest('hex'))throw new Error('Recording byte verification failed');
   await tx.meetingReport.update({where:{id},data:{audio:null},select:{id:true}});
   if(await tx.recordingPart.count({where:{reportId:id}}))throw new Error('Recording part cleanup failed');
   throw rollback;
  },{timeout:300000});
 }catch(error){if(error!==rollback)throw error}
 console.log('Verified 60 MiB recording storage, retrieval and cleanup.');
}
check().catch(e=>{console.error('Recording storage check failed',e.code||e.name);process.exitCode=1}).finally(()=>db.$disconnect());
