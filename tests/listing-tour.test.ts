import test from 'node:test';
import assert from 'node:assert/strict';
import {autoplaySource,videoSource} from '../lib/listing-tour';
test('listing links select safe providers, direct media, or an external tour',()=>{
 assert.match(videoSource('https://youtu.be/abcdefghijk')!.src,/autoplay=1&mute=1/);
 assert.match(videoSource('https://www.youtube.com/shorts/abcdefghijk',false)!.src,/autoplay=0/);
 assert.equal(videoSource('https://www.instagram.com/reel/Test_1/?igsh=123')?.src,'https://www.instagram.com/reel/Test_1/embed/');
 assert.match(videoSource('https://vimeo.com/123456/abc')!.src,/h=abc/);
 assert.equal(videoSource('https://cdn.example/tour.MP4?sig=abc')?.kind,'file');
 assert.equal(videoSource('https://example.com/tour')?.kind,'link');
 assert.equal(videoSource('https://youtube.com.example/watch?v=abcdefghijk')?.kind,'link');
 assert.equal(videoSource('javascript:alert(1)'),null);
});

test('Instagram companion requires a playable URL and honors reduced motion',()=>{
 assert.equal(autoplaySource('https://www.instagram.com/reel/abc/'),null);
 assert.equal(autoplaySource('https://example.com/landing'),null);
 assert.equal(autoplaySource('https://cdn.example/tour.mp4')?.kind,'file');
 assert.match(autoplaySource('https://youtu.be/abcdefghijk',false)!.src,/autoplay=0/);
});

test('explicit embed mode plays a custom player inline without changing ordinary links',async()=>{
 const {listingPlayer}=await import('../lib/listing-tour');
 const tour={id:'1',title:'Home',description:'',url:'https://tours.example.com/embed/123'};
 assert.equal(listingPlayer(tour)?.kind,'link');
 assert.deepEqual(listingPlayer({...tour,embed:true}),{kind:'embed',src:tour.url});
 assert.equal(listingPlayer({...tour,embed:true,url:'javascript:alert(1)'}),null);
 assert.equal(listingPlayer({...tour,embed:true,url:'https://youtu.be/abcdefghijk'})?.kind,'youtube');
});

test('an on-page source takes precedence while the original platform link is preserved',async()=>{
 const {listingPlayer}=await import('../lib/listing-tour');
 for(const url of ['https://www.instagram.com/reel/Df8IGrABTKb/', 'https://tours.example/ocala']){
   const tour={id:'ocala',title:'Property in Ocala, FL',description:'',url,embed:true,autoplayUrl:'https://cdn.example/ocala.mp4'};
   assert.deepEqual(listingPlayer(tour,false),{kind:'file',src:tour.autoplayUrl});
   assert.equal(tour.url,url);
 }
});

test('Zillow links preserve property identity and discard share tracking',async()=>{
 const {zillowListingUrl}=await import('../lib/listing-tour');
 const home='https://www.zillow.com/homedetails/3304-Ashmonte-Dr-Land-O-Lakes-FL-34638/55805130_zpid/';
 assert.equal(zillowListingUrl(home+'?utm_source=share#details'),home);
 assert.equal(zillowListingUrl('https://zillow.com/homedetails/55805130_zpid'),'https://www.zillow.com/homedetails/55805130_zpid/');
 for(const value of [undefined,'','https://www.zillow.com/ocala-fl/','https://www.zillow.com.evil.example/homedetails/123_zpid/','https://example.com@zillow.com/homedetails/123_zpid/','http://zillow.com/homedetails/123_zpid/'])assert.equal(zillowListingUrl(value),null);
});
