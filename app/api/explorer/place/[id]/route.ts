import {NextRequest,NextResponse} from 'next/server';
import {cityById,isCountry} from '@/lib/city-index';
import {validLocale} from '@/lib/i18n/core';
import {enrichCity} from '@/lib/city-enrichment';
import {lifestyleFilters,type FilterId} from '@/lib/explorer';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const p=req.nextUrl.searchParams;const country=p.get('country')||'';if(!isCountry(country)||!/^[a-z0-9-]{1,50}$/.test(id))return NextResponse.json({error:'Place not found.'},{status:404});
 const filters=[...new Set((p.get('preferences')||'').split(',').filter((f):f is FilterId=>lifestyleFilters.some(x=>x.id===f)))];const city=cityById(country,id,filters,validLocale(p.get('lang')));if(!city?.researched)return NextResponse.json({error:'Place not found.'},{status:404});
 return NextResponse.json(p.get('photo')==='1'||p.get('overview')==='1'?await enrichCity(city,validLocale(p.get('lang'))):city,{headers:{'Cache-Control':'public, max-age=300'}});
}
