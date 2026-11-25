import {createHash} from 'node:crypto';
import {encryptKey,decryptKey} from './fireflies-core';
import {hasDatabase} from './database';
import {prisma} from './prisma';

const id='private-gmail-sender-credential';
const secret=()=>createHash('sha256').update('amanda-gmail:'+process.env.GMAIL_CLIENT_SECRET).digest('hex');
export const redirectUri='https://developers.google.com/oauthplayground';
export async function senderToken(){
 if(hasDatabase()){
  const row=await prisma.siteContent.findUnique({where:{id}});
  if(typeof row?.content==='string')return decryptKey(row.content,secret());
 }
 return process.env.GMAIL_REFRESH_TOKEN||'';
}
export async function saveSenderToken(token:string){
 const content=encryptKey(token,secret());
 await prisma.siteContent.upsert({where:{id},create:{id,content},update:{content}});
}
