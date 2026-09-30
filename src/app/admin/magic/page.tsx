'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function MagicLogin() {
  const token = useSearchParams().get('token') ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = '/admin';
      return;
    }
    setBusy(false);
    setError(data.error || 'ログインできませんでした');
  };

  return (
    <div className="space-y-4">
      <p className="text-ink">下のボタンを押すと、管理画面にログインします。</p>
      <button
        type="button"
        onClick={handleLogin}
        disabled={busy || !token}
        className="w-full px-4 py-3 bg-accent text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
      >
        {busy ? 'ログインしています...' : '管理画面にログインする'}
      </button>
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}{' '}
          <a href="/admin" className="underline font-bold">
            ログイン画面へ
          </a>
        </p>
      )}
    </div>
  );
}

export default function AdminMagicPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-ink mb-6">管理画面へのログイン</h1>
      <Suspense fallback={<p className="text-muted">読み込み中...</p>}>
        <MagicLogin />
      </Suspense>
    </div>
  );
}
