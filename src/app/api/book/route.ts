import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendBookingConfirmationEmail, sendAdminNotificationEmail } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotId, name, email, company, message } = body;

    // バリデーション
    if (!slotId || !name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // スロット確認
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    if (slot.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Slot is not available' },
        { status: 400 }
      );
    }

    // 枠の確保と予約作成を同時に行い、二重予約を防ぐ
    const booking = await prisma.$transaction(async (tx) => {
      const claimed = await tx.slot.updateMany({
        where: { id: slotId, status: 'OPEN' },
        data: { status: 'FULL' },
      });
      if (claimed.count === 0) return null;

      return tx.booking.create({
        data: {
          slotId,
          name,
          email,
          company: company || null,
          message,
          status: 'CONFIRMED',
        },
        include: {
          slot: true,
        },
      });
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Slot is not available' },
        { status: 409 }
      );
    }

    // メール送信（管理者・顧客）
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;

    if (adminEmail) {
      await Promise.all([
        sendBookingConfirmationEmail({
          name,
          email,
          startTime: slot.startTime,
          endTime: slot.endTime,
          message,
        }),
        sendAdminNotificationEmail({
          name,
          email,
          company,
          startTime: slot.startTime,
          endTime: slot.endTime,
          message,
          adminEmail,
        }),
      ]).catch((err) => {
        console.error('Email send failed:', err);
        // メール送信失敗してもレスポンスは成功で返す
      });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error booking slot:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
