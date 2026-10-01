import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdmin, unauthorized } from '@/lib/adminAuth';
import { Entity, parseFaq, parseRecord } from '@/lib/siteContent';

export const dynamic = 'force-dynamic';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function load() {
  const [faq, records, history] = await Promise.all([
    prisma.faqItem.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
    prisma.recordItem.findMany({ orderBy: { order: 'asc' } }),
    prisma.contentHistory.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  return { faq, records, history };
}

const findItem = (entity: Entity, id: string) =>
  entity === 'faq' ? prisma.faqItem.findUnique({ where: { id } }) : prisma.recordItem.findUnique({ where: { id } });

const labelOf = (entity: Entity, item: { question?: string; title?: string }) =>
  (entity === 'faq' ? item.question : item.title)?.slice(0, 40) ?? '';

// 変更・削除の前の状態を残しておく
async function snapshot(entity: Entity, item: Record<string, unknown>, action: string, summary: string) {
  await prisma.contentHistory.create({
    data: { entity, entityId: String(item.id), action, summary, data: item as Prisma.InputJsonValue },
  });
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  return NextResponse.json(await load());
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { action, entity, id, data, direction, historyId } = body as Record<string, unknown>;

  if (action === 'restore') {
    if (typeof historyId !== 'string') return bad('元に戻す版が見つかりません');
    const h = await prisma.contentHistory.findUnique({ where: { id: historyId } });
    if (!h) return bad('元に戻す版が見つかりません', 404);
    const snap = h.data as Record<string, unknown>;
    const ent = h.entity as Entity;
    const current = await findItem(ent, h.entityId);
    if (current) await snapshot(ent, current, 'restore', `「${labelOf(ent, current)}」を以前の版に戻す前`);
    const fields =
      ent === 'faq'
        ? { category: snap.category as string, question: snap.question as string, answer: snap.answer as string, order: Number(snap.order), published: Boolean(snap.published) }
        : { kind: snap.kind as string, title: snap.title as string, body: snap.body as string, author: (snap.author as string) ?? null, order: Number(snap.order), published: Boolean(snap.published) };
    if (ent === 'faq') {
      await prisma.faqItem.upsert({ where: { id: h.entityId }, update: fields as Prisma.FaqItemUpdateInput, create: { id: h.entityId, ...(fields as Prisma.FaqItemCreateInput) } });
    } else {
      await prisma.recordItem.upsert({ where: { id: h.entityId }, update: fields as Prisma.RecordItemUpdateInput, create: { id: h.entityId, ...(fields as Prisma.RecordItemCreateInput) } });
    }
    return NextResponse.json(await load());
  }

  if (entity !== 'faq' && entity !== 'record') return bad('入力内容を確認してください');
  const ent = entity as Entity;
  const input = (data ?? {}) as Record<string, unknown>;

  if (action === 'create') {
    const parsed = ent === 'faq' ? parseFaq(input) : parseRecord(input);
    if (!parsed) return bad('必要な項目を入力してください');
    if (ent === 'faq') {
      const p = parsed as NonNullable<ReturnType<typeof parseFaq>>;
      const last = await prisma.faqItem.findFirst({ where: { category: p.category }, orderBy: { order: 'desc' } });
      await prisma.faqItem.create({ data: { ...p, order: (last?.order ?? -1) + 1 } });
    } else {
      const p = parsed as NonNullable<ReturnType<typeof parseRecord>>;
      const last = await prisma.recordItem.findFirst({ orderBy: { order: 'desc' } });
      await prisma.recordItem.create({ data: { ...p, order: (last?.order ?? -1) + 1 } });
    }
    return NextResponse.json(await load(), { status: 201 });
  }

  if (typeof id !== 'string') return bad('項目が見つかりません');
  const current = await findItem(ent, id);
  if (!current) return bad('項目が見つかりません', 404);

  if (action === 'update') {
    const parsed = ent === 'faq' ? parseFaq(input) : parseRecord(input);
    if (!parsed) return bad('必要な項目を入力してください');
    await snapshot(ent, current, 'update', `「${labelOf(ent, current)}」を変更する前`);
    if (ent === 'faq') await prisma.faqItem.update({ where: { id }, data: parsed as Prisma.FaqItemUpdateInput });
    else await prisma.recordItem.update({ where: { id }, data: parsed as Prisma.RecordItemUpdateInput });
    return NextResponse.json(await load());
  }

  if (action === 'delete') {
    await snapshot(ent, current, 'delete', `「${labelOf(ent, current)}」を削除する前`);
    if (ent === 'faq') await prisma.faqItem.delete({ where: { id } });
    else await prisma.recordItem.delete({ where: { id } });
    return NextResponse.json(await load());
  }

  if (action === 'move') {
    if (direction !== 'up' && direction !== 'down') return bad('入力内容を確認してください');
    const siblings =
      ent === 'faq'
        ? await prisma.faqItem.findMany({ where: { category: (current as { category: string }).category }, orderBy: { order: 'asc' } })
        : await prisma.recordItem.findMany({ orderBy: { order: 'asc' } });
    const i = siblings.findIndex((s) => s.id === id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return NextResponse.json(await load());
    // 並び順を振り直してから入れ替える（同じ順番の値が重なっていても確実に動くように）
    const ids = siblings.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await prisma.$transaction(
      ids.map((sid, order) =>
        ent === 'faq'
          ? prisma.faqItem.update({ where: { id: sid }, data: { order } })
          : prisma.recordItem.update({ where: { id: sid }, data: { order } })
      )
    );
    return NextResponse.json(await load());
  }

  return bad('入力内容を確認してください');
}
