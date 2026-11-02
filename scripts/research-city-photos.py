#!/usr/bin/env python3
"""Refresh coordinate-verified, attributed city photographs for researched guides.

Uses only public Wikipedia/Commons metadata, never visitor or account data.
Existing successful metadata is cached in data/research/photos.json; no image files
are downloaded. A missed/ambiguous/unlicensed photograph keeps the site's clearly
labelled regional fallback. Run from the repository root with Python 3.11+.
"""
from __future__ import annotations
import argparse, concurrent.futures, gzip, hashlib, html, json, math, re, time
import urllib.error, urllib.parse, urllib.request, signal, threading
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
COUNTRIES=('florida','portugal','spain','costa-rica')
QUALIFIER={'florida':'Florida','portugal':'Portugal','spain':'Spain','costa-rica':'Costa Rica'}
NATIVE={'florida':'en','portugal':'pt','spain':'es','costa-rica':'es'}
USER_AGENT='LifestyleCityExplorer/1.2 (public city-photo metadata research)'
CACHE=Path('/tmp/amanda-city-photo-metadata')
CACHE.mkdir(exist_ok=True)
STOP=threading.Event()

def fetch(lang, params, commons=False):
    host='commons.wikimedia.org' if commons else f'{lang}.wikipedia.org'
    params={'format':'json','formatversion':'2',**params}
    url='https://'+host+'/w/api.php?'+urllib.parse.urlencode(params)
    path=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.json')
    if path.exists():
        try:return json.loads(path.read_text())
        except (OSError,ValueError):pass
    for attempt in range(2):
        if STOP.is_set():return {}
        try:
            request=urllib.request.Request(url,headers={'User-Agent':USER_AGENT,'Accept':'application/json'})
            with urllib.request.urlopen(request,timeout=18) as response:
                data=json.load(response)
            if not data.get('error'):path.write_text(json.dumps(data))
            return data
        except (urllib.error.URLError,TimeoutError,ValueError,OSError):
            if attempt==0:time.sleep(.7)
    return {}

def km(lat,lng,a,b):
    rad=math.pi/180
    h=math.sin((a-lat)*rad/2)**2+math.cos(lat*rad)*math.cos(a*rad)*math.sin((b-lng)*rad/2)**2
    return 6371*2*math.atan2(math.sqrt(h),math.sqrt(max(0,1-h)))

def plain(value):
    return html.unescape(re.sub(r'<[^>]*>','',str(value))).strip()

def photo_from_page(city,page):
    coords=page.get('coordinates') or []
    if not coords or not page.get('pageimage'):return None
    geo=coords[0]
    distance=km(city['lat'],city['lng'],geo['lat'],geo['lon'])
    if distance>15:return None
    data=fetch('en',{'action':'query','titles':'File:'+page['pageimage'],'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':'640'},commons=True)
    for p in data.get('query',{}).get('pages',[]):
        for image in p.get('imageinfo',[]):
            url=image.get('thumburl') or image.get('url') or ''
            url=urllib.parse.urlunparse(urllib.parse.urlparse(url)._replace(query=''))
            credit=image.get('extmetadata',{})
            author=plain(credit.get('Artist',{}).get('value',''))
            license=plain(credit.get('LicenseShortName',{}).get('value',''))
            source=image.get('descriptionurl','')
            # A page image must be a reusable city photograph, not a flag, logo,
            # map, coat of arms, or anonymous graphic with no attribution.
            ext=urllib.parse.urlparse(url).path.lower()
            if not re.match(r'^https://(?:upload|thumb)\.wikimedia\.org/',url):continue
            if not source.startswith('https://commons.wikimedia.org/wiki/File:'):continue
            if not author or not license:continue
            if any(term in page['pageimage'].lower() for term in ['.svg','coat','flag','locator','map','logo','seal','escudo','brasão','brasao','bandera','bandeira','emblema']):continue
            if not re.search(r'\.(?:jpe?g|png|webp)(?:$|/)',ext):continue
            if not re.search(r'CC(?:0|\s|[- ])|Public domain|PD-|PDM',license,re.I):continue
            if len(author)>1000:continue
            return {'image':url,'author':author,'license':license,'url':source,'verifiedCityName':city['name'],'verifiedDistanceKm':round(distance,3)}
    return None

def fallback_photo(city,page,lang):
    """Try a named city view on the same coordinate-verified city article.

    Wikipedia sometimes stores its leading collage locally. Only Commons images
    whose filenames name this city and suggest a street/landscape/landmark view
    are considered, never arbitrary article illustrations or portraits.
    """
    coords=page.get('coordinates') or []
    if not coords:return None
    distance=km(city['lat'],city['lng'],coords[0]['lat'],coords[0]['lon'])
    if distance>15:return None
    data=fetch(lang,{'action':'query','pageids':page['pageid'],'prop':'images','imlimit':'50'})
    files=[]
    names=[city['name'],city['indexedName'],page.get('title','').split(',')[0]]
    norm=lambda s:__import__('unicodedata').normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace('_',' ')
    city_names=[norm(n) for n in names if len(n)>3]
    for p in data.get('query',{}).get('pages',[]):
        for f in p.get('images',[]):
            title=f.get('title',''); low=norm(title)
            if not any(name in low for name in city_names):continue
            if any(bad in low for bad in ['.svg','flag','coat','seal','map','logo','portrait','signature','person','us navy','usaf','military']):continue
            if not re.search(r'\.(?:jpe?g|png|webp)$',low):continue
            score=sum(word in low for word in ['skyline','downtown','street','main','city','town','view','panorama','beach','marina','park','plaza','praca','pier','river','waterfront','historic','center','centre','church','cathedral','catedral','praia','playa','panoram','rua','avenida','vista','vistas','ribeira','centro','puente','ponte','igreja','iglesia','castelo','castillo','museu','museo','estacao','teatro','monasterio','monumento','ayuntamiento','mercado','cais','paseo','passeio','palacio','fortaleza','aerea','aerial','cidade','ciudad'])
            if score:files.append((score,title))
    for _,title in sorted(files,key=lambda item:-item[0])[:3]:
        synthetic={**page,'pageimage':title.split(':',1)[-1]}
        photo=photo_from_page(city,synthetic)
        if photo:return photo
    return None

