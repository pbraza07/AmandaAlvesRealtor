import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LivingGuideCollection} from '../components/LivingGuideCollection';
import {livingResearch} from '../lib/researched-cities';
import {cityById} from '../lib/city-index';
import type {CityResult} from '../lib/city-types';
test('the collection renders all 100 complete local guides with working country and city links',()=>{
 const cities=livingResearch('portugal').places.map(p=>cityById('portugal',`gn-${p.geonamesId}`)).filter((c):c is CityResult=>!!c);
 const html=renderToStaticMarkup(React.createElement(LivingGuideCollection,{country:'portugal',cities}));
 assert.equal((html.match(/class="living-directory-card"/g)||[]).length,100);
 for(const city of cities){assert.ok(html.includes(city.name.replace(/&/g,'&amp;')));assert.ok(html.includes(`place=${city.id}&amp;researched=1&amp;lang=en#city-guide-${city.id}`))}
 assert.match(html,/Mercado dos Lavradores/);assert.equal((html.match(/What makes it special/g)||[]).length,100);assert.equal((html.match(/Daily life &amp; scouting visit/g)||[]).length,100);assert.match(html,/Picture your everyday/);assert.match(html,/Explore it in person/);assert.match(html,/Airport access/);assert.match(html,/Living considerations/);
 assert.doesNotMatch(html,/Start with your preferred daily routine|local lifestyle details still need review/);
 assert.ok(html.includes('/living-guides?destination=spain&amp;lang=en'));
});
