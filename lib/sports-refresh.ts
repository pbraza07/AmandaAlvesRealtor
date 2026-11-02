import {createHash} from 'node:crypto';
import type {SportsCatalog,SportsCompetition} from './sports';
export const sportsCountries=['florida','portugal','spain','costa-rica'] as const;
export type CatalogSet=Record<typeof sportsCountries[number],SportsCatalog>;
export type SourceCheck={country:typeof sportsCountries[number];competitionId:string;status:'verified'|'unavailable';checkedAt:string;sourceUrl:string;season?:string;expectedTeamCount?:number;rosterHash?:string;summary:string};
export type RefreshEvidence={runAt:string;checks:SourceCheck[]};
const day=/^\d{4}-\d{2}-\d{2}$/;
const https=(value:unknown)=>{try{return typeof value==='string'&&new URL(value).protocol==='https:'}catch{return false}};
function stable(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';
 return JSON.stringify(value) ?? "undefined";
}
export function rosterFingerprint(league:SportsCompetition){return createHash('sha256').update(stable([...league.teams].sort((a,b)=>a.name.localeCompare(b.name)))).digest('hex')}
export function validateSportsCatalog(catalog:SportsCatalog){
 if(!sportsCountries.includes(catalog.country)||!day.test(catalog.updatedAt))throw Error('Invalid catalog country/date');
 if(!Array.isArray(catalog.sports)||!catalog.sports.length)throw Error('Empty sports catalog');
 const sports=new Set<string>(),leagues=new Set<string>();
 for(const sport of catalog.sports){
  if(!sport.id||sports.has(sport.id))throw Error('Duplicate/missing sport');sports.add(sport.id);
  if(!sport.competitions?.some(c=>c.level==='first'))throw Error(`${sport.id}: missing first/top league`);
  if(!['available','not-applicable','not-verified'].includes(sport.secondTierStatus))throw Error('Invalid second-tier status');
  if(sport.competitions.some(c=>c.level==='second')!==(sport.secondTierStatus==='available'))throw Error(`${sport.id}: second-tier status conflicts with roster`);
  for(const locale of ['en','es','pt'] as const)if(!sport.note?.[locale]?.trim())throw Error(`${sport.id}: missing ${locale} note`);
  for(const league of sport.competitions){
   if(!league.id||leagues.has(league.id))throw Error('Duplicate/missing competition');leagues.add(league.id);
   if(!['first','second'].includes(league.level)||!league.name||!league.season||!https(league.sourceUrl)||league.coverage!=='complete')throw Error(`${league.id}: invalid league metadata or incomplete roster`);
   if(!day.test(league.verifiedAt||catalog.updatedAt))throw Error(`${league.id}: invalid verified date`);
   if(!Number.isInteger(league.expectedTeamCount)||league.expectedTeamCount!<2||league.expectedTeamCount!>128||league.expectedTeamCount!==league.teams?.length)throw Error(`${league.id}: roster count does not match verified expected count`);
   const names=new Set<string>();
   for(const team of league.teams){const key=team.name?.trim().normalize('NFKC').toLocaleLowerCase();
    if(!key||names.has(key)||!team.base?.trim()||!https(team.url)||!Number.isFinite(team.lat)||Math.abs(team.lat)>90||!Number.isFinite(team.lng)||Math.abs(team.lng)>180)throw Error(`${league.id}: invalid/duplicate team base`);names.add(key);
   }
  }
 }
}
export function planSportsRefresh(current:CatalogSet,candidate:CatalogSet,evidence:RefreshEvidence){
 if(!Number.isFinite(Date.parse(evidence.runAt)))throw Error('Invalid refresh run time');
 const output=structuredClone(candidate),checks=new Map<string,SourceCheck>();
 for(const check of evidence.checks){
  const key=`${check.country}:${check.competitionId}`;
  if(checks.has(key)||!sportsCountries.includes(check.country)||!['verified','unavailable'].includes(check.status)||!Number.isFinite(Date.parse(check.checkedAt))||Date.parse(check.checkedAt)>Date.parse(evidence.runAt)||!https(check.sourceUrl)||check.summary.trim().length<20)throw Error(`Invalid/duplicate source evidence: ${key}`);
  checks.set(key,check);
 }
 const changes:{country:string;competitionId:string;added:string[];removed:string[];relocated:string[];previousSeason?:string;season:string}[]=[];
 let verified=0,unavailable=0,notChecked=0;
 for(const country of sportsCountries){
  const old=current[country],next=output[country];validateSportsCatalog(old);validateSportsCatalog(next);
  if(next.country!==country)throw Error('Candidate file/country mismatch');
  if(stable({...old,sports:undefined,updatedAt:undefined})!==stable({...next,sports:undefined,updatedAt:undefined}))throw Error('Unrelated catalog metadata changes rejected');
  if(stable(old.sports.map(s=>s.id).sort())!==stable(next.sports.map(s=>s.id).sort()))throw Error(`${country}: sports collection changes need separate review`);
  const oldLeagues=new Map(old.sports.flatMap(s=>s.competitions).map(c=>[c.id,c]));
  const nextLeagues=new Map(next.sports.flatMap(s=>s.competitions).map(c=>[c.id,c]));
  for(const id of oldLeagues.keys())if(!nextLeagues.has(id))throw Error(`${country}: removing an entire competition needs separate review`);
  for(const sport of next.sports){
   const before=old.sports.find(s=>s.id===sport.id)!;
   const verifiedSport=sport.competitions.some(c=>checks.get(`${country}:${c.id}`)?.status==='verified');
   if(!verifiedSport&&stable({...before,competitions:undefined})!==stable({...sport,competitions:undefined}))throw Error(`${country}: sport notes/status changed without source verification`);
   for(const league of sport.competitions){
    const prior=oldLeagues.get(league.id),key=`${country}:${league.id}`,check=checks.get(key);checks.delete(key);
    if(!check||check.status==='unavailable'){
     if(!prior||stable(prior)!==stable(league))throw Error(`${key}: unverified changes rejected; preserve last verified data`);
     if(check)unavailable++;else notChecked++;continue;
    }
    if(check.sourceUrl!==league.sourceUrl||check.season!==league.season||check.expectedTeamCount!==league.teams.length||check.rosterHash!==rosterFingerprint(league))throw Error(`${key}: roster/season/source does not match source evidence`);
    const checkedDay=new Date(check.checkedAt).toISOString().slice(0,10);
    if(prior&&checkedDay<(prior.verifiedAt||old.updatedAt))throw Error(`${key}: verification cannot move backwards`);
    league.verifiedAt=checkedDay;league.expectedTeamCount=check.expectedTeamCount;
    league.verification={checkedAt:check.checkedAt,sourceUrl:check.sourceUrl,summary:check.summary,rosterHash:check.rosterHash};verified++;
    if(!prior||rosterFingerprint(prior)!==rosterFingerprint(league)||prior.season!==league.season){
     const oldNames=new Set(prior?.teams.map(t=>t.name)||[]),newNames=new Set(league.teams.map(t=>t.name));
     changes.push({country,competitionId:league.id,added:[...newNames].filter(n=>!oldNames.has(n)),removed:[...oldNames].filter(n=>!newNames.has(n)),relocated:league.teams.filter(t=>{const p=prior?.teams.find(x=>x.name===t.name);return p&&(p.base!==t.base||p.lat!==t.lat||p.lng!==t.lng)}).map(t=>t.name),previousSeason:prior?.season,season:league.season});
    }
   }
  }
  next.updatedAt=next.sports.flatMap(s=>s.competitions).map(c=>c.verifiedAt||old.updatedAt).sort()[0];
  validateSportsCatalog(next);
 }
 if(checks.size)throw Error('Evidence refers to an unknown competition');
 const status=unavailable||notChecked?'partial':'complete';
 return {catalogs:output,report:{runAt:evidence.runAt,status,verified,unavailable,notChecked,changes,checks:evidence.checks}};
}
