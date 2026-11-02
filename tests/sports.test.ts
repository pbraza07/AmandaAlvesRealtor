import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sportsCatalog,sportsDistanceKm,nearbySports,type NearbySport} from '../lib/sports';
import {livingResearch} from '../lib/researched-cities';
import {cityById} from '../lib/city-index';
import {CitySports} from '../components/CitySports';
import {translate} from '../lib/i18n/core';
const countries=['florida','portugal','spain','costa-rica'] as const;
test('sports catalogs have dated roster references, complete declared rosters and valid club bases',()=>{
 for(const country of countries){
  const catalog=sportsCatalog(country);assert.equal(catalog.country,country);assert.match(catalog.updatedAt,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(catalog.sports.length>=3);assert.equal(new Set(catalog.sports.map(s=>s.id)).size,catalog.sports.length);
  for(const sport of catalog.sports){
   assert.ok(sport.competitions.some(c=>c.level==='first'),`${country}: ${sport.id} first tier`);
   assert.equal(sport.competitions.some(c=>c.level==='second'),sport.secondTierStatus==='available',`${country}: ${sport.id} second-tier status`);
   for(const locale of ['en','es','pt'] as const)assert.ok(sport.note[locale].length>10);
   for(const league of sport.competitions){
    assert.match(league.sourceUrl,/^https:\/\//);assert.ok(league.season.length>=4);assert.ok(league.teams.length>=2);assert.equal(league.coverage,'complete',`${country}: ${league.name} roster`);
    assert.equal(new Set(league.teams.map(t=>t.name)).size,league.teams.length);
    for(const club of league.teams){assert.ok(club.name&&club.base);assert.match(club.url,/^https:\/\//);assert.ok(Number.isFinite(club.lat)&&Math.abs(club.lat)<=90);assert.ok(Number.isFinite(club.lng)&&Math.abs(club.lng)<=180)}
   }
  }
 }
 const florida=sportsCatalog('florida');
 for(const [id,counts] of Object.entries({soccer:[30,25],basketball:[30],'american-football':[32],baseball:[30],'ice-hockey':[32]}))assert.deepEqual(florida.sports.find(s=>s.id===id)!.competitions.map(c=>c.teams.length),counts);
});
test('every one of the 400 city guides selects the geographically nearest club in each listed division',()=>{
 assert.ok(Math.abs(sportsDistanceKm(0,0,0,1)-111.195)<.01);assert.equal(sportsDistanceKm(10,-80,10,-80),0);
 for(const country of countries){const catalog=sportsCatalog(country);
  for(const profile of livingResearch(country).places){
   const city=cityById(country,`gn-${profile.geonamesId}`)!;assert.ok(city.sports);assert.equal(city.sports.sports.length,catalog.sports.length);
   for(const sport of catalog.sports){const result:NearbySport=city.sports.sports.find(s=>s.id===sport.id)!;
    for(const level of ['first','second'] as const){
     const candidates=sport.competitions.filter(c=>c.level===level).flatMap(c=>c.teams.map(t=>({club:t,distance:sportsDistanceKm(city.lat,city.lng,t.lat,t.lng)})));
     if(!candidates.length){assert.equal(result[level],undefined);continue}
     const minimum=Math.min(...candidates.map(t=>t.distance));assert.equal(result[level]!.distanceKm,Math.round(minimum),`${city.name} ${sport.id} ${level}`);
     const nearest=candidates.filter(c=>Math.abs(c.distance-minimum)<.001).map(c=>c.club.name).sort();
     const displayed=[result[level]!.name,...(result[level]!.tiedTeams||[]).map(t=>t.name)].sort();assert.deepEqual(displayed,nearest,`${city.name} ${sport.id} ${level}`);
    }
   }
  }
 }
});
test('sports references explain distances, preserve source links and do not label US developmental leagues as division two',()=>{
 const guide=nearbySports('florida',27.95,-82.46);const html=renderToStaticMarkup(React.createElement(CitySports,{guide,expanded:true}));
 assert.match(html,/Nearby sports teams/);assert.match(html,/Tampa Bay Rowdies/);assert.match(html,/home-base cities/);assert.match(html,/Team \/ league source/);assert.match(html,/2026/);
 assert.equal((html.match(/No formal second division/g)||[]).length,4);
 for(const locale of ['es','pt'] as const)for(const label of ['Nearby sports teams','First division / top league','Second division','Team reference not verified'])assert.notEqual(translate(label,locale),label);
});
