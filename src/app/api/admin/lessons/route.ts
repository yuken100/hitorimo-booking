import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const list = () =>
  prisma.lesson.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { progress: true } } },
  });

async function respond() {
  const lessons = await list();
  return NextResponse.json({
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      body: l.body,
      order: l.order,
      published: l.published,
      completedBy: l._count.progress,
    })),
  });
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function parseLesson(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  const title = typeof d.title === 'string' ? d.title.trim() : '';
  const body = typeof d.body === 'string' ? d.body.trim() : '';
  if (!title || title.length > 200) return { error: 'タイトルを入力してください（200文字以内）' };
  if (!body || body.length > 20000) return { error: '本文を入力してください（20000文字以内）' };
  return { value: { title, body, published: d.published !== false } };
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  return respond();
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const id = typeof body.id === 'string' ? body.id : '';

  if (action === 'create') {
    const parsed = parseLesson(body.data);
    if (!parsed.value) return fail(parsed.error!);
    const last = await prisma.lesson.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    await prisma.lesson.create({ data: { ...parsed.value, order: (last?.order ?? -1) + 1 } });
    return respond();
  }

  const lesson = id ? await prisma.lesson.findUnique({ where: { id } }) : null;
  if (!lesson) return fail('レッスンが見つかりません', 404);

  if (action === 'update') {
    const parsed = parseLesson(body.data);
    if (!parsed.value) return fail(parsed.error!);
    await prisma.lesson.update({ where: { id }, data: parsed.value });
    return respond();
  }

  if (action === 'delete') {
    await prisma.lesson.delete({ where: { id } });
    return respond();
  }

  if (action === 'move') {
    const direction = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : 0;
    if (!direction) return fail('不明な操作です');
    const all = await list();
    const index = all.findIndex((l) => l.id === id);
    const target = index + direction;
    if (target < 0 || target >= all.length) return respond();
    const ids = all.map((l) => l.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await prisma.$transaction(ids.map((lessonId, order) => prisma.lesson.update({ where: { id: lessonId }, data: { order } })));
    return respond();
  }

  return fail('不明な操作です');
}
