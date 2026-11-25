import {gmailHealth} from '@/lib/gmail-health';
export const dynamic='force-dynamic';
export async function GET(){
 return Response.json({status:await gmailHealth()},{headers:{'Cache-Control':'no-store'}});
}
