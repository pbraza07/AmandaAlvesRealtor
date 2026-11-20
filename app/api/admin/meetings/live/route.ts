import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getAdmin, verifyOrigin, rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {digest, readBounded} from '@/lib/fireflies-core';
import {fireflies, firefliesKey, reportSelect} from '@/lib/fireflies';

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  let reportId: string | undefined;
  try {
    await verifyOrigin();
    if (!rateLimit('meet-invite:' + admin.id, 5, 60000)) {
      return NextResponse.json({error: 'Please wait a minute before inviting again.'}, {status: 429});
    }
    const input = JSON.parse((await readBounded(req, 8192)).toString('utf8'));
    const url = new URL(input.link);
    if (url.origin !== 'https://meet.google.com' || url.username || url.password || !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(url.pathname)) {
      throw new Error('Paste the Google Meet joining link from the meeting.');
    }
    const title = String(input.title || '').trim();
    if (!title || title.length > 180 || input.consent !== 'yes') throw new Error('Add a meeting title and confirm permission to record.');
    const link = url.origin + url.pathname.replace(/\/$/, '');
    const key = await firefliesKey(admin.id);
    const room = digest(admin.id + ':' + link);
    const {meeting, existing} = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${room}))`;
      const previous = await tx.meetingReport.findFirst({where: {userId: admin.id, fileHash: {startsWith: room + ':'}, status: {not: 'READY'}, createdAt: {gt: new Date(Date.now() - 86400000)}}, select: reportSelect});
      if (previous) return {meeting: previous, existing: true};
      const meeting = await tx.meetingReport.create({data: {userId: admin.id, title, fileName: 'Google Meet', mimeType: 'application/x-google-meet', fileHash: room + ':' + randomUUID(), accessHash: digest(randomUUID()), expiresAt: new Date()}, select: reportSelect});
      return {meeting, existing: false};
    });
    if (existing) return NextResponse.json({meeting, existing});
    reportId = meeting.id;
    const result = await fireflies<{addToLiveMeeting: {success: boolean}}>(key,
      'mutation($link: String!, $title: String!) { addToLiveMeeting(meeting_link: $link, title: $title) { success } }',
      {link, title: title + ' [AA:' + meeting.id + ']'});
    if (!result.addToLiveMeeting?.success) throw new Error('Fireflies did not confirm the invitation.');
    await prisma.meetingReport.updateMany({where: {id: reportId, status: 'UPLOADING'}, data: {status: 'PROCESSING'}});
    return NextResponse.json({meeting: {...meeting, status: 'PROCESSING'}});
  } catch (error) {
    if (reportId) await prisma.meetingReport.updateMany({where: {id: reportId, status: 'UPLOADING'}, data: {status: 'CHECK_REQUIRED', error: 'Check the Meet participant list and Fireflies before retrying. If the invitation failed, delete this report and invite again.'}});
    return NextResponse.json({error: error instanceof Error ? error.message : 'Invitation failed.'}, {status: 400});
  }
}
