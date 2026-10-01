'use client';

import { useState } from 'react';
import { MEETING_URL } from '@/lib/config';

export interface SentEmail {
  id: string;
  bookingId: string | null;
  inquiryId: string | null;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: string;
}

interface Target {
  type: 'booking' | 'inquiry';
  id: string;
  name: string;
  email: string;
  when?: string;
}

interface Template {
  label: string;
  for: Target['type'][];
  subject: string;
  body: (t: Target) => string;
  note?: string;
}

const SIGNATURE = `

――――――――――
HITORIMO 代表　小宮 直樹
info@goodrelationship.net
https://www.goodrelationship.net`;

const TEMPLATES: Template[] = [
  {
    label: '予約のお礼と、当日のご案内',
    for: ['booking'],
    subject: '【HITORIMO】初回相談のご予約ありがとうございます',
    body: (t) => `${t.name} 様

HITORIMO の小宮です。
このたびは、初回相談のご予約をいただき、ありがとうございます。

■ 日時：${t.when ?? ''}
■ 場所：Zoom（オンライン）
${MEETING_URL}

当日は、いま感じていらっしゃることを、そのままお聞かせください。事前に整理していただく必要はありません。
特にお話ししたいテーマがあれば、このメールにご返信いただけると、より深くお話しできます。

お会いできることを楽しみにしています。${SIGNATURE}`,
  },
  {
    label: '日程変更のお願い',
    for: ['booking'],
    subject: '【HITORIMO】ご予約日時の変更のお願い',
    note: 'このひな形を送る前に、「この予約を取り消す」を押してください。同じメールアドレスでは、先の予約を1件までしか入れられないためです。',
    body: (t) => `${t.name} 様

HITORIMO の小宮です。
${t.when ?? ''} にご予約いただいている初回相談について、誠に申し訳ないのですが、こちらの都合により、日時の変更をお願いできないでしょうか。

いまのご予約は、こちらで取り消しました。お手数ですが、次のページから、ご都合のよい日時をあらためてお選びください。
https://www.goodrelationship.net/booking

ご迷惑をおかけし、申し訳ありません。どうぞよろしくお願いいたします。${SIGNATURE}`,
  },
  {
    label: '相談後のお礼',
    for: ['booking'],
    subject: '【HITORIMO】本日はありがとうございました',
    body: (t) => `${t.name} 様

HITORIMO の小宮です。
本日は、お時間をいただき、ありがとうございました。

（ここに、相談でお話しした内容や、次の一歩を書きます）

これからのことで気になる点があれば、いつでもこのメールにご返信ください。
引き続き、どうぞよろしくお願いいたします。${SIGNATURE}`,
  },
  {
    label: 'お問い合わせへの返信',
    for: ['inquiry'],
    subject: '【HITORIMO】お問い合わせありがとうございます',
    body: (t) => `${t.name} 様

HITORIMO の小宮です。
お問い合わせいただき、ありがとうございます。

（ここに、お問い合わせへのお返事を書きます）

直接お話ししたほうが早い場合は、初回相談（無料・Zoom）もご利用ください。
https://www.goodrelationship.net/booking

どうぞよろしくお願いいたします。${SIGNATURE}`,
  },
  {
    label: '白紙から書く',
    for: ['booking', 'inquiry'],
    subject: '【HITORIMO】',
    body: (t) => `${t.name} 様

HITORIMO の小宮です。

${SIGNATURE}`,
  },
];

const sentAt = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function EmailComposer({
  target,
  history,
  onSent,
}: {
  target: Target;
  history: SentEmail[];
  onSent: (email: SentEmail) => void;
}) {
  const templates = TEMPLATES.filter((t) => t.for.includes(target.type));
  const [open, setOpen] = useState(false);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const applyTemplate = (index: number) => {
    const t = templates[index];
    setTemplateIndex(index);
    setSubject(t.subject);
    setText(t.body(target));
  };

  const handleOpen = () => {
    if (!open && !text) applyTemplate(0);
    setOpen(!open);
    setStatus(null);
  };

  const handleSend = async () => {
    if (!subject.trim() || !text.trim()) {
      setStatus({ ok: false, text: '件名と本文を入力してください' });
      return;
    }
    if (!window.confirm(`${target.name} 様（${target.email}）に、このメールを送ります。よろしいですか？`)) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch('/api/admin/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [target.type === 'booking' ? 'bookingId' : 'inquiryId']: target.id,
        subject,
        text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setStatus({ ok: false, text: data.error || '送信できませんでした' });
      return;
    }
    onSent(data);
    setStatus({ ok: true, text: '送信しました。控えが Gmail にも届きます。' });
    setOpen(false);
    setText('');
  };

  const note = templates[templateIndex]?.note;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpen}
          aria-expanded={open}
          className="px-3 py-1 text-sm font-bold rounded border-2 border-ink bg-accent text-ink"
        >
          {open ? 'メールを閉じる' : 'メールを書く'}
        </button>
      </div>

      {status && (
        <p role="status" className={`mt-2 text-sm ${status.ok ? 'text-green-800' : 'text-red-600'}`}>
          {status.text}
        </p>
      )}

      {open && (
        <div className="mt-3 p-4 border-2 border-ink rounded bg-paper space-y-3">
          <p className="text-sm text-muted">
            宛先：{target.name} 様（{target.email}）／ 差出人：HITORIMO 小宮直樹 &lt;info@goodrelationship.net&gt;
          </p>
          <label className="block text-sm font-bold text-ink">
            ひな形
            <select
              value={templateIndex}
              onChange={(e) => applyTemplate(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border-2 border-ink rounded bg-paper"
            >
              {templates.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {note && <p className="text-sm p-2 bg-soft border-2 border-ink rounded">{note}</p>}
          <label className="block text-sm font-bold text-ink">
            件名
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className="mt-1 w-full px-3 py-2 border-2 border-ink rounded"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            本文
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              maxLength={10000}
              className="mt-1 w-full px-3 py-2 border-2 border-ink rounded font-normal"
            />
          </label>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy}
            className="w-full px-4 py-3 bg-accent text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
          >
            {busy ? '送信しています...' : '送信する'}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm font-bold text-ink cursor-pointer">送信履歴（{history.length}件）</summary>
          <ul className="mt-2 space-y-2">
            {history.map((email) => (
              <li key={email.id} className="text-sm border-2 border-ink rounded">
                <details>
                  <summary className="p-2 cursor-pointer">
                    {sentAt(email.createdAt)}　{email.subject}
                  </summary>
                  <p className="px-3 pb-3 whitespace-pre-wrap text-muted">{email.body}</p>
                </details>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
