"use client";
import {Localized,useSiteLanguage} from './SiteLanguage';
import type {CityResult} from '@/lib/city-types';
/** Source-grounded local character with clearly framed everyday/scouting suggestions. */
export function CityLifestyleDetails({city,expanded=false}:{city:CityResult;expanded?:boolean}){
 const {locale}=useSiteLanguage();const copy=city.researchCopy?.[locale];
 if(!copy?.signature)return null;
 const practical=<><section><h4>Picture your everyday</h4><p>{copy.everyday}</p></section><section><h4>Explore it in person</h4><p>{copy.visitPlan}</p></section></>;
 return <Localized><div className={`city-lifestyle-story${expanded?' is-expanded':''}`}><section><h4>What makes it special</h4><p>{copy.signature}</p></section>{expanded?practical:<details className="city-lifestyle-more"><summary>Daily life &amp; scouting visit</summary>{practical}</details>}</div></Localized>;
}
