import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {translate,validLocale} from '../lib/i18n/core';
import {localizeTree} from '../components/SiteLanguage';
import {areas,lifestyleFilters,filterAreas} from '../lib/explorer';
import {destinations} from '../lib/lifestyle';

test('Spanish and Portuguese cover every destination profile, lifestyle filter, and destination story',()=>{
 for(const locale of ['es','pt'] as const){
  for(const area of areas)for(const key of ['intro','rhythm','consider','idealFor'] as const)assert.notEqual(translate(area[key],locale),area[key],`${locale}: ${area.id}.${key}`);
  for(const filter of lifestyleFilters)for(const key of ['label','hint'] as const)assert.notEqual(translate(filter[key],locale),filter[key],`${locale}: ${filter.id}.${key}`);
  for(const destination of destinations)for(const text of [destination.title,destination.kicker,destination.description,destination.vision,...destination.questions,...destination.focus])assert.notEqual(translate(text,locale),text,`${locale}: ${text}`);
 }
});
test('language rendering preserves form business values and visitor-entered text',()=>{
 const handler=()=>{};
 const tree=React.createElement('form',{},React.createElement('label',{},'First name'),React.createElement('input',{name:'firstName',defaultValue:'Home',onChange:handler}),React.createElement('select',{name:'destination',defaultValue:'Spain'},React.createElement('option',{},'Spain'),React.createElement('option',{value:'Florida'},'Florida')),React.createElement('a',{href:'/lifestyle/spain'},'Explore'));
 const es=renderToStaticMarkup(localizeTree(tree,'es'));
 assert.match(es,/>Nombre<\/label>/);
 assert.match(es,/value="Home"/);
 assert.match(es,/<option value="Spain" selected="">España<\/option>/);
 assert.match(es,/href="\/lifestyle\/spain"/);
 const pt=renderToStaticMarkup(localizeTree(tree,'pt'));
 assert.match(pt,/>Nome<\/label>/);assert.match(pt,/value="Florida">Flórida/);
 assert.equal(renderToStaticMarkup(localizeTree(tree,'en')).includes('First name'),true);
});
test('dynamic matches, guide labels, airport details, and translated searches retain meaning',()=>{
 assert.equal(translate('67% match','es'),'67% de coincidencia');
 assert.equal(translate('2 of 3 preferences','pt'),'2 de 3 preferências');
 assert.equal(translate('Official Foz do Arelho guide','pt'),'Guia oficial de Foz do Arelho');
 assert.match(translate(areas[0].airport,'es'),/km en línea recta/);
 assert.match(translate(areas[0].airport,'pt'),/km em linha reta/);
 assert.equal(filterAreas({country:'portugal',filters:[],search:'Costa de Prata',locale:'pt'}).length,3);
 assert.equal(filterAreas({country:'portugal',filters:[],search:'Lisboa',locale:'es'}).some(a=>a.id==='lisbon'),true);
 assert.equal(validLocale('invalid'),'en');assert.equal(validLocale('pt'),'pt');
});
