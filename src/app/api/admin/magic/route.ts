import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashLoginToken } from '@/lib/loginToken';
import { setAdminCookie } from '@/lib/adminAuth';

// リンクを開いただけではログインせず、画面のボタンで POST したときだけ使う。
// メールのリンクを自動で開く仕組み（ウイルス対策など）に、使い切られないようにするため
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) {
    return NextResponse.json({ error: 'リンクが正しくありません' }, { status: 400 });
  }

  const used = await prisma.adminLoginToken.updateMany({
    where: { tokenHash: hashLoginToken(token), usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (used.count === 0) {
    return NextResponse.json(
      { error: 'このリンクは使えません（期限切れ、または使用済みです）。もう一度リンクを受け取ってください。' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response);
  return response;
}
