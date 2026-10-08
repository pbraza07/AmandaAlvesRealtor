import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedLeadFields, states } from '../lib/form-fields';
test('seller notification includes all fields in form order, including blank values', () => {
 const rows = orderedLeadFields({type:'SELLER',firstName:'Taylor',details:{city:'Tampa',consentPrivacy:true}});
 assert.deepEqual(rows.slice(0,4).map(r=>r[0]),['First name','Last name','Email address','Phone number']);
 assert.equal(rows.find(r=>r[0]==='Property address')?.[1],'Not provided');
 assert.ok(rows.findIndex(r=>r[0]==='Desired selling timeline') < rows.findIndex(r=>r[0]==='Preferred selling date'));
 assert.ok(rows.findIndex(r=>r[0]==='Property photos') < rows.findIndex(r=>r[0]==='Additional questions or details'));
 assert.equal(rows.at(-2)?.[1],'Yes');
 assert.equal(states.length,51);
});
test('buyer notification has state and date fields in form order', () => {
 const labels=orderedLeadFields({type:'BUYER'}).map(r=>r[0]);
 assert.ok(labels.indexOf('State') > labels.indexOf('Areas or cities of interest'));
 assert.ok(labels.indexOf('Preferred move-in date') < labels.indexOf('Current status'));
});
