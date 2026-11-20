import {prisma} from '../lib/prisma';
import {retrySavedRecording} from '../lib/retry-recording';
async function recover(id:string){
 const report=await prisma.meetingReport.findUniqueOrThrow({where:{id},select:{userId:true,status:true,lastRetriedAt:true}});
 if(report.status!=='CHECK_REQUIRED'||report.lastRetriedAt)return;
 const origin=new URL(process.env.RENDER_EXTERNAL_URL||process.env.NEXT_PUBLIC_SITE_URL!).origin;
 await retrySavedRecording(id,report.userId,origin);
}
recover(process.argv[2]).catch(error=>{
 console.error('Meeting recovery:',error instanceof Error?error.message:'Unable to finish.');
 process.exitCode=1;
}).finally(()=>prisma.$disconnect());
