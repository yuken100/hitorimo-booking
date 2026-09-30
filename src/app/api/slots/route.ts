import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEAD_MS } from '@/lib/config';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 60;

// 予約ページに出す枠：開始24時間後以降〜60日先までの空き枠
export async function GET() {
  try {
    const now = Date.now();
    const slots = await prisma.slot.findMany({
      where: {
        status: 'OPEN',
        startTime: {
          gte: new Date(now + LEAD_MS),
          lte: new Date(now + WINDOW_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, startTime: true, endTime: true, status: true },
      orderBy: { startTime: 'asc' },
    });
    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
  }
}
