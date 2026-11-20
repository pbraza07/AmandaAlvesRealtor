import {NextResponse} from 'next/server';
import {getAdmin,rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {fireflies,firefliesKey} from '@/lib/fireflies';

type Studio = {uploads:number; live:number; minutes:number; pendingDuration:number};
type Account = {minutes_consumed:number|null; num_transcripts:number|null};
export async function GET() {
  const admin=await getAdmin();
  if (!admin) return NextResponse.json({error:'Unauthorized'},{status:401});
  const now=new Date();
  const since=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const [studio]=await prisma.$queryRaw<Studio[]>`
    SELECT count(*) FILTER (WHERE "mimeType" <> 'application/x-google-meet')::int AS uploads,
      count(*) FILTER (WHERE "mimeType" = 'application/x-google-meet')::int AS live,
      coalesce(sum(CASE WHEN jsonb_typeof(transcript->'duration') = 'number' THEN (transcript->>'duration')::float END)
        FILTER (WHERE "mimeType" <> 'application/x-google-meet'),0)::float AS minutes,
      count(*) FILTER (WHERE "mimeType" <> 'application/x-google-meet' AND jsonb_typeof(transcript->'duration') IS DISTINCT FROM 'number')::int AS "pendingDuration"
    FROM "MeetingReport" WHERE "userId" = ${admin.id} AND "createdAt" >= ${since}`;
  let account:Account|null=null;
  let message='';
  try {
    const key=await firefliesKey(admin.id);
    if (!rateLimit('ff-usage:'+admin.id,4,60000)) throw new Error('Please wait a minute before refreshing usage.');
    account=(await fireflies<{user:Account}>(key,'query { user { minutes_consumed num_transcripts } }')).user;
  } catch(error) {message=error instanceof Error?error.message:'Fireflies usage unavailable.'}
  return NextResponse.json({studio,account,message,checkedAt:now.toISOString()},{headers:{'Cache-Control':'private, no-store'}});
}
