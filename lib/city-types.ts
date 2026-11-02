import type {Area,CountrySlug,FilterId} from './explorer';
import type {LivingCopy} from './researched-cities';
import type {CitySportsGuide} from './sports';
export type MapBounds=[number,number,number,number]; // south, west, north, east
export type CityMapPoint={id:string;name:string;lat:number;lng:number;score:number|null};
export type CityMapCluster={id:string;lat:number;lng:number;count:number;bounds:MapBounds;members:CityMapPoint[];maxScore:number|null};
export type CityMapData={points:CityMapPoint[];clusters:CityMapCluster[];total:number;visible:number;bounds:MapBounds};
export type CityResult=Area&{origin:'curated'|'gazetteer';sports?:CitySportsGuide;assessedTags:FilterId[];population?:number|null;elevation?:number|null;coastKm?:number;photoKind:'city'|'regional';score:number|null;unknownPreferences:number;researched?:boolean;researchCopy?:Record<'en'|'es'|'pt',LivingCopy>;researchRank?:number;researchDate?:string;researchSources?:{url:string;title:string}[];contentLocale?:'en'|'es'|'pt';photoCredit?:{author:string;license:string;url:string};overview?:{summary:string;sourceTitle:string;url:string;license:string;locale:'en'|'es'|'pt'}};
export type CityResults={country:CountrySlug;total:number;countryTotal:number;researchedTotal:number;page:number;pageSize:number;hasMore:boolean;places:CityResult[];map:CityMapData;updatedAt:string};
