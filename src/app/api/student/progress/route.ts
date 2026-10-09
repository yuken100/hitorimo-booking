import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStudent, studentUnauthorized } from '@/lib/studentAuth';

// レッスンの「完了にする」「完了を取り消す」
export async function POST(request: NextRequest) {
  const student = await getStudent(request);
  if (!student) return studentUnauthorized();

  const body = await request.json().catch(() => ({}));
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId : '';
  const completed = body.completed === true;

  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, published: true }, select: { id: true } });
  if (!lesson) {
    return NextResponse.json({ error: 'レッスンが見つかりません' }, { status: 404 });
  }

  if (completed) {
    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      create: { studentId: student.id, lessonId },
      update: {},
    });
  } else {
    await prisma.lessonProgress.deleteMany({ where: { studentId: student.id, lessonId } });
  }
  return NextResponse.json({ ok: true });
}
