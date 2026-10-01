'use client';

import { useEffect, useState } from 'react';
import { FAQ_CATEGORIES, RECORD_KINDS } from '@/lib/siteContent';

interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
}

interface RecordRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  author: string | null;
  order: number;
  published: boolean;
}

interface History {
  id: string;
  entity: 'faq' | 'record';
  summary: string;
  createdAt: string;
}

interface Content {
  faq: Faq[];
  records: RecordRow[];
  history: History[];
}

type Tab = 'faq' | 'record' | 'history';

const inputClass = 'mt-1 w-full px-3 py-2 border-2 border-ink rounded bg-paper';
const btn = 'px-3 py-1 text-sm font-bold rounded border-2 border-ink disabled:opacity-40';
const when = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const emptyFaq = (category: string) => ({ category, question: '', answer: '', published: true });
const emptyRecord = () => ({ kind: 'voice', title: '', body: '', author: '', published: true });

export default function ContentAdminPage() {
  const [content, setContent] = useState<Content | null>(null);
  const [authed, setAuthed] = useState(true);
  const [tab, setTab] = useState<Tab>('faq');
  const [category, setCategory] = useState<string>(FAQ_CATEGORIES[0].key);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/content', { cache: 'no-store' }).then(async (res) => {
      if (res.status === 401) return setAuthed(false);
      setContent(await res.json());
    });
  }, []);

  const send = async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error || '保存できませんでした' });
      return false;
    }
    setContent(data);
    setMessage({ ok: true, text: okText });
    return true;
  };

  const startEdit = (id: string, values: Record<string, unknown>) => {
    setEditingId(id);
    setForm(values);
    setMessage(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };
  const save = async (entity: 'faq' | 'record') => {
    const isNew = editingId === 'new';
    const ok = await send(
      isNew ? { action: 'create', entity, data: form } : { action: 'update', entity, id: editingId, data: form },
      isNew ? '追加しました。十数秒でホームページに反映されます。' : '保存しました。十数秒でホームページに反映されます。'
    );
    if (ok) cancelEdit();
  };
  const remove = (entity: 'faq' | 'record', id: string, label: string) => {
    if (!window.confirm(`「${label}」を削除します。よろしいですか？（「変更の履歴」から元に戻せます）`)) return;
    send({ action: 'delete', entity, id }, '削除しました。');
  };
  const togglePublished = (entity: 'faq' | 'record', item: Faq | RecordRow) =>
    send(
      { action: 'update', entity, id: item.id, data: { ...item, published: !item.published } },
      item.published ? '非公開にしました。' : '公開しました。'
    );
  const move = (entity: 'faq' | 'record', id: string, direction: 'up' | 'down') =>
    send({ action: 'move', entity, id, direction }, '並び順を変えました。');
  const restore = (h: History) => {
    if (!window.confirm(`「${h.summary}」の状態に戻します。よろしいですか？`)) return;
    send({ action: 'restore', historyId: h.id }, '元に戻しました。');
  };

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <p className="text-ink mb-4">ログインが必要です。</p>
        <a href="/admin" className="underline font-bold">
          管理画面のログインへ
        </a>
      </div>
    );
  }
  if (!content) return <p className="p-8 text-muted">読み込み中...</p>;

  const faqs = content.faq.filter((f) => f.category === category);

  const faqForm = (
    <div className="p-4 border-2 border-ink rounded bg-soft space-y-3">
      <label className="block text-sm font-bold text-ink">
        対象
        <select value={String(form.category)} onChange={(e) => setField('category', e.target.value)} className={inputClass}>
          {FAQ_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-ink">
        質問
        <input value={String(form.question ?? '')} onChange={(e) => setField('question', e.target.value)} maxLength={300} className={inputClass} />
      </label>
      <label className="block text-sm font-bold text-ink">
        答え
        <textarea value={String(form.answer ?? '')} onChange={(e) => setField('answer', e.target.value)} maxLength={4000} rows={5} className={inputClass} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.published !== false} onChange={(e) => setField('published', e.target.checked)} className="w-5 h-5" />
        ホームページに公開する
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => save('faq')} disabled={busy} className={`${btn} bg-accent`}>
          保存する
        </button>
        <button type="button" onClick={cancelEdit} disabled={busy} className={btn}>
          キャンセル
        </button>
      </div>
    </div>
  );

  const recordForm = (
    <div className="p-4 border-2 border-ink rounded bg-soft space-y-3">
      <p className="text-sm p-2 border-2 border-ink rounded bg-paper">
        お客様の声を載せるときは、必ずご本人から掲載の許可をもらってください。お名前は「A社 代表」のように伏せても大丈夫です。
      </p>
      <label className="block text-sm font-bold text-ink">
        種類
        <select value={String(form.kind)} onChange={(e) => setField('kind', e.target.value)} className={inputClass}>
          {RECORD_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-ink">
        見出し
        <input value={String(form.title ?? '')} onChange={(e) => setField('title', e.target.value)} maxLength={200} placeholder="例：部下が自分から相談に来るようになった" className={inputClass} />
      </label>
      <label className="block text-sm font-bold text-ink">
        本文
        <textarea value={String(form.body ?? '')} onChange={(e) => setField('body', e.target.value)} maxLength={4000} rows={6} className={inputClass} />
      </label>
      <label className="block text-sm font-bold text-ink">
        どなたの声か（任意）
        <input value={String(form.author ?? '')} onChange={(e) => setField('author', e.target.value)} maxLength={100} placeholder="例：製造業 A社 代表" className={inputClass} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.published !== false} onChange={(e) => setField('published', e.target.checked)} className="w-5 h-5" />
        ホームページに公開する
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => save('record')} disabled={busy} className={`${btn} bg-accent`}>
          保存する
        </button>
        <button type="button" onClick={cancelEdit} disabled={busy} className={btn}>
          キャンセル
        </button>
      </div>
    </div>
  );

  const itemButtons = (entity: 'faq' | 'record', item: Faq | RecordRow, index: number, total: number, label: string) => (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => move(entity, item.id, 'up')} disabled={busy || index === 0} className={btn} aria-label="上へ">
        ↑
      </button>
      <button type="button" onClick={() => move(entity, item.id, 'down')} disabled={busy || index === total - 1} className={btn} aria-label="下へ">
        ↓
      </button>
      <button type="button" onClick={() => startEdit(item.id, { ...item })} disabled={busy} className={`${btn} bg-accent`}>
        編集
      </button>
      <button type="button" onClick={() => togglePublished(entity, item)} disabled={busy} className={btn}>
        {item.published ? '非公開にする' : '公開する'}
      </button>
      <button type="button" onClick={() => remove(entity, item.id, label)} disabled={busy} className={`${btn} border-red-600 text-red-700`}>
        削除
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-ink">サイトの文章を編集</h1>
        <a href="/admin" className="text-sm underline text-muted">
          管理画面へ戻る
        </a>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        {(
          [
            ['faq', 'よくある質問'],
            ['record', '実績・お客様の声'],
            ['history', '変更の履歴'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              cancelEdit();
            }}
            className={`px-4 py-2 font-bold rounded border-2 border-ink ${tab === key ? 'bg-accent' : 'bg-paper'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p role="status" className={`mb-4 p-3 rounded border-2 ${message.ok ? 'border-green-700 bg-green-50 text-green-800' : 'border-red-600 bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}

      {tab === 'faq' && (
        <section>
          <div className="flex flex-wrap gap-2 mb-4">
            {FAQ_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setCategory(c.key);
                  cancelEdit();
                }}
                aria-pressed={category === c.key}
                className={`px-3 py-1 text-sm font-bold rounded-full border-2 border-ink ${category === c.key ? 'bg-ink text-paper' : 'bg-paper'}`}
              >
                {c.label}（{content.faq.filter((f) => f.category === c.key).length}）
              </button>
            ))}
          </div>

          {editingId === 'new' ? (
            <div className="mb-4">{faqForm}</div>
          ) : (
            <button type="button" onClick={() => startEdit('new', emptyFaq(category))} disabled={busy} className={`${btn} bg-accent mb-4`}>
              ＋ 質問を追加
            </button>
          )}

          <ul className="space-y-3">
            {faqs.map((f, i) => (
              <li key={f.id} className={`p-4 border-2 rounded ${f.published ? 'border-ink' : 'border-muted opacity-70'}`}>
                {editingId === f.id ? (
                  faqForm
                ) : (
                  <>
                    <p className="font-bold text-ink">
                      {!f.published && <span className="mr-2 px-2 py-0.5 text-xs rounded bg-soft text-muted">非公開</span>}
                      Q. {f.question}
                    </p>
                    <p className="mt-2 text-sm text-ink whitespace-pre-wrap">{f.answer}</p>
                    {itemButtons('faq', f, i, faqs.length, f.question)}
                  </>
                )}
              </li>
            ))}
          </ul>
          {faqs.length === 0 && <p className="text-muted">この対象の質問はありません。ホームページでは、このタブは表示されません。</p>}
        </section>
      )}

      {tab === 'record' && (
        <section>
          <p className="text-sm text-muted mb-4">
            1件でも公開すると、ホームページに「実績」の欄が現れます。すべて非公開か0件のときは、欄ごと表示されません。
          </p>
          {editingId === 'new' ? (
            <div className="mb-4">{recordForm}</div>
          ) : (
            <button type="button" onClick={() => startEdit('new', emptyRecord())} disabled={busy} className={`${btn} bg-accent mb-4`}>
              ＋ 実績・お客様の声を追加
            </button>
          )}
          <ul className="space-y-3">
            {content.records.map((r, i) => (
              <li key={r.id} className={`p-4 border-2 rounded ${r.published ? 'border-ink' : 'border-muted opacity-70'}`}>
                {editingId === r.id ? (
                  recordForm
                ) : (
                  <>
                    <p className="text-xs font-bold text-muted">
                      {RECORD_KINDS.find((k) => k.key === r.kind)?.label}
                      {!r.published && '（非公開）'}
                    </p>
                    <p className="font-bold text-ink">{r.title}</p>
                    <p className="mt-2 text-sm text-ink whitespace-pre-wrap">{r.body}</p>
                    {r.author && <p className="mt-1 text-sm text-muted">— {r.author}</p>}
                    {itemButtons('record', r, i, content.records.length, r.title)}
                  </>
                )}
              </li>
            ))}
          </ul>
          {content.records.length === 0 && <p className="text-muted">まだありません。</p>}
        </section>
      )}

      {tab === 'history' && (
        <section>
          <p className="text-sm text-muted mb-4">変更・削除の前の状態が、直近50件まで残っています。「この版に戻す」で、その時点の内容に戻せます。</p>
          {content.history.length === 0 ? (
            <p className="text-muted">まだ変更はありません。</p>
          ) : (
            <ul className="space-y-2">
              {content.history.map((h) => (
                <li key={h.id} className="p-3 border-2 border-ink rounded flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-ink">
                    {when(h.createdAt)}　［{h.entity === 'faq' ? 'よくある質問' : '実績'}］{h.summary}
                  </span>
                  <button type="button" onClick={() => restore(h)} disabled={busy} className={btn}>
                    この版に戻す
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
