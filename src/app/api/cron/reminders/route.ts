import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { endOfTomorrowJst, isSameJstDay } from '@/lib/time';
import { sendReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Vercel Cron が毎朝9時（日本時間）に呼ぶ。明日までの予約で、まだ送っていないものにリマインドを送る
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      cancelToken: { not: null },
      slot: { startTime: { gt: now, lt: endOfTomorrowJst(now) } },
    },
    include: { slot: true },
  });

  let sent = 0;
  for (const booking of bookings) {
    try {
      await sendReminderEmail(
        {
          bookingId: booking.id,
          name: booking.name,
          email: booking.email,
          company: booking.company,
          message: booking.message,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          cancelToken: booking.cancelToken!,
        },
        isSameJstDay(booking.slot.startTime, now) ? '本日' : '明日'
      );
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
      sent++;
    } catch (error) {
      console.error('Reminder failed for booking', booking.id, error);
    }
  }

  return NextResponse.json({ sent, total: bookings.length });
}
