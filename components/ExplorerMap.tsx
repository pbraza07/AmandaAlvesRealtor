"use client";
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { countryViews, type Area, type CountrySlug } from '@/lib/explorer';

type Props={country:CountrySlug;places:Area[];selectedId:string;onSelect:(id:string)=>void;fitKey:string};
export function ExplorerMap({country,places,selectedId,onSelect,fitKey}:Props){
 const container=useRef<HTMLDivElement>(null);
 const map=useRef<Leaflet.Map|null>(null);
 const layer=useRef<Leaflet.LayerGroup|null>(null);
 const library=useRef<typeof Leaflet|null>(null);
 const markers=useRef(new Map<string,Leaflet.Marker>());
 const selectRef=useRef(onSelect);selectRef.current=onSelect;
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[tileError,setTileError]=useState(false);
 const view=countryViews[country];
 useEffect(()=>{
  let disposed=false;let observer:ResizeObserver|undefined;
  import('leaflet').then(L=>{
   if(disposed||!container.current)return;
   library.current=L;
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const m=L.map(container.current,{scrollWheelZoom:false,zoomControl:true,zoomAnimation:!reduce,fadeAnimation:!reduce}).setView(view.center,view.zoom);
   map.current=m;layer.current=L.layerGroup().addTo(m);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'}).on('tileerror',()=>{if(!disposed)setTileError(true)}).on('tileload',()=>{if(!disposed)setTileError(false)}).addTo(m);
   observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(container.current);
   setReady(true);
  }).catch(()=>{if(!disposed)setError(true)});
  return()=>{disposed=true;observer?.disconnect();map.current?.remove();map.current=null;layer.current=null;markers.current.clear()};
 // The explorer is keyed by country; each map has one lifetime.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
  if(!ready||!library.current||!map.current||!layer.current)return;
  const L=library.current;layer.current.clearLayers();markers.current.clear();
  places.forEach((place,index)=>{
   const pin=document.createElement('span');pin.className='explorer-pin-number';const label=document.createElement('b');label.textContent=String(index+1);pin.append(label);
   const icon=L.divIcon({html:pin,className:'explorer-pin',iconSize:[34,42],iconAnchor:[17,42],tooltipAnchor:[0,-38]});
   const marker=L.marker([place.lat,place.lng],{icon,title:`Explore ${place.name}`,alt:`${index+1}. ${place.name}`,keyboard:true,riseOnHover:true});
   const tooltip=document.createElement('span');tooltip.textContent=place.name;marker.bindTooltip(tooltip,{direction:'top'});
   marker.on('click',()=>selectRef.current(place.id));marker.addTo(layer.current!);markers.current.set(place.id,marker);
  });
 },[places,ready]);
 useEffect(()=>{
  const m=map.current,L=library.current;if(!m||!L||!ready)return;
  if(places.length)m.fitBounds(L.latLngBounds(places.map(p=>[p.lat,p.lng] as [number,number])),{padding:[40,40],maxZoom:11,animate:false});
  else m.setView(view.center,view.zoom,{animate:false});
 // Fit only when country, filters, or result ordering changes, not marker selection.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[fitKey,ready]);
 useEffect(()=>{
  if(!ready)return;
  markers.current.forEach((marker,id)=>{
   const element=marker.getElement();element?.classList.toggle('is-selected',id===selectedId);element?.setAttribute('aria-pressed',String(id===selectedId));
   if(id===selectedId){marker.setZIndexOffset(1000);map.current?.panTo(marker.getLatLng(),{animate:false})}else marker.setZIndexOffset(0);
  });
 },[selectedId,places,ready]);
 const resetView=()=>{const m=map.current,L=library.current;if(!m||!L)return;if(places.length)m.fitBounds(L.latLngBounds(places.map(p=>[p.lat,p.lng] as [number,number])),{padding:[40,40],maxZoom:11});else m.setView(view.center,view.zoom)};
 return <div className="explorer-map-wrap">
  <div className="explorer-map-top"><span><i aria-hidden/> {places.length} {places.length===1?'place':'places'} on this map</span><button type="button" onClick={resetView} disabled={!ready}>Show all matches</button></div>
  <div ref={container} className="explorer-map" role="region" aria-label={`Interactive map of matching places in ${country.replace('-',' ')}`} />
  {!ready&&<div className="explorer-map-loading" role="status">{error?'The map couldn’t load. You can explore every place in the list.':'Opening your map…'}</div>}
  {tileError&&<p className="explorer-map-notice" role="status">Map imagery is temporarily unavailable. Location pins and the area list are still available.</p>}
  <p className="explorer-map-caption">Select a numbered pin or an area card. Drag to explore; use + / − to zoom. Pins mark approximate area centers.</p>
 </div>;
}
