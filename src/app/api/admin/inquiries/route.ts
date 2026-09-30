import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const inquiries = await prisma.inquiry.findMany({
    select: { id: true, name: true, email: true, company: true, message: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(inquiries);
}

// 対応済み／未対応の切り替え
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { id, status } = body;
  if (typeof id !== 'string' || !['NEW', 'DONE'].includes(status)) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
  }

  const result = await prisma.inquiry.updateMany({ where: { id }, data: { status } });
  if (result.count === 0) {
    return NextResponse.json({ error: 'お問い合わせが見つかりません' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
