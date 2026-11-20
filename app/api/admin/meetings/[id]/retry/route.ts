import {NextResponse} from 'next/server';
import {getAdmin,verifyOrigin} from '@/lib/security';
import {retrySavedRecording} from '@/lib/retry-recording';
export async function POST(req:Request,c:{params:Promise<{id:string}>}){
 const admin=await getAdmin();
 if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  await verifyOrigin();
  const {id}=await c.params;
  await retrySavedRecording(id,admin.id,new URL(process.env.RENDER_EXTERNAL_URL||process.env.NEXT_PUBLIC_SITE_URL||req.url).origin);
  return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to retry this recording.'},{status:409})}
}
