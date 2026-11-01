"use client";
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { areas, filtersForCountry, matchPercentage, lifestyleFilters, filterAreas, parseExplorerParams, explorerQueryString, countryViews, type Area, type FilterId } from '@/lib/explorer';
import type { Destination } from '@/lib/lifestyle';
import { destinations } from '@/lib/lifestyle';
import { ExplorerMap } from './ExplorerMap';
export type ExplorerSelection={area:string;preferences:string;search:string;mode:string};
export function DestinationExplorer({destination:d,onConsult}:{destination:Destination;onConsult:(selection:ExplorerSelection)=>void}){
 const [filters,setFilters]=useState<FilterId[]>([]),[search,setSearch]=useState(''),[mode,setMode]=useState<'all'|'any'>('all'),[selectedId,setSelectedId]=useState(''),[shared,setShared]=useState('Copy this view'),[saved,setSaved]=useState<string[]>([]),[savedOnly,setSavedOnly]=useState(false);
 useEffect(()=>{
  const p=parseExplorerParams(new URLSearchParams(window.location.search));setFilters(p.filters.filter(id=>filtersForCountry(d.slug).some(f=>f.id===id)));setSearch(p.search);setMode(p.mode);setSelectedId(p.selectedId);
  try{const ids=JSON.parse(localStorage.getItem('amanda-favorite-areas')||'[]');if(Array.isArray(ids))setSaved(ids.filter((id:unknown):id is string=>typeof id==='string'&&areas.some(a=>a.id===id)))}catch{}
 },[]);
 const matches=useMemo(()=>filterAreas({country:d.slug,filters,search,mode}).filter(p=>!savedOnly||saved.includes(p.id)),[d.slug,filters,search,mode,savedOnly,saved]);
 const selected=matches.find(p=>p.id===selectedId);
 const fitKey=matches.map(p=>p.id).join(',');
 const countryAreas=areas.filter(p=>p.country===d.slug);
 useEffect(()=>{if(selectedId&&!matches.some(p=>p.id===selectedId))setSelectedId('')},[matches,selectedId]);
 const toggle=(id:FilterId)=>{setFilters(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);setShared('Copy this view')};
 const reset=()=>{setFilters([]);setSearch('');setMode('all');setSavedOnly(false);setSelectedId('');setShared('Copy this view')};
 const save=(id:string)=>setSaved(current=>{const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];try{localStorage.setItem('amanda-favorite-areas',JSON.stringify(next))}catch{}return next});
 const consult=(place?:Area)=>onConsult({area:place?.name||matches.map(p=>p.name).join(', '),preferences:filters.map(id=>lifestyleFilters.find(f=>f.id===id)!.label).join(', '),search,mode});
 const share=async()=>{
  const params=new URLSearchParams(explorerQueryString(filters,search,mode,selectedId));if(savedOnly)params.set('favorites',saved.filter(id=>countryAreas.some(a=>a.id===id)).join(','));
  const url=`${window.location.origin}/lifestyle/${d.slug}?${params.toString()}#explorer`;
  try{window.history.replaceState(null,'',url);await navigator.clipboard.writeText(url);setShared('View link copied!')}catch{setShared('Use your browser to share this page')}
 };
 // A shared shortlist is explicit in the URL; do not overwrite the visitor’s saved places.
 useEffect(()=>{const ids=new URLSearchParams(window.location.search).get('favorites');if(ids){const valid=ids.split(',').filter(id=>areas.some(a=>a.country===d.slug&&a.id===id));if(valid.length){setSaved(current=>[...new Set([...current,...valid])]);setSavedOnly(true)}}},[d.slug]);
 return <section className={`section explorer-section explorer-${d.slug}`} id="explorer" style={{'--explorer-accent':countryViews[d.slug].accent} as CSSProperties}>
  <div className="container explorer-container">
   <div className="explorer-intro"><div><span className="eyebrow">The lifestyle atlas / {d.name}</span><h2>Imagine your everyday.<br/>Find a place to match.</h2><p>Choose the things you’d love around you. Watch your map take shape, then open a place to explore its character.</p></div><div className="explorer-edition"><strong>{String(countryAreas.length).padStart(2,'0')}</strong><span>curated starting points<br/>one personal next chapter</span></div></div>
   <nav className="explorer-country-tabs" aria-label="Choose an explorer destination">{destinations.map(country=><a href={`/lifestyle/${country.slug}${filters.length?`?${explorerQueryString(filters,'',mode,'')}`:''}#explorer`} key={country.slug} aria-current={country.slug===d.slug?'page':undefined}>{country.name}<span aria-hidden>↗</span></a>)}</nav>
   <div className="explorer-workspace">
    <aside className="explorer-filters" aria-label="Lifestyle preferences">
     <div className="explorer-filter-heading"><h3>Your kind of place</h3><button type="button" className="explorer-text-button" onClick={reset}>Reset all</button></div>
     <label className="explorer-search">Find an area<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setShared('Copy this view')}} placeholder={`Search ${d.name}…`} autoComplete="off"/></label>
     <label className="explorer-match-mode">Match<select value={mode} onChange={e=>setMode(e.target.value as 'all'|'any')}><option value="all">All selected preferences</option><option value="any">Any selected preference</option></select></label>
     {['Setting','Priorities','Everyday life'].map(group=><fieldset className="explorer-filter-group" key={group}><legend>{group}</legend><div>{filtersForCountry(d.slug).filter(f=>f.group===group).map(f=><button type="button" className="explorer-filter-chip" key={f.id} aria-pressed={filters.includes(f.id)} onClick={()=>toggle(f.id)} title={f.hint}><span aria-hidden>{f.icon}</span>{f.label}<span className="chip-check" aria-hidden>{filters.includes(f.id)?'✓':'+'}</span></button>)}</div></fieldset>)}
     <div className="explorer-shortlist-toggle"><label><input type="checkbox" checked={savedOnly} onChange={e=>setSavedOnly(e.target.checked)}/> My saved places ({saved.filter(id=>countryAreas.some(a=>a.id===id)).length})</label><small>Saved on this device.</small></div>
     <details className="explorer-method"><summary>How these matches work</summary><p>Every selected preference must match in “All” mode. “Any” mode includes places with at least one match and orders them by the number matched.</p><p>These are editorial lifestyle profiles informed by official destination guides, not live property listings. Affordability tags suggest places to compare, not current prices. Match percentage is the number of selected preferences met divided by the number selected; choose preferences to calculate a score. Seasonal weather, services, and individual properties vary.</p><p>Family friendly highlights parks, activities, and everyday amenities. Assess schools, accessibility, and services for your own needs. The map shows area centers. Airport distances are approximate straight-line distances, not travel times. </p></details>
    </aside>
    <div className="explorer-results">
     <div className="explorer-results-toolbar"><div role="status" aria-live="polite"><strong>{matches.length}</strong> {matches.length===1?'place':'places'} to explore <span>{filters.length?`· ${filters.length} ${filters.length===1?'preference':'preferences'}`:'· start anywhere'}</span></div><button type="button" className="explorer-text-button" onClick={share}>{shared}</button></div>
     {filters.length>0&&<div className="explorer-active-filters" aria-label="Active preferences">{filters.map(id=><button type="button" key={id} onClick={()=>toggle(id)} aria-label={`Remove ${lifestyleFilters.find(f=>f.id===id)!.label} filter`}>{lifestyleFilters.find(f=>f.id===id)!.label} <span aria-hidden>×</span></button>)}</div>}
     <div className="explorer-result-layout">
      <div className="explorer-area-list" aria-label={`Matching places in ${d.name}`}>
       {matches.length===0?<div className="explorer-empty"><span aria-hidden>◌</span><h3>A different combination could open a new door.</h3><p>No curated places match {savedOnly?'your saved places and ':''}these choices. Remove a preference{mode==='all'&&filters.length>1?' or try “Any selected preference”':''} to broaden your view.</p>{mode==='all'&&filters.length>1&&<button type="button" className="button dark" onClick={()=>setMode('any')}>Match any preference</button>}<button type="button" className="button outline" onClick={reset}>Show every place</button></div>:matches.map((place,index)=>{
        const count=filters.filter(id=>place.tags.includes(id)).length;const percentage=matchPercentage(place,filters);
        return <article className={`explorer-area-card ${selectedId===place.id?'is-selected':''}`} key={place.id}>
         <a className="place-photo" href={`#place-${place.id}`} onClick={e=>{e.preventDefault();setSelectedId(place.id)}}><img src={place.image} alt={`${place.name}, ${place.region}`} loading="lazy"/><span className="match-badge">{percentage===null?"Choose preferences to score":`${percentage}% match`}</span></a><div className="explorer-area-card-top"><span className="explorer-number">{String(index+1).padStart(2,'0')}</span><span className="eyebrow">{place.region}</span><button type="button" className="explorer-save" onClick={()=>save(place.id)} aria-pressed={saved.includes(place.id)} aria-label={`${saved.includes(place.id)?'Unsave':'Save'} ${place.name}`}>{saved.includes(place.id)?'♥':'♡'}</button></div>
         <h3><button type="button" className="explorer-area-title" onClick={()=>setSelectedId(place.id)} aria-pressed={selectedId===place.id}>{place.name}<span aria-hidden>↗</span></button></h3><p>{place.intro}</p><div className="place-highlights"><p><strong>Airport access</strong> <a href={place.airportUrl} target="_blank" rel="noreferrer">{place.airport}</a></p><p><strong>Lifestyle</strong> {place.rhythm}</p><p><strong>Ideal for</strong> {place.idealFor}</p></div>
         <div className="explorer-area-tags">{place.tags.slice(0,4).map(id=><span className={filters.includes(id)?'matched':''} key={id}>{lifestyleFilters.find(f=>f.id===id)!.label}</span>)}</div>
         <div className="explorer-area-card-bottom"><span>{filters.length?`${count} of ${filters.length} preferences`:(place.alternative?'A fresh perspective':'A place to start')}</span><button type="button" onClick={()=>setSelectedId(place.id)} aria-label={`Explore ${place.name}`}>Meet this place →</button></div>
        </article>
       })}
      </div>
      <div className="explorer-map-column"><ExplorerMap country={d.slug} places={matches} selectedId={selectedId} onSelect={setSelectedId} fitKey={fitKey}/>
       {selected?<article className="explorer-place-detail" aria-label={`${selected.name} area guide`}><div className="explorer-detail-heading"><span className="eyebrow">A little more about this place</span><button type="button" className="explorer-text-button" onClick={()=>setSelectedId('')} aria-label="Close area guide">Close ×</button></div><img className="place-detail-photo" src={selected.image} alt={`${selected.name}, ${selected.region}`}/><h3>{selected.name} <small>{matchPercentage(selected,filters)===null?"":`${matchPercentage(selected,filters)}% match`}</small></h3><p>{selected.intro}</p><p><strong>Airport access:</strong> {selected.airport}</p><p><strong>Ideal for:</strong> {selected.idealFor}</p><p>{selected.rhythm}</p><div className="explorer-area-tags">{selected.tags.map(id=><span key={id} className={filters.includes(id)?'matched':''}>{lifestyleFilters.find(f=>f.id===id)!.label}</span>)}</div><div className="explorer-plan-note"><strong>Bring this to our conversation</strong><p>{selected.consider}</p></div><div className="explorer-detail-actions"><button type="button" className="button dark" onClick={()=>consult(selected)}>Talk to Amanda about {selected.name}</button><a href={selected.source} target="_blank" rel="noreferrer">{selected.guideLabel} ↗</a></div></article>:<div className="explorer-map-prompt"><span aria-hidden>↖</span><div><h3>Your next chapter starts with a place.</h3><p>Choose a pin or “Meet this place” to see a local profile and plan a conversation with Amanda.</p></div></div>}
      </div>
     </div>
     <div className="explorer-consult-strip"><div><span className="eyebrow">Make it personal</span><h3>Let’s talk about your kind of life.</h3><p>Bring these preferences into a consultation. I’ll help you think through your next step.</p></div><button type="button" className="button dark" onClick={()=>consult(selected)}>Discuss My Matches</button></div>
    </div>
   </div>
   <p className="explorer-data-note">Curated places to explore, not properties for sale.  Area character and tags are a starting point for a personal conversation. Local guides: <a href={d.slug==='florida'?'https://www.visitflorida.com/places-to-go/':d.slug==='spain'?'https://www.spain.info/en/destinations/':d.slug==='portugal'?'https://www.visitportugal.com/en/destinos':'https://www.visitcostarica.com/where-to-go'} target="_blank" rel="noreferrer">official destination information ↗</a> · <a href="/photo-credits">Photo credits</a></p>
  </div>
 </section>;
}
