export const FAQ_CATEGORIES = [
  { key: 'exec', label: '経営者の方' },
  { key: 'biz', label: '起業したい方' },
  { key: 'parent', label: '親の方' },
  { key: 'edu', label: '教育関係者の方' },
  { key: 'about', label: 'HITORIMOについて' },
] as const;

export const RECORD_KINDS = [
  { key: 'voice', label: '導入企業の声' },
  { key: 'change', label: '部下の変化' },
  { key: 'activity', label: '活動の記録' },
] as const;

export type Entity = 'faq' | 'record';

export const isFaqCategory = (v: unknown): v is string => FAQ_CATEGORIES.some((c) => c.key === v);
export const isRecordKind = (v: unknown): v is string => RECORD_KINDS.some((k) => k.key === v);

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

// 管理画面から届いた入力を、保存できる形に整える。不正なら null
export function parseFaq(data: Record<string, unknown>) {
  const question = text(data.question, 300);
  const answer = text(data.answer, 4000);
  if (!isFaqCategory(data.category) || !question || !answer) return null;
  return { category: data.category, question, answer, published: data.published !== false };
}

export function parseRecord(data: Record<string, unknown>) {
  const title = text(data.title, 200);
  const body = text(data.body, 4000);
  const author = typeof data.author === 'string' && data.author.length <= 100 ? data.author.trim() || null : null;
  if (!isRecordKind(data.kind) || !title || !body) return null;
  return { kind: data.kind, title, body, author, published: data.published !== false };
}
