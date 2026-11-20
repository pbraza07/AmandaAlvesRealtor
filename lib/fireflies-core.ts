import {compileMeeting,providerSummaryAvailable} from './meeting-context';
import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export const MAX_AUDIO_BYTES=60*1024*1024;
export const AUDIO_TTL_MS=48*60*60*1000;
export const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function encryptionKey(secret:string){if(secret.length<32)throw new Error('Secure connection storage is not configured.');return createHash('sha256').update(secret).digest()}
export function encryptKey(value:string,secret:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(secret),iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64url')).join('.')}
export function decryptKey(value:string,secret:string){const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64url'));const cipher=createDecipheriv('aes-256-gcm',encryptionKey(secret),iv);cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8')}
export function accessMatches(token:string,hash:string){const actual=Buffer.from(digest(token)),expected=Buffer.from(hash);return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export function mediaType(name:string,bytes:Uint8Array):string|null{
 const ext=name.toLowerCase().split('.').pop(),b=Buffer.from(bytes.buffer,bytes.byteOffset,Math.min(12,bytes.byteLength));
 if(ext==='mp3'&&(b.subarray(0,3).toString()==='ID3'||(b[0]===255&&(b[1]&224)===224)))return 'audio/mpeg';
 if(ext==='wav'&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WAVE')return 'audio/wav';
 if(ext==='m4a'&&b.subarray(4,8).toString()==='ftyp')return 'audio/mp4';
 if(ext==='mp4'&&b.subarray(4,8).toString()==='ftyp')return b.subarray(8,12).toString()==='M4A '?'audio/mp4':'video/mp4';
 if(ext==='ogg'&&b.subarray(0,4).toString()==='OggS')return 'audio/ogg';
 return null;
}
export async function readBounded(req:Request,max:number){if(Number(req.headers.get('content-length'))>max)throw new Error('File exceeds the 60 MB upload limit.');const reader=req.body?.getReader();if(!reader)throw new Error('Choose an audio file.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('File exceeds the 60 MB upload limit.')}chunks.push(value)}return Buffer.concat(chunks)}
export type FirefliesTranscript={id:string;title:string;date?:number;duration?:number;speakers?:{id:number;name:string}[];sentences?:{text:string;start_time:number;speaker_name?:string}[];summary?:{short_summary?:string;transcript_chapters?:string[];bullet_gist?:string;overview?:string;outline?:string;notes?:string;action_items?:string;topics_discussed?:string[]}|null};
export const reportFields=compileMeeting;
export const hasSummary=providerSummaryAvailable;
export function callbackSignature(id:string,key:string){return createHmac('sha256',key).update(`fireflies-callback:${id}`).digest('base64url')}
