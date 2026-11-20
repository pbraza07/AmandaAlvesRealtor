import {notFound,redirect} from 'next/navigation';
import {getAdmin} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {textLanguage} from '@/lib/report-language';
import {MeetingPdfViewer} from '@/components/MeetingPdfViewer';

export default async function ReportPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{transcript?:string}>}){
 const admin=await getAdmin();
 if(!admin)redirect('/admin/login');
 const {id}=await params;
 const report=await prisma.meetingReport.findFirst({where:{id,userId:admin.id},select:{title:true,uploadLanguage:true,overview:true,status:true}});
 if(!report)notFound();
 if(report.status!=='READY')redirect('/admin/meetings?report='+encodeURIComponent(id));
 const lang=report.uploadLanguage;
 return <MeetingPdfViewer id={id} title={report.title} transcript={(await searchParams).transcript==='1'}
  language={lang==='pt'||lang==='es'||lang==='en'?lang:textLanguage(report.overview)||'en'}/>;
}
