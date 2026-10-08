import test from 'node:test';
import assert from 'node:assert/strict';
import { exportLeadsCsv } from '../lib/lead-export';
test('export has separate buyer and seller columns and retains older custom data',()=>{
 const csv=exportLeadsCsv([{id:'1',type:'SELLER',firstName:'Ana',bestTime:'Morning',consentPrivacy:true,details:{propertyAddress:'123 Main',city:'Tampa',squareFeet:'2500',customField:'Keep me',generalDetails:'Hello, "Amanda"\nSecond line'}},{id:'2',type:'BUYER',details:{areas:'Lutz',budget:'500000',financingType:'VA',targetDate:'2027-01-01'}}]);
 const header=csv.split('\r\n')[0];
 for(const field of ['Best time to contact','Property address','City','Approx. square footage','Budget range','Financing type, if known','Preferred move-in date','Privacy acknowledgment','Details: customField']) assert.ok(header.includes(`"${field}"`),field);
 assert.ok(csv.includes('Keep me'));assert.ok(csv.includes('"Hello, ""Amanda""\nSecond line"'));
});
test('empty export still contains every form field and formulas are escaped',()=>{
 assert.ok(exportLeadsCsv([]).includes('Desired selling timeline'));
 assert.ok(exportLeadsCsv([{type:'BUYER',firstName:'=1+1',details:{}}]).includes('"\'=1+1"'));
});
