import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashLoginToken } from '@/lib/loginToken';
import { createStudentSession, setStudentCookie } from '@/lib/studentAuth';

// リンクを開いただけではログインせず、画面のボタンで POST したときだけ使う
// （メールのリンクを自動で開く仕組みに、使い切られないようにするため）
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) {
    return NextResponse.json({ error: 'リンクが正しくありません' }, { status: 400 });
  }

  const tokenHash = hashLoginToken(token);
  const row = await prisma.studentLoginToken.findUnique({ where: { tokenHash }, include: { student: true } });
  const invalid = () =>
    NextResponse.json(
      { error: 'このリンクは使えません（期限切れ、または使用済みです）。もう一度リンクを受け取ってください。' },
      { status: 401 }
    );
  if (!row || !row.student.active) return invalid();

  const used = await prisma.studentLoginToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (used.count === 0) return invalid();

  const session = await createStudentSession(row.studentId);
  await prisma.student.update({ where: { id: row.studentId }, data: { lastLoginAt: new Date() } });

  const response = NextResponse.json({ ok: true });
  setStudentCookie(response, session);
  return response;
}
