// Uploaded recordings can finish while the owner dashboard is closed.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.RENDER || !process.env.DATABASE_URL || process.env.NEXT_PHASE === 'phase-production-build') return;
  const {prisma} = await import('./lib/prisma');
  const {refreshMeeting} = await import('./lib/fireflies');
  async function check() {
    try {
      const reports = await prisma.meetingReport.findMany({
        where: {status: {in: ['PROCESSING','SUMMARIZING']}, reviewedAt: null,
          OR: [{lastCheckedAt:null},{lastCheckedAt:{lt:new Date(Date.now()-120000)}}]},
        orderBy: {lastCheckedAt:{sort:'asc',nulls:'first'}}, take: 4, select: {id:true,userId:true}
      });
      for (const row of reports) {
        try {
          await refreshMeeting(row.id,row.userId);
        } catch(error) {
          const message=error instanceof Error && error.message.startsWith('Fireflies') ? error.message : 'Meeting synchronization will retry.';
          await prisma.meetingReport.updateMany({where:{id:row.id,status:{in:['PROCESSING','SUMMARIZING']}},data:{error:message}});
        }
      }
    } finally {
      setTimeout(()=>void check().catch(()=>{}),120000).unref();
    }
  }
  setTimeout(()=>void check().catch(()=>{}),10000).unref();
}
