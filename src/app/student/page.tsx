'use client';

import { useEffect, useState } from 'react';

interface Lesson {
  id: string;
  title: string;
  body: string;
  completed: boolean;
}

interface Data {
  student: { name: string };
  lessons: Lesson[];
}

const inputClass = 'mt-1 w-full px-3 py-2 border-2 border-ink rounded bg-paper';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/student/login-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) return setSent(true);
    setError(data.error || '送信できませんでした');
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-ink mb-2">
        HITORI<span className="bg-accent">MO</span> 受講生ページ
      </h1>
      <p className="text-sm text-muted mb-6">ご登録のメールアドレスに、ログイン用のリンクをお送りします。</p>
      {sent ? (
        <p role="status" className="p-3 rounded border-2 border-green-700 bg-green-50 text-green-800 text-sm">
          ご登録のメールアドレスであれば、ログイン用のリンクを送りました（15分間有効）。メールが届かないときは、迷惑メールフォルダも確認してください。
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-bold text-ink">
            メールアドレス
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              autoComplete="email"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-3 bg-accent text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
          >
            {busy ? '送信しています...' : 'ログイン用のリンクを送る'}
          </button>
          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function StudentPage() {
  const [data, setData] = useState<Data | null>(null);
  const [authed, setAuthed] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/student/lessons', { cache: 'no-store' }).then(async (res) => {
      if (res.status === 401) return setAuthed(false);
      const body: Data = await res.json();
      setData(body);
      // 最初に開くのは、まだ終わっていない先頭のレッスン
      setOpenId((body.lessons.find((l) => !l.completed) ?? body.lessons[0])?.id ?? null);
    });
  }, []);

  const toggle = async (lesson: Lesson) => {
    setError(null);
    const completed = !lesson.completed;
    const res = await fetch('/api/student/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, completed }),
    });
    if (!res.ok) return setError('保存できませんでした。もう一度お試しください。');
    setData((prev) =>
      prev ? { ...prev, lessons: prev.lessons.map((l) => (l.id === lesson.id ? { ...l, completed } : l)) } : prev
    );
  };

  const logout = async () => {
    await fetch('/api/student/logout', { method: 'POST' });
    window.location.href = '/student';
  };

  if (!authed) return <LoginForm />;
  if (!data) return <p className="p-8 text-muted">読み込み中...</p>;

  const total = data.lessons.length;
  const done = data.lessons.filter((l) => l.completed).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">
          HITORI<span className="bg-accent">MO</span> 受講生ページ
        </h1>
        <button onClick={logout} className="text-sm underline text-muted">
          ログアウト
        </button>
      </div>

      <p className="text-ink mb-4">{data.student.name} さん、こんにちは。</p>

      {total === 0 ? (
        <p className="p-4 border-2 border-ink rounded bg-soft text-sm">レッスンは、準備ができ次第ここに表示されます。</p>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-sm font-bold text-ink mb-1">
              進み具合：{done} / {total} 完了
            </p>
            <div className="h-3 border-2 border-ink rounded bg-paper overflow-hidden" aria-hidden="true">
              <div className="h-full bg-accent" style={{ width: `${Math.round((done / total) * 100)}%` }} />
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-4 text-red-600 text-sm">
              {error}
            </p>
          )}

          <ol className="space-y-3">
            {data.lessons.map((lesson, i) => {
              const open = openId === lesson.id;
              return (
                <li key={lesson.id} className="border-2 border-ink rounded bg-paper">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : lesson.id)}
                    aria-expanded={open}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={`shrink-0 w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full border-2 border-ink ${
                        lesson.completed ? 'bg-accent' : 'bg-paper'
                      }`}
                    >
                      {lesson.completed ? '✓' : i + 1}
                    </span>
                    <span className="flex-1 font-bold text-ink">{lesson.title}</span>
                    <span className="text-muted" aria-hidden="true">
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 border-t-2 border-ink">
                      <p className="mt-4 text-ink leading-relaxed whitespace-pre-wrap break-words">{lesson.body}</p>
                      <label className="mt-4 flex items-center gap-2 text-sm font-bold text-ink">
                        <input
                          type="checkbox"
                          checked={lesson.completed}
                          onChange={() => toggle(lesson)}
                          className="w-5 h-5"
                        />
                        このレッスンを完了にする
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
