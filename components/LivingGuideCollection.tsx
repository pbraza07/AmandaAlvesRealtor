"use client";
import {CityLifestyleDetails} from './CityLifestyleDetails';
import {CitySports} from './CitySports';
import {Localized,useSiteLanguage} from './SiteLanguage';
import {destinations} from '@/lib/lifestyle';
import type {CountrySlug} from '@/lib/explorer';
import type {CityResult} from '@/lib/city-types';
export function LivingGuideCollection({country,cities}:{country:CountrySlug;cities:CityResult[]}){
 const {locale}=useSiteLanguage();const destination=destinations.find(d=>d.slug===country)!;
 return <Localized><nav className="living-guides-tabs" aria-label="Choose a living guide destination">{destinations.map(d=><a key={d.slug} href={`/living-guides?destination=${d.slug}&lang=${locale}`} aria-current={country===d.slug?'page':undefined}>{d.name} · 100</a>)}</nav><h2>{destination.name} <small className="living-directory-count">100 researched places</small></h2><a className="button dark" href={`/lifestyle/${country}?researched=1&lang=${locale}#explorer`}>Rank these places for my lifestyle →</a><div className="living-guides-grid">{cities.map(city=>{
 const copy=city.researchCopy?.[locale]||city;
 return <article className="living-directory-card" key={city.id}><span className="living-directory-rank">Guide {city.researchRank}</span><h3><a href={`/lifestyle/${country}?place=${city.id}&researched=1&lang=${locale}#city-guide-${city.id}`}>{city.name} ↗</a></h3><p>{city.region}</p>{city.photoKind==='city'&&<img className="living-directory-photo" src={city.image} alt={`${city.name}, ${city.region}`} loading="lazy"/>}<p>{copy.intro}</p><CityLifestyleDetails city={city}/><CitySports guide={city.sports}/><div className="place-highlights"><p><strong>Airport access</strong>{city.airport}</p><p><strong>Lifestyle</strong>{copy.rhythm}</p><p><strong>Ideal for</strong>{copy.idealFor}</p><p><strong>Living considerations</strong>{copy.consider}</p></div><a href={`/lifestyle/${country}?place=${city.id}&researched=1&lang=${locale}#city-guide-${city.id}`}>Open city guide & map →</a><details className="living-directory-sources"><summary>Sources & photo credits</summary><ul>{city.researchSources?.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul><p><a href={city.airportUrl} target="_blank" rel="noreferrer">Airport reference</a></p>{!city.photoCredit&&city.photoKind==='city'&&<p><a href="/photo-credits">Photo credits</a></p>}{city.photoCredit&&<p><a href={city.photoCredit.url} target="_blank" rel="noreferrer">Photo: {city.photoCredit.author} · {city.photoCredit.license}</a></p>}</details></article>
 })}</div></Localized>
}
