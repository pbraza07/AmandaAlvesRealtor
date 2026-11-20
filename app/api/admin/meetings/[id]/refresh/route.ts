import {NextResponse} from 'next/server';
import {getAdmin,verifyOrigin} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {refreshMeeting,reportSelect} from '@/lib/fireflies';
export async function POST(_req:Request,c:{params:Promise<{id:string}>}){const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});try{await verifyOrigin();const {id}=await c.params;await refreshMeeting(id,admin.id);return NextResponse.json({meeting:await prisma.meetingReport.findFirst({where:{id,userId:admin.id},select:reportSelect})})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Refresh failed'},{status:400})}}
