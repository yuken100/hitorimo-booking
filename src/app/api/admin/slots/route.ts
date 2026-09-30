import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SLOTS_PER_REQUEST = 500;

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const slots = await prisma.slot.findMany({
    where: { startTime: { gte: from }, status: { not: 'CANCELLED' } },
    include: { bookings: { where: { status: 'CONFIRMED' } } },
    orderBy: { startTime: 'asc' },
  });
  return NextResponse.json(slots);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const dates: unknown = body.dates;
  const times: unknown = body.times;
  const duration = Number(body.duration);

  if (
    !Array.isArray(dates) || !dates.every((d) => typeof d === 'string' && DATE_RE.test(d)) ||
    !Array.isArray(times) || !times.every((t) => typeof t === 'string' && TIME_RE.test(t)) ||
    ![30, 60, 90, 120].includes(duration)
  ) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
  }

  const now = Date.now();
  const candidates = (dates as string[])
    .flatMap((d) => (times as string[]).map((t) => new Date(`${d}T${t}:00+09:00`)))
    .filter((start) => start.getTime() > now);

  if (candidates.length === 0) {
    return NextResponse.json({ error: '作成できる枠がありません（過去の日時は作れません）' }, { status: 400 });
  }
  if (candidates.length > MAX_SLOTS_PER_REQUEST) {
    return NextResponse.json({ error: `一度に作れるのは${MAX_SLOTS_PER_REQUEST}枠までです` }, { status: 400 });
  }

  const existing = await prisma.slot.findMany({
    where: { startTime: { in: candidates }, status: { not: 'CANCELLED' } },
    select: { startTime: true },
  });
  const taken = new Set(existing.map((s) => s.startTime.getTime()));
  const toCreate = candidates.filter((start) => !taken.has(start.getTime()));

  const result = await prisma.slot.createMany({
    data: toCreate.map((start) => ({
      startTime: start,
      endTime: new Date(start.getTime() + duration * 60 * 1000),
      status: 'OPEN',
    })),
  });

  return NextResponse.json({ created: result.count, skipped: candidates.length - toCreate.length });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: '削除する枠を選んでください' }, { status: 400 });
  }

  // 予約が入っている枠は消さない
  const result = await prisma.slot.deleteMany({
    where: {
      id: { in: ids as string[] },
      status: 'OPEN',
      bookings: { none: { status: 'CONFIRMED' } },
    },
  });

  return NextResponse.json({ deleted: result.count });
}
