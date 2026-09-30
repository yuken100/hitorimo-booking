'use client';

import { useState } from 'react';

const emptyForm = { name: '', email: '', company: '', message: '', website: '' };
const inputClass = 'w-full px-3 py-2 border-2 border-ink rounded focus:outline-none focus:border-accent';

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentName, setSentName] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('必須項目を入力してください');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('メールアドレスを確認してください');
      return;
    }
    if (!privacyAgreed) {
      setError('プライバシーポリシーへの同意にチェックを入れてください');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company: form.company || null, privacyAgreed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '送信できませんでした');
      setSentName(form.name.trim());
      setForm(emptyForm);
      setPrivacyAgreed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信できませんでした');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <p className="text-4xl font-bold text-ink mb-2">
        <a href="/">
          HITORI<span className="bg-accent">MO</span>
        </a>
      </p>
      <h1 className="text-2xl font-bold text-ink mb-4">お問い合わせ</h1>

      {sentName ? (
        <div className="p-6 border-2 border-ink rounded bg-soft">
          <p className="text-xl font-bold text-ink mb-2">送信しました</p>
          <p className="text-ink">
            {sentName} 様、お問い合わせありがとうございます。内容を確認のうえ、あらためてご連絡します。
          </p>
          <p className="text-muted mt-4 text-sm">
            確認のメールをお送りしました。届かない場合は、迷惑メールのフォルダもご確認ください。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/" className="px-4 py-2 border-2 border-ink rounded font-bold hover:bg-accent">
              トップへ戻る
            </a>
            <a href="/booking" className="px-4 py-2 border-2 border-ink rounded font-bold bg-accent">
              初回相談（無料）を予約する
            </a>
          </div>
        </div>
      ) : (
        <>
          <p className="text-muted mb-8">
            まずは文章で、気軽にご相談ください。内容を確認のうえ、あらためてご連絡します。日時を決めてお話ししたい方は、
            <a href="/booking" className="underline font-bold text-ink">
              初回相談（無料）の予約
            </a>
            もご利用いただけます。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <label className="block text-sm font-bold text-ink">
              お名前 <span className="text-red-600">*</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={100}
                autoComplete="name"
                placeholder="山田太郎"
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <label className="block text-sm font-bold text-ink">
              メールアドレス <span className="text-red-600">*</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
                autoComplete="email"
                placeholder="example@company.com"
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <label className="block text-sm font-bold text-ink">
              会社名 / 肩書（任意）
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                maxLength={200}
                autoComplete="organization"
                placeholder="●●株式会社 代表取締役"
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <label className="block text-sm font-bold text-ink">
              ご相談内容 <span className="text-red-600">*</span>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                maxLength={4000}
                rows={7}
                placeholder="どのようなことでお困りですか？"
                className={`mt-2 ${inputClass}`}
              />
            </label>

            {/* 機械による送信を見分けるための欄。人には見えない */}
            <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
              <label>
                ウェブサイト
                <input name="website" value={form.website} onChange={handleChange} tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 shrink-0"
              />
              <span>
                <a href="/privacy" target="_blank" rel="noopener" className="underline font-bold">
                  プライバシーポリシー
                </a>
                に同意します <span className="text-red-600">*</span>
              </span>
            </label>

            {error && (
              <p role="alert" className="text-red-600 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 bg-accent text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
            >
              {busy ? '送信しています...' : '送信する'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
