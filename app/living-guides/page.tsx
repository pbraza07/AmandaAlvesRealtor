import type {Metadata} from 'next';
import {Localized} from '@/components/SiteLanguage';
import {LivingGuideCollection} from '@/components/LivingGuideCollection';
import {isCountry,cityById} from '@/lib/city-index';
import {livingResearch} from '@/lib/researched-cities';
import type {CountrySlug} from '@/lib/explorer';
import type {CityResult} from '@/lib/city-types';
export const metadata:Metadata={title:'400 Researched City & Town Guides | Amanda Alves',description:'Explore 100 researched places each in Florida, Portugal, Spain and Costa Rica, with local character, lifestyle, airport access and practical living considerations.'};
export default async function Page({searchParams}:{searchParams:Promise<{destination?:string}>}){
 const params=await searchParams;const country=isCountry(params.destination||'')?params.destination as CountrySlug:'florida';const research=livingResearch(country);
 const cities=[...research.places].sort((a,b)=>a.rank-b.rank).map(p=>cityById(country,`gn-${p.geonamesId}`)).filter((c):c is CityResult=>!!c);
 return <Localized><main id="main" className="container section"><a href="/">← Back to Amanda Alves</a><span className="eyebrow living-directory-eyebrow">The living guide collection</span><h1>400 places. Distinct ways to live.</h1><p className="living-directory-intro">Explore 100 researched cities, towns and communities in each destination. This editorial selection balances established urban centers, coastal towns, inland communities and island living. Each guide highlights local character, a possible daily routine, airport access and a practical point to consider.</p><p className="living-directory-intro">Ideal for is an editorial interpretation of the cited features. Use the lifestyle explorer to rank places by your own preferences.</p><LivingGuideCollection country={country} cities={cities}/><p className="explorer-data-note">The wider city index remains available in the explorer. Match percentages count confirmed selected preferences, and partial or 0% matches remain eligible. <a href="/explorer-sources">Sources and match methodology ↗</a></p></main></Localized>
}
