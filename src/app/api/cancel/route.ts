import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEAD_MS } from '@/lib/config';
import { formatJstDateTime, formatJstRange } from '@/lib/time';
import { sendCancellationEmails } from '@/lib/email';

export const dynamic = 'force-dynamic';

const findByToken = (token: string) =>
  prisma.booking.findUnique({ where: { cancelToken: token }, include: { slot: true } });

// キャンセル画面に出す内容（メールアドレスや相談内容は返さない）
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const booking = token ? await findByToken(token) : null;
  if (!booking) {
    return NextResponse.json({ error: 'ご予約が見つかりません' }, { status: 404 });
  }

  const deadline = new Date(booking.slot.startTime.getTime() - LEAD_MS);
  return NextResponse.json({
    name: booking.name,
    when: formatJstRange(booking.slot.startTime, booking.slot.endTime),
    deadline: formatJstDateTime(deadline),
    status: booking.status,
    canCancel: booking.status === 'CONFIRMED' && Date.now() <= deadline.getTime(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  const booking = token ? await findByToken(token) : null;
  if (!booking) {
    return NextResponse.json({ error: 'ご予約が見つかりません' }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: 'CONFIRMED',
        slot: { startTime: { gte: new Date(Date.now() + LEAD_MS) } },
      },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (updated.count === 0) return false;
    await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } });
    return true;
  });

  if (!result) {
    const message =
      booking.status === 'CANCELLED'
        ? 'このご予約は、すでにキャンセルされています'
        : 'キャンセルの受付期限を過ぎています。お手数ですが、別途ご連絡ください';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await sendCancellationEmails(
    {
      bookingId: booking.id,
      name: booking.name,
      email: booking.email,
      company: booking.company,
      message: booking.message,
      startTime: booking.slot.startTime,
      endTime: booking.slot.endTime,
      cancelToken: token,
    },
    process.env.ADMIN_EMAIL
  ).catch((err) => console.error('Cancellation email failed:', err));

  return NextResponse.json({ ok: true });
}
