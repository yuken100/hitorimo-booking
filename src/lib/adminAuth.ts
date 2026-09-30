import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'hitorimo_admin';

function sessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac('sha256', password).update('hitorimo-admin-session').digest('hex');
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string) {
  const password = process.env.ADMIN_PASSWORD;
  return !!password && safeEqual(input, password);
}

export function isAdmin(request: NextRequest) {
  const token = sessionToken();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return !!token && !!cookie && safeEqual(cookie, token);
}

export function setAdminCookie(response: NextResponse) {
  const token = sessionToken();
  if (!token) return;
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.delete(ADMIN_COOKIE);
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
