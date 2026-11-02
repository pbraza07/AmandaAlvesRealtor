import type {Area,CountrySlug,FilterId} from './explorer';
export type MapBounds=[number,number,number,number]; // south, west, north, east
export type CityMapPoint={id:string;name:string;lat:number;lng:number;score:number|null};
export type CityMapCluster={id:string;lat:number;lng:number;count:number;bounds:MapBounds;members:CityMapPoint[];maxScore:number|null};
export type CityMapData={points:CityMapPoint[];clusters:CityMapCluster[];total:number;visible:number;bounds:MapBounds};
export type CityResult=Area&{origin:'curated'|'gazetteer';assessedTags:FilterId[];population?:number|null;elevation?:number|null;coastKm?:number;photoKind:'city'|'regional';score:number|null;unknownPreferences:number;photoCredit?:{author:string;license:string;url:string};overview?:{summary:string;sourceTitle:string;url:string;license:string;locale:'en'|'es'|'pt'}};
export type CityResults={country:CountrySlug;total:number;countryTotal:number;page:number;pageSize:number;hasMore:boolean;places:CityResult[];map:CityMapData;updatedAt:string};
