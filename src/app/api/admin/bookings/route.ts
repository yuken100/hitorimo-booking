import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';

// 予約を取り消し、枠を空きに戻す（お客様へのメールは送らない）
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ error: '取り消す予約が見つかりません' }, { status: 400 });
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking || booking.status !== 'CONFIRMED') return false;
    await tx.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
    await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } });
    return true;
  });

  if (!cancelled) {
    return NextResponse.json({ error: 'この予約は、すでに取り消されています' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
