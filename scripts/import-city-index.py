from pathlib import Path
import json,csv,zipfile,io,gzip,math,hashlib,re,unicodedata,datetime
import tempfile,urllib.request,concurrent.futures,subprocess
import numpy as np
from scipy.spatial import cKDTree
project=Path(__file__).resolve().parents[1];root=Path(tempfile.gettempdir())/'amanda-city-index-source';root.mkdir(exist_ok=True);out=project/'data/cities';out.mkdir(exist_ok=True,parents=True)

urls={**{c+'.zip':'https://download.geonames.org/export/dump/'+c+'.zip' for c in ['US','ES','PT','CR']},'admin1.txt':'https://download.geonames.org/export/dump/admin1CodesASCII.txt','admin2.txt':'https://download.geonames.org/export/dump/admin2Codes.txt','airports.csv':'https://davidmegginson.github.io/ourairports-data/airports.csv','coast.geojson':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson'}
def download(item):
 name,url=item
 request=urllib.request.Request(url,headers={'User-Agent':'LifestyleCityIndex/1.0'})
 with urllib.request.urlopen(request,timeout=120) as response,open(root/name,'wb') as target:
  while chunk:=response.read(1024*1024):target.write(chunk)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as workers:list(workers.map(download,urls.items()))
curated_source=subprocess.check_output(['node','--import','tsx','-e',"import('./lib/explorer.ts').then(m=>console.log(JSON.stringify((m.default||m).areas)))"],cwd=project)
(root/'curated.json').write_bytes(curated_source)

country={'US':'florida','ES':'spain','PT':'portugal','CR':'costa-rica'}
admin1={p[0]:p[1] for line in (root/'admin1.txt').read_text().splitlines() if len(p:=line.split('\t'))>=2}
admin2={p[0]:p[1] for line in (root/'admin2.txt').read_text().splitlines() if len(p:=line.split('\t'))>=2}
def norm(s):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace('saint','st'))
def xyz(lat,lon):
 a=np.radians(lat);b=np.radians(lon);return np.column_stack((np.cos(a)*np.cos(b),np.cos(a)*np.sin(b),np.sin(a)))
# Coastline vertices are interpolated to at most ~1.1km steps in the relevant bounding boxes.
boxes=[(-89,23,-79,32),(-33,26,6,44),(-87,8,-82,12)]
coast=[]
for feature in json.loads((root/'coast.geojson').read_text())['features']:
 geo=feature['geometry'];lines=geo['coordinates'] if geo['type']=='MultiLineString' else [geo['coordinates']]
 for line in lines:
  for (x,y),(xx,yy) in zip(line,line[1:]):
   if not any(min(x,xx)<=e and max(x,xx)>=w and min(y,yy)<=n and max(y,yy)>=s for w,s,e,n in boxes):continue
   steps=max(1,math.ceil(max(abs(xx-x),abs(yy-y))/.01))
   coast.extend((y+(yy-y)*i/steps,x+(xx-x)*i/steps) for i in range(steps+1))
coast=np.array(coast);tree=cKDTree(xyz(coast[:,0],coast[:,1]))
airports=[]
for a in csv.DictReader(io.StringIO((root/'airports.csv').read_text())):
 if a['iso_country'] not in country or a['type'] not in ['large_airport','medium_airport'] or a['scheduled_service']!='yes':continue
 if a['iso_country']=='US' and a['iso_region']!='US-FL':continue
 if not a['iata_code']:continue
 airports.append({'id':a['ident'],'name':a['name'],'code':a['iata_code'],'lat':float(a['latitude_deg']),'lng':float(a['longitude_deg']),'country':country[a['iso_country']],'url':a['home_link'] if a['home_link'].startswith('https://') else 'https://ourairports.com/airports/'+a['ident']+'/'})
