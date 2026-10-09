import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';
import { EMAIL_RE } from '@/lib/client';
import { LOGIN_LINK_TTL_MS, hashLoginToken, newLoginToken } from '@/lib/loginToken';
import { sendStudentLoginLinkEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const MAX_LINKS_PER_WINDOW = 3;

async function list() {
  const [students, totalLessons] = await Promise.all([
    prisma.student.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { progress: true } } },
    }),
    prisma.lesson.count({ where: { published: true } }),
  ]);
  return {
    totalLessons,
    students: students.map((s) => ({
      id: s.id,
      email: s.email,
      name: s.name,
      active: s.active,
      lastLoginAt: s.lastLoginAt,
      createdAt: s.createdAt,
      completed: s._count.progress,
    })),
  };
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  return NextResponse.json(await list());
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const id = typeof body.id === 'string' ? body.id : '';

  if (action === 'create') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) return fail('お名前を入力してください（100文字以内）');
    if (!EMAIL_RE.test(email) || email.length > 254) return fail('メールアドレスを正しく入力してください');
    if (await prisma.student.findUnique({ where: { email } })) {
      return fail('このメールアドレスは、すでに登録されています', 409);
    }
    await prisma.student.create({ data: { email, name } });
    return NextResponse.json(await list());
  }

  const student = id ? await prisma.student.findUnique({ where: { id } }) : null;
  if (!student) return fail('受講生が見つかりません', 404);

  if (action === 'update') {
    const data: { name?: string; active?: boolean } = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name || name.length > 100) return fail('お名前を入力してください（100文字以内）');
      data.name = name;
    }
    if (typeof body.active === 'boolean') data.active = body.active;
    await prisma.student.update({ where: { id }, data });
    // 無効にしたら、いまログインしている状態もすぐに終わらせる
    if (data.active === false) await prisma.studentSession.deleteMany({ where: { studentId: id } });
    return NextResponse.json(await list());
  }

  if (action === 'delete') {
    await prisma.student.delete({ where: { id } });
    return NextResponse.json(await list());
  }

  if (action === 'send-link') {
    if (!student.active) return fail('無効にしている受講生には送れません');
    const recent = await prisma.studentLoginToken.count({
      where: { studentId: id, createdAt: { gte: new Date(Date.now() - LOGIN_LINK_TTL_MS) } },
    });
    if (recent >= MAX_LINKS_PER_WINDOW) {
      return fail('短い時間に何度も送信されています。15分ほど待ってから、もう一度お試しください。', 429);
    }
    const token = newLoginToken();
    await prisma.studentLoginToken.create({
      data: { studentId: id, tokenHash: hashLoginToken(token), expiresAt: new Date(Date.now() + LOGIN_LINK_TTL_MS) },
    });
    const url = `${request.nextUrl.origin}/student/login?token=${encodeURIComponent(token)}`;
    try {
      await sendStudentLoginLinkEmail(url, student.email, student.name);
    } catch (error) {
      console.error('Student login link email failed:', error);
      return fail('メールを送れませんでした。時間をおいてお試しください。', 500);
    }
    return NextResponse.json(await list());
  }

  return fail('不明な操作です');
}
