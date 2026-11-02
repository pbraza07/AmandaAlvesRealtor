import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {CountrySlug} from './explorer';
import type {Locale} from './i18n/core';
export type SportsClub={name:string;base:string;lat:number;lng:number;url:string};
export type SportsCompetition={id:string;name:string;level:'first'|'second';season:string;sourceUrl:string;sourceLabel?:string;coverage:'complete'|'verified-selection';teams:SportsClub[]};
export type SportCatalog={id:string;label:string;secondTierStatus:'available'|'not-applicable'|'not-verified';note:Record<Locale,string>;competitions:SportsCompetition[]};
export type SportsCatalog={country:CountrySlug;updatedAt:string;sports:SportCatalog[]};
export type SportsTeamMatch={tiedTeams?:{name:string;url:string}[];name:string;base:string;distanceKm:number;url:string;league:string;season:string;sourceUrl:string;sourceLabel?:string;coverage:SportsCompetition['coverage']};
export type NearbySport={id:string;label:string;note:Record<Locale,string>;secondTierStatus:SportCatalog['secondTierStatus'];first?:SportsTeamMatch;second?:SportsTeamMatch};
export type CitySportsGuide={updatedAt:string;sports:NearbySport[]};
const catalogs=new Map<CountrySlug,SportsCatalog>();
export function sportsCatalog(country:CountrySlug):SportsCatalog{
 let catalog=catalogs.get(country);
 if(!catalog){catalog=JSON.parse(readFileSync(join(process.cwd(),'data','sports',country+'.json'),'utf8')) as SportsCatalog;catalogs.set(country,catalog)}
 return catalog;
}
/** Great-circle distance between the city reference point and the club's home-base city. */
export function sportsDistanceKm(lat:number,lng:number,a:number,b:number){
 const rad=Math.PI/180;const h=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lng)*rad/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function nearest(sport:SportCatalog,level:SportsCompetition['level'],lat:number,lng:number):SportsTeamMatch|undefined{
 const options=sport.competitions.filter(c=>c.level===level).flatMap(competition=>competition.teams.map(team=>({competition,team,distance:sportsDistanceKm(lat,lng,team.lat,team.lng)})));
 options.sort((a,b)=>a.distance-b.distance||a.team.name.localeCompare(b.team.name));
 const best=options[0];if(!best)return;
 const ties=options.slice(1).filter(option=>Math.abs(option.distance-best.distance)<.001).map(option=>({name:option.team.name,url:option.team.url}));
 return {tiedTeams:ties.length?ties:undefined,name:best.team.name,base:best.team.base,distanceKm:Math.round(best.distance),url:best.team.url,league:best.competition.name,season:best.competition.season,sourceUrl:best.competition.sourceUrl,sourceLabel:best.competition.sourceLabel,coverage:best.competition.coverage};
}
export function nearbySports(country:CountrySlug,lat:number,lng:number):CitySportsGuide{
 const catalog=sportsCatalog(country);
 return {updatedAt:catalog.updatedAt,sports:catalog.sports.map(sport=>({id:sport.id,label:sport.label,note:sport.note,secondTierStatus:sport.secondTierStatus,first:nearest(sport,'first',lat,lng),second:nearest(sport,'second',lat,lng)}))};
}
