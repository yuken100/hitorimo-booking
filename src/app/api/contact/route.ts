import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EMAIL_RE, clientHashOf } from '@/lib/client';
import { sendInquiryEmails } from '@/lib/email';

const MAX_PER_CLIENT_PER_HOUR = 3;
const MAX_PER_EMAIL_PER_DAY = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, company, message, privacyAgreed, website } = body;

    // 人には見えない入力欄が埋まっていたら、機械による送信とみなし、何もせずに成功を装う
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    if (
      typeof name !== 'string' || !name.trim() || name.length > 100 ||
      typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254 ||
      typeof message !== 'string' || !message.trim() || message.length > 4000 ||
      (company != null && (typeof company !== 'string' || company.length > 200))
    ) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    if (privacyAgreed !== true) {
      return NextResponse.json({ error: 'プライバシーポリシーへの同意が必要です' }, { status: 400 });
    }

    const normalizedEmail = email.trim();
    const clientHash = clientHashOf(request);
    const [fromClient, fromEmail] = await Promise.all([
      prisma.inquiry.count({ where: { clientHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
      prisma.inquiry.count({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    if (fromClient >= MAX_PER_CLIENT_PER_HOUR || fromEmail >= MAX_PER_EMAIL_PER_DAY) {
      return NextResponse.json(
        { error: '短い時間に多くのお問い合わせがありました。お手数ですが、しばらく時間をおいてからお試しください。' },
        { status: 429 }
      );
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        company: company?.trim() || null,
        message: message.trim(),
        privacyAgreedAt: new Date(),
        clientHash,
      },
    });

    // メール送信に失敗しても、お問い合わせは保存済みなので管理画面から確認できる
    await sendInquiryEmails(inquiry, process.env.ADMIN_EMAIL).catch((err) =>
      console.error('Inquiry email failed:', err)
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error saving inquiry:', error);
    return NextResponse.json(
      { error: '送信できませんでした。時間をおいて、もう一度お試しください。' },
      { status: 500 }
    );
  }
}
