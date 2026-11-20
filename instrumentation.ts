export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'){
  const {startMeetingWorker}=await import('./lib/meeting-worker');
  await startMeetingWorker();
 }
}
