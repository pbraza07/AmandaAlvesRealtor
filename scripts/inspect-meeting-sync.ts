import {prisma} from '../lib/prisma';
import {firefliesKey} from '../lib/fireflies';
async function inspect(){
 const id='cmwp4zhfa0000ql2d9z96w0r7';
 const r=await prisma.meetingReport.findUnique({where:{id},select:{title:true,userId:true,status:true}});
 if(!r||r.status==='READY')return;
 const key=await firefliesKey(r.userId);
 const query=async(query:string,variables={})=>(await fetch('https://api.fireflies.ai/graphql',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({query,variables})})).json();
 const data=await query('query { transcripts(limit:50){ id title date } user { num_transcripts } }');
 const rows=data.data?.transcripts||[];
 const names=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const matched=rows.filter((v:any)=>names(v.title).includes(names(r.title))||v.title.toLowerCase().includes(id));
 const info=await query('{ transcriptType:__type(name:"Transcript"){fields{name}} uploadType:__type(name:"AudioUploadStatus"){fields{name}} }');
 const fields=(type:string)=>info.data?.[type]?.fields?.map((x:any)=>x.name).filter((s:string)=>/id|reference|status/i.test(s))||[];
 const msg=JSON.stringify({listed:rows.length,total:data.data?.user?.num_transcripts,matches:matched.map((v:any)=>({id:v.id,date:v.date,exact:v.title===r.title,marker:v.title.includes(id)})),issues:data.errors?.map((x:any)=>x.extensions?.code),fields:fields('transcriptType'),upload:fields('uploadType')});
 console.log('Meeting sync inspection '+msg);
 await prisma.meetingReport.updateMany({where:{id,status:'PROCESSING'},data:{error:'Synchronization check: '+msg}});
}
inspect().catch(()=>console.error('Sync inspection failed')).finally(()=>prisma.$disconnect());
