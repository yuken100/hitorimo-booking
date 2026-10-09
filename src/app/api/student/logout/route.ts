import { NextRequest, NextResponse } from 'next/server';
import { clearStudentCookie, deleteStudentSession } from '@/lib/studentAuth';

export async function POST(request: NextRequest) {
  await deleteStudentSession(request);
  const response = NextResponse.json({ ok: true });
  clearStudentCookie(response);
  return response;
}
