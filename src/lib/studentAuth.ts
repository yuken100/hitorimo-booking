import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { hashLoginToken, newLoginToken } from './loginToken';

// 受講生のログイン状態。管理者の Cookie とは名前も中身も別で、
// データベースにはハッシュだけを保存するので、管理画面から無効化できる
const STUDENT_COOKIE = 'hitorimo_student';
export const STUDENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createStudentSession(studentId: string) {
  const token = newLoginToken();
  await prisma.studentSession.create({
    data: {
      studentId,
      tokenHash: hashLoginToken(token),
      expiresAt: new Date(Date.now() + STUDENT_SESSION_MS),
    },
  });
  return token;
}

export function setStudentCookie(response: NextResponse, token: string) {
  response.cookies.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: STUDENT_SESSION_MS / 1000,
  });
}

export function clearStudentCookie(response: NextResponse) {
  response.cookies.delete(STUDENT_COOKIE);
}

// ログイン中の受講生を返す（未ログイン・期限切れ・無効化された受講生は null）
export async function getStudent(request: NextRequest) {
  const token = request.cookies.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.studentSession.findUnique({
    where: { tokenHash: hashLoginToken(token) },
    include: { student: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.student.active) return null;
  return session.student;
}

export async function deleteStudentSession(request: NextRequest) {
  const token = request.cookies.get(STUDENT_COOKIE)?.value;
  if (!token) return;
  await prisma.studentSession.deleteMany({ where: { tokenHash: hashLoginToken(token) } });
}

export const studentUnauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
