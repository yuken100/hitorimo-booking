import { createHmac } from 'crypto';
import type { NextRequest } from 'next/server';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 通信元IPは、そのままでは保存しない（不正対策の回数制限にだけ使う）
export function clientHashOf(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.ip || 'unknown';
  return createHmac('sha256', process.env.CRON_SECRET || 'hitorimo').update(ip).digest('hex');
}