(out/'airports.json').write_text(json.dumps(airports,ensure_ascii=False,separators=(',',':'))+'\n')
curated=json.loads((root/'curated.json').read_text());mapping={};counts={};codes={};checksums={};duplicates=[];unknownPop={}
for code,slug in country.items():
 rows=[];seen=set();zipPath=root/(code+'.zip');checksums[code]=hashlib.sha256(zipPath.read_bytes()).hexdigest()
 with zipfile.ZipFile(zipPath) as z:
  for line in z.open(code+'.txt'):
   a=line.decode().rstrip('\n').split('\t')
   if len(a)<19 or a[6]!='P' or a[7] in ['PPLQ','PPLH','PPLW','PPLCH']:continue
   if code=='US' and a[10]!='FL':continue
   ident=int(a[0]);name=a[1];lat=float(a[4]);lng=float(a[5]);key=(norm(name),round(lat,4),round(lng,4))
   if key in seen:duplicates.append(ident);continue
   seen.add(key)
   region=admin2.get('.'.join([code,a[10],a[11]]),'');state=admin1.get(code+'.'+a[10],'')
   region=region.removesuffix(' County')
   if state and state!=region:region=(region+' · ' if region else '')+state
   pop=int(a[14] or 0) or None;elevation=int(a[15]) if a[15].lstrip('-').isdigit() else int(a[16]) if a[16].lstrip('-').isdigit() else None
   if elevation is not None and elevation<-1000:elevation=None
   aliases=','.join(dict.fromkeys([a[2]]+a[3].split(',')))[:650]
   rows.append([ident,name,aliases,round(lat,5),round(lng,5),region,a[7],pop,elevation])
 arr=np.array([(a[3],a[4]) for a in rows]);distance,_=tree.query(xyz(arr[:,0],arr[:,1]));distance=np.round(2*np.arcsin(np.minimum(1,distance/2))*6371,1)
 for a,km in zip(rows,distance):a.append(float(km))
 # Link the existing editorial profiles to the same indexed settlement without duplicate candidates.
 for place in [p for p in curated if p['country']==slug]:
  candidates=[a for a in rows if norm(place['name']) in [norm(a[1])]+[norm(n) for n in a[2].split(',')] and abs(a[3]-place['lat'])<.13 and abs(a[4]-place['lng'])<.13]
  if candidates:
   best=min(candidates,key=lambda a:(a[3]-place['lat'])**2+(a[4]-place['lng'])**2);mapping[place['id']]=best[0]
  else:print('Curated extra (not a duplicate):',slug,place['name'])
 payload=json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode();(out/(slug+'.json.gz')).write_bytes(gzip.compress(payload,compresslevel=9,mtime=0))
 counts[slug]=len(rows);codes[slug]=dict(__import__('collections').Counter(a[6] for a in rows));unknownPop[slug]=sum(a[7] is None for a in rows)
 print(slug,len(rows),'gzip bytes', (out/(slug+'.json.gz')).stat().st_size,flush=True)
manifest={'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':counts,'curatedGeonames':mapping,'featureCodes':codes,'missingPopulation':unknownPop,'excludedDuplicateCount':len(duplicates),'sourceArchiveSha256':checksums,'sources':[{'name':'GeoNames','url':'https://download.geonames.org/export/dump/','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/'},{'name':'Natural Earth 1:10m coastline','url':'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-coastline/','license':'Public domain'},{'name':'OurAirports','url':'https://ourairports.com/data/','license':'Public domain'}],'method':'All current GeoNames populated-place feature codes, including named neighborhoods and communities. Excludes historical, abandoned, destroyed places and former capitals. Florida is restricted to US admin1=FL. Duplicate name/coordinate rows are merged. Population zero is treated as unknown. Coast distance uses interpolated Natural Earth coastline vertices; it is approximate and not property-level exposure. New-place scores use coast proximity <=20km, elevation >=600m outside Florida, population >=50000 or administrative capital for city energy, and scheduled-service airport <=50km for connections; other preferences remain unassessed until editorial review.'}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Total indexed:',sum(counts.values()),'curated links',len(mapping),'duplicates excluded',len(duplicates),flush=True)
