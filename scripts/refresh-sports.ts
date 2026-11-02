import {readFile,writeFile,rename,unlink,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {sportsCountries,validateSportsCatalog,planSportsRefresh,rosterFingerprint,type CatalogSet,type RefreshEvidence} from '../lib/sports-refresh';
const args=process.argv.slice(2),root=process.cwd(),data=join(root,'data','sports');
const option=(name:string)=>{const index=args.indexOf(name);return index>=0?args[index+1]:undefined};
async function catalogs(directory:string){const result={} as CatalogSet;for(const country of sportsCountries)result[country]=JSON.parse(await readFile(join(directory,country+'.json'),'utf8'));return result}
async function main(){
 const current=await catalogs(data);
 if(args.includes('--validate-only')){for(const country of sportsCountries)validateSportsCatalog(current[country]);console.log('Sports catalogs valid: four destinations; roster counts, sources and club bases checked.');return}
 if(args.includes('--fingerprints')){console.log(JSON.stringify(sportsCountries.flatMap(country=>current[country].sports.flatMap(s=>s.competitions.map(c=>({country,competitionId:c.id,season:c.season,expectedTeamCount:c.teams.length,rosterHash:rosterFingerprint(c)})))),null,2));return}
 const candidateDir=option('--candidate-dir'),evidencePath=option('--evidence');
 if(!candidateDir||!evidencePath)throw Error('Use --validate-only, --fingerprints, or --candidate-dir PATH --evidence PATH [--apply]');
 if(resolve(candidateDir)===resolve(data))throw Error('Candidate directory must be separate from live data');
 const candidate=await catalogs(resolve(candidateDir)),evidence=JSON.parse(await readFile(resolve(evidencePath),'utf8')) as RefreshEvidence;
 const result=planSportsRefresh(current,candidate,evidence);
 if(!args.includes('--apply')){console.log(JSON.stringify({dryRun:true,...result.report},null,2));return}
 const logPath=join(data,'refresh-log.json');let log:{runs:unknown[]}={runs:[]};try{log=JSON.parse(await readFile(logPath,'utf8'))}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
 const writes=sportsCountries.map(country=>({path:join(data,country+'.json'),content:JSON.stringify(result.catalogs[country],null,2)+'\n'}));
 writes.push({path:logPath,content:JSON.stringify({runs:[result.report,...log.runs].slice(0,24)},null,2)+'\n'});
 const snapshots=new Map<string,string|undefined>(),staged:{path:string;temp:string}[]=[],applied:string[]=[];const id=randomUUID();
 try{
  await mkdir(data,{recursive:true});
  for(const write of writes){try{snapshots.set(write.path,await readFile(write.path,'utf8'))}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;snapshots.set(write.path,undefined)}const temp=write.path+'.refresh-'+id;await writeFile(temp,write.content,{flag:'wx'});staged.push({path:write.path,temp})}
  for(const file of staged){await rename(file.temp,file.path);applied.push(file.path)}
 }catch(error){for(const path of applied.reverse()){const before=snapshots.get(path);if(before===undefined)await unlink(path).catch(()=>{});else await writeFile(path,before)}throw error}
 finally{for(const file of staged)await unlink(file.temp).catch(()=>{})}
 console.log(JSON.stringify({applied:true,...result.report},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1});
