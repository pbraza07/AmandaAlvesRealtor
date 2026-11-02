import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {CountrySlug,FilterId} from './explorer';
import type {Locale} from './i18n/core';
export type LivingCopy={intro:string;rhythm:string;idealFor:string;consider:string};
export type LivingSource={url:string;title:string};
export type LivingProfile={name:string;geonamesId:number;airportCode:string;rank:number;content:Record<Locale,LivingCopy>;sources:LivingSource[];verifiedTags?:FilterId[]};
export type LivingResearch={country:CountrySlug;selectionMethod:string;researchedAt:string;places:LivingProfile[]};
export type CityPhoto={image:string;author:string;license:string;url:string;verifiedCityName:string;verifiedDistanceKm:number};
const cache=new Map<CountrySlug,LivingResearch>();
let photos:Record<string,CityPhoto>|undefined;
export function livingResearch(country:CountrySlug):LivingResearch{
 let research=cache.get(country);
 if(!research){research=JSON.parse(readFileSync(join(process.cwd(),'data','research',country+'.json'),'utf8')) as LivingResearch;cache.set(country,research)}
 return research;
}
export function researchedProfiles(country:CountrySlug){return new Map(livingResearch(country).places.map(p=>[p.geonamesId,p]))}
export function cityResearchPhoto(geonamesId:number):CityPhoto|undefined{
 if(!photos){try{photos=JSON.parse(readFileSync(join(process.cwd(),'data','research','photos.json'),'utf8'))}catch{photos={}}}
 return photos?.[String(geonamesId)];
}
