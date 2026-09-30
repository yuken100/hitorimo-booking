import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LOGIN_LINK_TTL_MS, hashLoginToken, newLoginToken } from '@/lib/loginToken';
import { sendAdminLoginLinkEmail } from '@/lib/email';

const MAX_LINKS_PER_WINDOW = 3;

// 誰が押しても、リンクは管理者のメールアドレスにしか届かない
export async function POST(request: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const done = NextResponse.json({ ok: true });
  if (!adminEmail) return done;

  const recent = await prisma.adminLoginToken.count({
    where: { createdAt: { gte: new Date(Date.now() - LOGIN_LINK_TTL_MS) } },
  });
  if (recent >= MAX_LINKS_PER_WINDOW) {
    return NextResponse.json(
      { error: '短い時間に何度も送信されました。15分ほど待ってから、もう一度お試しください。' },
      { status: 429 }
    );
  }

  const token = newLoginToken();
  await prisma.adminLoginToken.create({
    data: { tokenHash: hashLoginToken(token), expiresAt: new Date(Date.now() + LOGIN_LINK_TTL_MS) },
  });

  const url = `${request.nextUrl.origin}/admin/magic?token=${encodeURIComponent(token)}`;
  try {
    await sendAdminLoginLinkEmail(url, adminEmail);
  } catch (error) {
    console.error('Login link email failed:', error);
    return NextResponse.json({ error: 'メールを送れませんでした。時間をおいてお試しください。' }, { status: 500 });
  }
  return done;
}
