import { spawn } from 'node:child_process';
// Accept the preview runner's standard host/port flags alongside Next's flags.
const args=process.argv.slice(2).flatMap(arg=>arg==='--strictPort'?[]:[arg==='--host'?'--hostname':arg]);
const child=spawn('node',['node_modules/next/dist/bin/next','dev',...args],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
