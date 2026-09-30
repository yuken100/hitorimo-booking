import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, setAdminCookie } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';

  if (!checkPassword(password)) {
    // 総当たりを遅らせる
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response);
  return response;
}
