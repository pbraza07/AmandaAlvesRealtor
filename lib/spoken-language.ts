import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const languageCodes = ['pt', 'en', 'es'] as const;
export type MeetingLanguage = typeof languageCodes[number];
export function isMeetingLanguage(value:unknown): value is MeetingLanguage {
  return languageCodes.some(code => code === value);
}
export function parseDetection(log:string) {
  const match = log.match(/auto-detected language: ([\w-]+) \(p = ([\d.]+)\)/);
  return match && isMeetingLanguage(match[1]) && Number(match[2]) >= 0.80 ? match[1] : null;
}
let detecting = false;
export async function detectRecordingLanguage(file:File, mime:string):Promise<MeetingLanguage> {
  if (detecting) throw new Error('Another recording is being checked. Choose the spoken language or try again in a moment.');
  detecting = true;
  let dir:string|undefined;
  try {
    dir = await mkdtemp(path.join(tmpdir(),'meeting-language-'));
    const input = path.join(dir,'source');
    await pipeline(Readable.fromWeb(file.stream() as NodeReadableStream<Uint8Array>), createWriteStream(input,{mode:0o600}));
    const bin = path.join(process.cwd(),'.meeting-language');
    const format = ({'audio/mpeg':'mp3','audio/mp4':'mov','video/mp4':'mov','audio/wav':'wav','audio/ogg':'ogg'} as Record<string,string>)[mime];
    const wav = path.join(dir,'sample.wav');
    for (const start of [0,45]) {
      await exec(path.join(bin,'ffmpeg'),['-nostdin','-loglevel','error','-y','-protocol_whitelist','file','-f',format,'-ss',String(start),'-i',input,'-map','0:a:0','-t','30','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',wav],{timeout:20000});
      const sample=await readFile(wav);
      let voiced=0;
      for(let i=80;i+1<sample.length;i+=2)if(Math.abs(sample.readInt16LE(i))>250)voiced++;
      if(voiced<3200)continue;
      const {stderr} = await exec(path.join(bin,'detect'),['-dl','-t','2','-m',path.join(bin,'tiny.bin'),'-f',wav],{timeout:45000});
      const language = parseDetection(stderr);
      if (language) return language;
    }
  } catch {
    // A missing speech sample or unavailable decoder must never silently become English.
  } finally {
    detecting=false;
    if(dir) await rm(dir,{recursive:true,force:true});
  }
  throw new Error('Could not confirm the spoken language. Select Portuguese, English or Spanish and submit the same file. No transcription was requested.');
}
