'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface BookingInfo {
  name: string;
  when: string;
  deadline: string;
  status: string;
  canCancel: boolean;
}

function CancelContent() {
  const token = useSearchParams().get('token') ?? '';
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('ご予約が見つかりません。メールのボタンから開き直してください。');
      return;
    }
    fetch(`/api/cancel?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ご予約が見つかりません');
        setInfo(data);
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  const handleCancel = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'キャンセルできませんでした');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="p-6 border-2 border-ink rounded bg-soft">
        <p className="text-xl font-bold text-ink mb-2">キャンセルを承りました</p>
        <p className="text-ink">{info?.when}</p>
        <p className="text-muted mt-4">確認のメールをお送りしました。またご都合のよいときに、いつでもお声がけください。</p>
        <a href="/" className="inline-block mt-6 px-4 py-2 border-2 border-ink rounded font-bold hover:bg-accent">
          別の日時を予約する
        </a>
      </div>
    );
  }

  if (error && !info) {
    return <p className="p-4 border-2 border-red-600 rounded text-red-700">{error}</p>;
  }

  if (!info) {
    return <p className="text-muted">読み込み中...</p>;
  }

  return (
    <div className="p-6 border-2 border-ink rounded">
      <p className="text-ink">{info.name} 様</p>
      <p className="text-sm text-muted mt-4">ご予約の日時</p>
      <p className="text-xl font-bold text-ink">{info.when}</p>

      {info.status === 'CANCELLED' ? (
        <p className="mt-6 text-ink">このご予約は、すでにキャンセルされています。</p>
      ) : info.canCancel ? (
        <>
          <p className="mt-6 text-ink">このご予約をキャンセルしますか？（受付期限：{info.deadline}）</p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="mt-4 w-full px-4 py-3 border-2 border-red-600 text-red-700 font-bold rounded disabled:opacity-50"
          >
            {busy ? 'キャンセルしています...' : '予約をキャンセルする'}
          </button>
        </>
      ) : (
        <p className="mt-6 text-ink">
          キャンセルの受付期限（{info.deadline}）を過ぎています。お手数ですが、
          <a href="mailto:info@goodrelationship.net" className="underline font-bold">
            info@goodrelationship.net
          </a>
          までご連絡ください。
        </p>
      )}
      {error && <p className="mt-4 text-red-700 text-sm">{error}</p>}
    </div>
  );
}

export default function CancelPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink mb-2">
        HITORI<span className="bg-accent">MO</span>
      </h1>
      <h2 className="text-xl font-bold text-ink mb-8">ご予約のキャンセル</h2>
      <Suspense fallback={<p className="text-muted">読み込み中...</p>}>
        <CancelContent />
      </Suspense>
    </div>
  );
}
