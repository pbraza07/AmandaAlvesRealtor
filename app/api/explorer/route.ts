import {NextRequest,NextResponse} from 'next/server';
import {isCountry,queryCities} from '@/lib/city-index';
import {lifestyleFilters,type FilterId} from '@/lib/explorer';
import {validLocale} from '@/lib/i18n/core';
import type {MapBounds} from '@/lib/city-types';
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams;const country=p.get('country')||'';if(!isCountry(country))return NextResponse.json({error:'Invalid destination.'},{status:400});
 const filters=[...new Set((p.get('preferences')||'').split(',').filter((f):f is FilterId=>lifestyleFilters.some(x=>x.id===f)))];
 const rawBounds=p.get('bounds')?.split(',').map(Number);const bounds=rawBounds?.length===4&&rawBounds.every(Number.isFinite)&&rawBounds[0]<=rawBounds[2]&&rawBounds[1]<=rawBounds[3]?rawBounds as MapBounds:undefined;
 const page=Number(p.get('page')||0);if(!Number.isFinite(page)||page<0||page>100000)return NextResponse.json({error:'Invalid result page.'},{status:400});
 const saved=p.has('saved')?(p.get('saved')||'').split(',').filter(x=>/^[a-z0-9-]{1,50}$/.test(x)).slice(0,500):undefined;
 const result=queryCities({country,filters,search:(p.get('q')||'').slice(0,100),locale:validLocale(p.get('lang')),page,savedIds:saved,bounds,researchedOnly:true,zoom:Math.max(2,Math.min(18,Number(p.get('zoom'))||7))});
 return NextResponse.json(p.get('map')==='1'?result.map:result,{headers:{'Cache-Control':'public, max-age=120, stale-while-revalidate=600'}});
}
