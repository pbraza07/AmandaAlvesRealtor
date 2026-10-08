import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeContentUpdate } from '../lib/content-update';
import { defaultContent } from '../lib/content';
test('bio text and uploaded photos survive saving without truncation',()=>{
 const body='A full biography paragraph. '.repeat(150);
 const image='data:image/jpeg;base64,'+Buffer.alloc(20000,1).toString('base64');
 const updated=sanitizeContentUpdate({bioBody:body,bioImageUrl:image,bioHeading:'My story'});
 assert.equal(updated.bioBody,body.trim());assert.equal(updated.bioImageUrl,image);
 assert.equal(updated.bioHeading,'My story');assert.equal(updated.phone,defaultContent.phone);
});
test('older saved content gains bio defaults and partial updates preserve existing fields',()=>{
 const updated=sanitizeContentUpdate({bioHeading:'About me'},{phone:'813-555-0100',bioBody:'Keep my existing story'});
 assert.equal(updated.phone,'813-555-0100');assert.equal(updated.bioBody,'Keep my existing story');assert.equal(updated.bioImageCaption,defaultContent.bioImageCaption);
});
test('bio image field rejects unsafe URLs and unsupported image data',()=>{
 for(const bioImageUrl of ['javascript:alert(1)','data:image/svg+xml;base64,abc','//unsafe.example/picture'])assert.throws(()=>sanitizeContentUpdate({bioImageUrl}));
 assert.equal(sanitizeContentUpdate({bioImageUrl:'/images/amanda-family-bio.webp'}).bioImageUrl,'/images/amanda-family-bio.webp');
});
