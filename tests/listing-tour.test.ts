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
