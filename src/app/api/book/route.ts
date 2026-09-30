import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEAD_MS } from '@/lib/config';
import { EMAIL_RE, clientHashOf } from '@/lib/client';
import { sendAdminNotificationEmail, sendBookingConfirmationEmail } from '@/lib/email';

const MAX_BOOKINGS_PER_CLIENT_PER_HOUR = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { slotId, name, email, company, message, privacyAgreed, website } = body;

    // 人には見えない入力欄が埋まっていたら、機械による送信とみなし、何もせずに成功を装う
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ id: 'ok' }, { status: 201 });
    }

    if (
      typeof slotId !== 'string' ||
      typeof name !== 'string' || !name.trim() || name.length > 100 ||
      typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254 ||
      typeof message !== 'string' || !message.trim() || message.length > 2000 ||
      (company != null && (typeof company !== 'string' || company.length > 200))
    ) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }

    if (privacyAgreed !== true) {
      return NextResponse.json({ error: 'プライバシーポリシーへの同意が必要です' }, { status: 400 });
    }

    const normalizedEmail = email.trim();
    const clientHash = clientHashOf(request);

    const [futureBookingForEmail, recentFromClient] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          status: 'CONFIRMED',
          slot: { startTime: { gt: new Date() } },
        },
        select: { id: true },
      }),
      prisma.booking.count({
        where: { clientHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      }),
    ]);

    if (futureBookingForEmail) {
      return NextResponse.json(
        {
          error:
            'このメールアドレスでは、すでにご予約があります。日時を変えたい場合は、確認メールのボタンからキャンセルしたうえで、あらためてご予約ください。',
        },
        { status: 400 }
      );
    }
    if (recentFromClient >= MAX_BOOKINGS_PER_CLIENT_PER_HOUR) {
      return NextResponse.json(
        { error: '短い時間に多くのご予約がありました。お手数ですが、しばらく時間をおいてからお試しください。' },
        { status: 429 }
      );
    }

    const cancelToken = randomBytes(24).toString('base64url');

    // 枠の確保と予約作成を同時に行い、二重予約と受付終了後の予約を防ぐ
    const booking = await prisma.$transaction(async (tx) => {
      const claimed = await tx.slot.updateMany({
        where: {
          id: slotId,
          status: 'OPEN',
          startTime: { gte: new Date(Date.now() + LEAD_MS) },
        },
        data: { status: 'FULL' },
      });
      if (claimed.count === 0) return null;

      return tx.booking.create({
        data: {
          slotId,
          name: name.trim(),
          email: normalizedEmail,
          company: company?.trim() || null,
          message: message.trim(),
          status: 'CONFIRMED',
          cancelToken,
          privacyAgreedAt: new Date(),
          clientHash,
        },
        include: { slot: true },
      });
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'この日時はすでに予約が入ったか、受付を終了しました。別の日時をお選びください。' },
        { status: 409 }
      );
    }

    const emailData = {
      bookingId: booking.id,
      name: booking.name,
      email: booking.email,
      company: booking.company,
      message: booking.message,
      startTime: booking.slot.startTime,
      endTime: booking.slot.endTime,
      cancelToken,
    };
    const adminEmail = process.env.ADMIN_EMAIL;

    // メール送信に失敗しても、予約そのものは成立させる
    await Promise.all([
      sendBookingConfirmationEmail(emailData),
      adminEmail ? sendAdminNotificationEmail(emailData, adminEmail) : Promise.resolve(),
    ]).catch((err) => console.error('Email send failed:', err));

    return NextResponse.json({ id: booking.id }, { status: 201 });
  } catch (error) {
    console.error('Error booking slot:', error);
    return NextResponse.json({ error: '予約できませんでした。時間をおいて、もう一度お試しください。' }, { status: 500 });
  }
}
