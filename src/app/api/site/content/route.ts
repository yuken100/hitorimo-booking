import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ホームページが読み込む、公開中の「よくある質問」と「実績・お客様の声」
export async function GET() {
  const [faq, records] = await Promise.all([
    prisma.faqItem.findMany({
      where: { published: true },
      select: { category: true, question: true, answer: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    }),
    prisma.recordItem.findMany({
      where: { published: true },
      select: { kind: true, title: true, body: true, author: true },
      orderBy: { order: 'asc' },
    }),
  ]);

  return NextResponse.json(
    { faq, records },
    // 保存してから、長くても十数秒でホームページに反映される
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60' } }
  );
}
