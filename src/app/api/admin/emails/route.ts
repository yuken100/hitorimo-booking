import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';
import { sendPersonalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// 送信履歴（予約・お問い合わせごとに画面で振り分ける）
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  const emails = await prisma.sentEmail.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
  return NextResponse.json(emails);
}

// 宛先は、予約またはお問い合わせに登録されたアドレスに限る（画面から任意の宛先には送れない）
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { bookingId, inquiryId, subject, text } = body;
  if (
    (typeof bookingId === 'string') === (typeof inquiryId === 'string') ||
    typeof subject !== 'string' || !subject.trim() || subject.length > 200 ||
    typeof text !== 'string' || !text.trim() || text.length > 10000
  ) {
    return NextResponse.json({ error: '件名と本文を入力してください' }, { status: 400 });
  }

  const record =
    typeof bookingId === 'string'
      ? await prisma.booking.findUnique({ where: { id: bookingId }, select: { email: true } })
      : await prisma.inquiry.findUnique({ where: { id: inquiryId }, select: { email: true } });
  if (!record) {
    return NextResponse.json({ error: '宛先が見つかりません' }, { status: 404 });
  }

  try {
    await sendPersonalEmail({ to: record.email, subject: subject.trim(), body: text });
  } catch (error) {
    console.error('Personal email failed:', error);
    return NextResponse.json({ error: 'メールを送れませんでした。時間をおいてお試しください。' }, { status: 502 });
  }

  const saved = await prisma.sentEmail.create({
    data: {
      bookingId: typeof bookingId === 'string' ? bookingId : null,
      inquiryId: typeof inquiryId === 'string' ? inquiryId : null,
      toEmail: record.email,
      subject: subject.trim(),
      body: text,
    },
  });
  return NextResponse.json(saved, { status: 201 });
}
