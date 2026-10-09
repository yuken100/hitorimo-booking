'use client';

import { useEffect, useState } from 'react';

interface Student {
  id: string;
  email: string;
  name: string;
  active: boolean;
  lastLoginAt: string | null;
  completed: number;
}

interface Lesson {
  id: string;
  title: string;
  body: string;
  published: boolean;
  completedBy: number;
}

type Tab = 'students' | 'lessons';

const inputClass = 'mt-1 w-full px-3 py-2 border-2 border-ink rounded bg-paper';
const btn = 'px-3 py-1 text-sm font-bold rounded border-2 border-ink disabled:opacity-40';
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'まだログインしていません';

export default function StudentsAdminPage() {
  const [tab, setTab] = useState<Tab>('students');
  const [authed, setAuthed] = useState(true);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [totalLessons, setTotalLessons] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [newStudent, setNewStudent] = useState({ name: '', email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', body: '', published: true });

  const applyStudents = (data: { students: Student[]; totalLessons: number }) => {
    setStudents(data.students);
    setTotalLessons(data.totalLessons);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/students', { cache: 'no-store' }),
      fetch('/api/admin/lessons', { cache: 'no-store' }),
    ]).then(async ([s, l]) => {
      if (s.status === 401 || l.status === 401) return setAuthed(false);
      applyStudents(await s.json());
      setLessons((await l.json()).lessons);
    });
  }, []);

  const call = async (url: string, payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMessage(null);
    const res = await fetch(url, {
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
    if (data.students) applyStudents(data);
    if (data.lessons) setLessons(data.lessons);
    setMessage({ ok: true, text: okText });
    return true;
  };

  const student = (payload: Record<string, unknown>, okText: string) => call('/api/admin/students', payload, okText);
  const lesson = (payload: Record<string, unknown>, okText: string) => call('/api/admin/lessons', payload, okText);

  const addStudent = async () => {
    const ok = await student({ action: 'create', ...newStudent }, '受講生を登録しました。');
    if (ok) setNewStudent({ name: '', email: '' });
  };

  const sendLink = (s: Student) => {
    if (!window.confirm(`${s.name} さん（${s.email}）に、ログイン用のリンクをメールで送ります。よろしいですか？`)) return;
    student({ action: 'send-link', id: s.id }, 'ログイン用のリンクを送りました。');
  };
  const toggleActive = (s: Student) => {
    const text = s.active
      ? `${s.name} さんを無効にします。いまログインしていても、すぐにページを見られなくなります。よろしいですか？`
      : `${s.name} さんを有効に戻します。よろしいですか？`;
    if (!window.confirm(text)) return;
    student({ action: 'update', id: s.id, active: !s.active }, s.active ? '無効にしました。' : '有効にしました。');
  };
  const removeStudent = (s: Student) => {
    if (!window.confirm(`${s.name} さんを削除します。完了の記録も消え、元に戻せません。よろしいですか？`)) return;
    student({ action: 'delete', id: s.id }, '削除しました。');
  };

  const startNew = () => {
    setEditingId('new');
    setForm({ title: '', body: '', published: true });
    setMessage(null);
  };
  const startEdit = (l: Lesson) => {
    setEditingId(l.id);
    setForm({ title: l.title, body: l.body, published: l.published });
    setMessage(null);
  };
  const saveLesson = async () => {
    const isNew = editingId === 'new';
    const ok = await lesson(
      isNew ? { action: 'create', data: form } : { action: 'update', id: editingId, data: form },
      isNew ? 'レッスンを追加しました。' : '保存しました。'
    );
    if (ok) {
      setEditingId(null);
      // 公開レッスン数が変わるので、受講生の一覧も読み直す
      const res = await fetch('/api/admin/students', { cache: 'no-store' });
      if (res.ok) applyStudents(await res.json());
    }
  };
  const removeLesson = (l: Lesson) => {
    if (!window.confirm(`「${l.title}」を削除します。受講生の完了の記録も消え、元に戻せません。よろしいですか？\n（消したくないときは「非公開にする」を使ってください）`)) return;
    lesson({ action: 'delete', id: l.id }, '削除しました。');
  };

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
  if (!students || !lessons) return <p className="p-8 text-muted">読み込み中...</p>;

  const tabClass = (t: Tab) =>
    `px-4 py-2 font-bold border-2 border-ink rounded ${tab === t ? 'bg-accent' : 'bg-paper'}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">受講生ページの管理</h1>
        <div className="flex items-center gap-4 text-sm">
          <a href="/student" target="_blank" rel="noreferrer" className="underline">
            受講生ページを見る
          </a>
          <a href="/admin" className="underline text-muted">
            管理画面へ戻る
          </a>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button type="button" className={tabClass('students')} onClick={() => setTab('students')}>
          受講生（{students.length}）
        </button>
        <button type="button" className={tabClass('lessons')} onClick={() => setTab('lessons')}>
          レッスン（{lessons.length}）
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`mb-6 p-3 rounded border-2 ${
            message.ok ? 'border-green-700 bg-green-50 text-green-800' : 'border-red-600 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      {tab === 'students' && (
        <div className="space-y-6">
          <div className="p-4 border-2 border-ink rounded bg-soft space-y-3">
            <p className="font-bold text-ink">受講生を登録する</p>
            <label className="block text-sm font-bold text-ink">
              お名前
              <input value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} maxLength={100} className={inputClass} />
            </label>
            <label className="block text-sm font-bold text-ink">
              メールアドレス（ログイン用のリンクが届く宛先です）
              <input type="email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} maxLength={254} className={inputClass} />
            </label>
            <button type="button" onClick={addStudent} disabled={busy} className={`${btn} bg-accent`}>
              登録する
            </button>
            <p className="text-xs text-muted">登録しただけではメールは届きません。登録後に「リンクを送る」を押すか、受講生ご自身が受講生ページ（/student）からリンクを受け取れます。</p>
          </div>

          {students.length === 0 ? (
            <p className="text-muted">まだ受講生はいません。</p>
          ) : (
            <ul className="space-y-3">
              {students.map((s) => (
                <li key={s.id} className={`p-4 border-2 border-ink rounded ${s.active ? 'bg-paper' : 'bg-soft opacity-70'}`}>
                  <p className="font-bold text-ink">
                    {s.name}
                    {!s.active && <span className="ml-2 text-xs font-normal text-red-700">（無効）</span>}
                  </p>
                  <p className="text-sm text-muted break-all">{s.email}</p>
                  <p className="text-sm text-ink mt-1">
                    進み具合：{s.completed} / {totalLessons} 完了　最後のログイン：{when(s.lastLoginAt)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button type="button" onClick={() => sendLink(s)} disabled={busy || !s.active} className={`${btn} bg-accent`}>
                      リンクを送る
                    </button>
                    <button type="button" onClick={() => toggleActive(s)} disabled={busy} className={btn}>
                      {s.active ? '無効にする' : '有効に戻す'}
                    </button>
                    <button type="button" onClick={() => removeStudent(s)} disabled={busy} className={`${btn} text-red-700`}>
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'lessons' && (
        <div className="space-y-4">
          {editingId ? (
            <div className="p-4 border-2 border-ink rounded bg-soft space-y-3">
              <label className="block text-sm font-bold text-ink">
                タイトル
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} placeholder="例：シーズとニーズ" className={inputClass} />
              </label>
              <label className="block text-sm font-bold text-ink">
                本文（改行はそのまま表示されます）
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={20000} rows={14} className={inputClass} />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="w-5 h-5" />
                受講生に公開する
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={saveLesson} disabled={busy} className={`${btn} bg-accent`}>
                  保存する
                </button>
                <button type="button" onClick={() => setEditingId(null)} disabled={busy} className={btn}>
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={startNew} className={`${btn} bg-accent`}>
              ＋ レッスンを追加する
            </button>
          )}

          {lessons.length === 0 ? (
            <p className="text-muted">まだレッスンはありません。</p>
          ) : (
            <ol className="space-y-3">
              {lessons.map((l, i) => (
                <li key={l.id} className={`p-4 border-2 border-ink rounded ${l.published ? 'bg-paper' : 'bg-soft opacity-70'}`}>
                  <p className="font-bold text-ink">
                    {i + 1}. {l.title}
                    {!l.published && <span className="ml-2 text-xs font-normal text-red-700">（非公開）</span>}
                  </p>
                  <p className="text-sm text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{l.body}</p>
                  <p className="text-xs text-muted mt-1">完了した受講生：{l.completedBy}人</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button type="button" onClick={() => lesson({ action: 'move', id: l.id, direction: 'up' }, '並び順を変えました。')} disabled={busy || i === 0} className={btn} aria-label="上へ">
                      ↑
                    </button>
                    <button type="button" onClick={() => lesson({ action: 'move', id: l.id, direction: 'down' }, '並び順を変えました。')} disabled={busy || i === lessons.length - 1} className={btn} aria-label="下へ">
                      ↓
                    </button>
                    <button type="button" onClick={() => startEdit(l)} disabled={busy} className={btn}>
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => lesson({ action: 'update', id: l.id, data: { title: l.title, body: l.body, published: !l.published } }, l.published ? '非公開にしました。' : '公開しました。')}
                      disabled={busy}
                      className={btn}
                    >
                      {l.published ? '非公開にする' : '公開する'}
                    </button>
                    <button type="button" onClick={() => removeLesson(l)} disabled={busy} className={`${btn} text-red-700`}>
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
