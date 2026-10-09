import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStudent, studentUnauthorized } from '@/lib/studentAuth';

export const dynamic = 'force-dynamic';

// ログイン中の受講生にだけ、公開中のレッスンを順番どおりに返す
export async function GET(request: NextRequest) {
  const student = await getStudent(request);
  if (!student) return studentUnauthorized();

  const [lessons, done] = await Promise.all([
    prisma.lesson.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, body: true },
    }),
    prisma.lessonProgress.findMany({ where: { studentId: student.id }, select: { lessonId: true } }),
  ]);
  const completed = new Set(done.map((d) => d.lessonId));

  const response = NextResponse.json({
    student: { name: student.name },
    lessons: lessons.map((l) => ({ ...l, completed: completed.has(l.id) })),
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