def candidates(city,lang):
    names=[city['name'],city['indexedName']]
    for n in list(names):
        if ' / ' in n:names.extend(n.split(' / '))
    qualifier=QUALIFIER[city['country']]
    if lang=='pt' and city['country']=='spain':qualifier='Espanha'
    if lang=='es' and city['country']=='spain':qualifier='España'
    result=[]
    for n in dict.fromkeys(names):
        result.extend([f'{n}, {qualifier}',f'{n} ({qualifier})',n])
    return list(dict.fromkeys(result))

def lookup(city):
    if STOP.is_set():return str(city['id']),None
    for lang in dict.fromkeys(['en',NATIVE[city['country']]]):
        titles=candidates(city,lang)
        data=fetch(lang,{'action':'query','redirects':'1','titles':'|'.join(titles),'prop':'coordinates|pageimages','piprop':'name','coprimary':'primary'})
        pages=data.get('query',{}).get('pages',[])
        valid=[]
        for page in pages:
            if page.get('coordinates'):
                c=page['coordinates'][0]
                distance=km(city['lat'],city['lng'],c['lat'],c['lon'])
                if distance<=15:valid.append((distance,page))
        for _,page in sorted(valid,key=lambda p:p[0]):
            result=photo_from_page(city,page)
            if result:return str(city['id']),result
        for _,page in sorted(valid,key=lambda p:p[0]):
            result=fallback_photo(city,page,lang)
            if result:return str(city['id']),result
    return str(city['id']),None

def load_cities(bootstrap=False):
    selected={}
    manifest=json.loads((ROOT/'data/cities/manifest.json').read_text())
    curated=set(manifest.get('curatedGeonames',{}).values())
    for country in COUNTRIES:
        rows=json.loads(gzip.decompress((ROOT/f'data/cities/{country}.json.gz').read_bytes()))
        byid={r[0]:r for r in rows}
        profile=ROOT/f'data/research/{country}.json'
        desired=[]
        if profile.exists():
            try:desired=[(p['geonamesId'],p['name']) for p in json.loads(profile.read_text())['places']]
            except (ValueError,KeyError):pass
        if bootstrap:
            desired.extend((r[0],r[1]) for r in sorted(rows,key=lambda r:r[7] or 0,reverse=True)[:80])
            desired.extend((r[0],r[1]) for r in rows if r[0] in curated)
            if country=='portugal':desired.insert(0,(2267827,'Funchal'))
        for priority,(gid,name) in enumerate(desired):
            r=byid.get(gid)
            if r:selected[str(gid)]={'id':gid,'name':name,'indexedName':r[1],'country':country,'lat':r[3],'lng':r[4],'priority':priority}
    return selected

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bootstrap',action='store_true',help='Also source existing editorial and largest-city candidates while country research files are being authored.')
    parser.add_argument('--workers',type=int,default=4)
    parser.add_argument('--refresh',action='store_true')
    args=parser.parse_args()
    signal.signal(signal.SIGINT,lambda *_:STOP.set())
    signal.signal(signal.SIGTERM,lambda *_:STOP.set())
    selected=load_cities(args.bootstrap)
    output=ROOT/'data/research/photos.json'
    found=json.loads(output.read_text()) if output.exists() else {}
    pending=sorted([c for key,c in selected.items() if args.refresh or key not in found],key=lambda c:(c['priority'],COUNTRIES.index(c['country'])))
    print(f'{len(selected)} candidate cities; {len(pending)} need photo metadata.',flush=True)
    missing=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(4,args.workers))) as pool:
        tasks={pool.submit(lookup,c):c for c in pending}
        for index,task in enumerate(concurrent.futures.as_completed(tasks),1):
            if STOP.is_set():
                for pending_task in tasks:pending_task.cancel()
                break
            city=tasks[task]
            try:key,result=task.result()
            except Exception as exc:
                key,result=str(city['id']),None
                print(f'ERROR {city["country"]} {city["name"]}: {type(exc).__name__}',flush=True)
            if result:found[key]=result
            else:missing.append({'country':city['country'],'name':city['name'],'geonamesId':city['id']})
            if index%10==0 or index==len(tasks):
                output.parent.mkdir(parents=True,exist_ok=True)
                output.write_text(json.dumps(found,ensure_ascii=False,indent=2)+'\n')
                print(f'{index}/{len(tasks)} checked; {len(found)} validated photos cached; {len(missing)} misses this run.',flush=True)
    output.parent.mkdir(parents=True,exist_ok=True)
    # Only researched IDs ship after the final exact-list run.
    if not args.bootstrap:found={key:value for key,value in found.items() if key in selected}
    for value in found.values():value['image']=urllib.parse.urlunparse(urllib.parse.urlparse(value['image'])._replace(query=''))
    output.write_text(json.dumps(found,ensure_ascii=False,indent=2)+'\n')
    (CACHE/'last-missing.json').write_text(json.dumps(missing,ensure_ascii=False,indent=2))
    print(json.dumps({'selected':len(selected),'covered':sum(key in found for key in selected),'missing':len(missing),'metadata':str(output),'missingReport':str(CACHE/'last-missing.json')}),flush=True)
if __name__=='__main__':main()
