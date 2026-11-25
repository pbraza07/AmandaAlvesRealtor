export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'){
  const {startMeetingWorker}=await import('./lib/meeting-worker');
  const {startGmailMonitor}=await import('./lib/gmail-monitor');
  startGmailMonitor();
  await startMeetingWorker();
 }
}
