import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EMAIL_RE } from '@/lib/client';
import { LOGIN_LINK_TTL_MS, hashLoginToken, newLoginToken } from '@/lib/loginToken';
import { sendStudentLoginLinkEmail } from '@/lib/email';

const MAX_LINKS_PER_WINDOW = 3;

// 登録されているメールアドレスにだけリンクを送る。
// 登録の有無が外から分からないよう、どの場合も同じ返事をする
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 });
  }

  const done = NextResponse.json({ ok: true });

  const student = await prisma.student.findUnique({ where: { email } });
  if (!student || !student.active) return done;

  const recent = await prisma.studentLoginToken.count({
    where: { studentId: student.id, createdAt: { gte: new Date(Date.now() - LOGIN_LINK_TTL_MS) } },
  });
  if (recent >= MAX_LINKS_PER_WINDOW) return done;

  const token = newLoginToken();
  await prisma.studentLoginToken.create({
    data: {
      studentId: student.id,
      tokenHash: hashLoginToken(token),
      expiresAt: new Date(Date.now() + LOGIN_LINK_TTL_MS),
    },
  });

  const url = `${request.nextUrl.origin}/student/login?token=${encodeURIComponent(token)}`;
  try {
    await sendStudentLoginLinkEmail(url, student.email, student.name);
  } catch (error) {
    console.error('Student login link email failed:', error);
  }
  return done;
}
