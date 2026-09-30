'use client';

import { useEffect, useMemo, useState } from 'react';

interface Booking {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  bookings: Booking[];
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const TIME_OPTIONS = Array.from({ length: 27 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const jstDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
const jstTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });

const todayJst = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

// 'YYYY-MM-DD' の範囲から、選んだ曜日の日付だけを並べる
function listDates(from: string, to: string, weekdays: number[]) {
  const dates: string[] = [];
  if (!from || !to || from > to) return dates;
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end && dates.length < 400) {
    if (weekdays.includes(cursor.getUTCDay())) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [fromDate, setFromDate] = useState(todayJst());
  const [toDate, setToDate] = useState(todayJst());
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [times, setTimes] = useState<string[]>([]);
  const [duration, setDuration] = useState(60);
  const [selected, setSelected] = useState<string[]>([]);

  const loadSlots = async () => {
    const res = await fetch('/api/admin/slots', { cache: 'no-store' });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setSlots(await res.json());
    setSelected([]);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      setPassword('');
      loadSlots();
    } else {
      setMessage({ type: 'error', text: 'パスワードが違います' });
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setSlots([]);
  };

  const dates = useMemo(() => listDates(fromDate, toDate, weekdays), [fromDate, toDate, weekdays]);
  const plannedCount = dates.length * times.length;

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates, times, duration }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || '作成できませんでした' });
      return;
    }
    const skipped = data.skipped ? `（${data.skipped}枠は、ほかの枠と時間が重なるため作りませんでした）` : '';
    setMessage({ type: 'ok', text: `${data.created}枠を作成しました${skipped}` });
    setTimes([]);
    loadSlots();
  };

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`${ids.length}枠を削除します。よろしいですか？`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || '削除できませんでした' });
      return;
    }
    setMessage({ type: 'ok', text: `${data.deleted}枠を削除しました` });
    loadSlots();
  };

  const handleCancelBooking = async (booking: Booking, when: string) => {
    if (
      !window.confirm(
        `${when} の ${booking.name} 様の予約を取り消します。\n枠は「空き」に戻ります。お客様へのメールは送られません。\nよろしいですか？`
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/bookings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || '取り消せませんでした' });
      return;
    }
    setMessage({ type: 'ok', text: `${booking.name} 様の予約を取り消しました` });
    loadSlots();
  };

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = jstDate(slot.startTime);
    (acc[key] ||= []).push(slot);
    return acc;
  }, {});
  const openIds = slots.filter((s) => s.bookings.length === 0 && s.status === 'OPEN').map((s) => s.id);
  const bookedCount = slots.filter((s) => s.bookings.length > 0).length;

  if (authed === null) {
    return <p className="p-8 text-muted">読み込み中...</p>;
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-ink mb-6">予約枠の管理</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block text-sm font-bold text-ink">
            管理用パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full px-3 py-2 border-2 border-ink rounded"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full px-4 py-3 bg-accent text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
          >
            {busy ? '確認中...' : 'ログイン'}
          </button>
          {message && <p className="text-red-600 text-sm">{message.text}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-ink">
          HITORI<span className="bg-accent">MO</span> 予約枠の管理
        </h1>
        <button onClick={handleLogout} className="text-sm underline text-muted">
          ログアウト
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`mb-6 p-3 rounded border-2 ${
            message.type === 'ok' ? 'border-green-700 bg-green-50 text-green-800' : 'border-red-600 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 枠の作成 */}
      <section className="mb-12 p-5 border-2 border-ink rounded">
        <h2 className="text-lg font-bold text-ink mb-4">予約枠を追加する</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <label className="block text-sm font-bold text-ink">
            開始日
            <input
              type="date"
              value={fromDate}
              min={todayJst()}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border-2 border-ink rounded"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            終了日
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border-2 border-ink rounded"
            />
          </label>
        </div>

        <p className="text-sm font-bold text-ink mb-2">曜日</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {WEEKDAYS.map((label, day) => (
            <button
              key={label}
              type="button"
              onClick={() => setWeekdays((prev) => toggle(prev, day))}
              aria-pressed={weekdays.includes(day)}
              className={`w-11 h-11 rounded border-2 border-ink font-bold ${
                weekdays.includes(day) ? 'bg-accent' : 'bg-paper text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-sm font-bold text-ink mb-2">開始時刻（複数選べます）</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => setTimes((prev) => toggle(prev, time).sort())}
              aria-pressed={times.includes(time)}
              className={`py-2 rounded border-2 border-ink text-sm font-semibold ${
                times.includes(time) ? 'bg-accent' : 'bg-paper'
              }`}
            >
              {time}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted mb-4">
          選んだ時刻から、下の「1枠の長さ」の枠が作られます。ほかの枠と時間が重なる場合は、その枠は作られません。
        </p>

        <label className="block text-sm font-bold text-ink mb-4">
          1枠の長さ
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block px-3 py-2 border-2 border-ink rounded bg-paper"
          >
            <option value={30}>30分</option>
            <option value={60}>60分</option>
            <option value={90}>90分</option>
            <option value={120}>120分</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || plannedCount === 0}
          className="w-full px-4 py-3 bg-accent text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
        >
          {plannedCount === 0 ? '日付と時刻を選んでください' : `${dates.length}日 × ${times.length}時刻 ＝ ${plannedCount}枠を作成する`}
        </button>
      </section>

      {/* 枠の一覧 */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-ink">
            これからの予約枠（{slots.length}枠・うち予約あり{bookedCount}枠）
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDelete(selected)}
              disabled={busy || selected.length === 0}
              className="px-3 py-2 text-sm font-bold rounded border-2 border-red-600 text-red-700 disabled:opacity-40"
            >
              選んだ{selected.length}枠を削除
            </button>
            <button
              type="button"
              onClick={() => handleDelete(openIds)}
              disabled={busy || openIds.length === 0}
              className="px-3 py-2 text-sm font-bold rounded border-2 border-red-600 text-red-700 disabled:opacity-40"
            >
              空き枠をすべて削除
            </button>
          </div>
        </div>

        {slots.length === 0 ? (
          <p className="text-muted">予約枠はまだありません。上のフォームから追加してください。</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, daySlots]) => (
              <div key={date}>
                <h3 className="font-bold text-ink mb-2">{date}</h3>
                <ul className="space-y-2">
                  {daySlots.map((slot) => {
                    const booking = slot.bookings[0];
                    return (
                      <li key={slot.id} className="p-3 border-2 border-ink rounded flex gap-3 items-start">
                        {booking ? (
                          <span className="mt-1 w-5 shrink-0" aria-hidden="true" />
                        ) : (
                          <input
                            type="checkbox"
                            className="mt-1 w-5 h-5 shrink-0"
                            checked={selected.includes(slot.id)}
                            onChange={() => setSelected((prev) => toggle(prev, slot.id))}
                            aria-label={`${date} ${jstTime(slot.startTime)} を選ぶ`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-ink">
                            {jstTime(slot.startTime)}～{jstTime(slot.endTime)}
                            <span
                              className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                booking ? 'bg-ink text-paper' : 'bg-soft text-ink'
                              }`}
                            >
                              {booking ? '予約あり' : '空き'}
                            </span>
                          </p>
                          {booking && (
                            <div className="mt-2 text-sm text-ink space-y-1 break-words">
                              <p>
                                {booking.name}
                                {booking.company ? `（${booking.company}）` : ''}
                              </p>
                              <p>
                                <a className="underline" href={`mailto:${booking.email}`}>
                                  {booking.email}
                                </a>
                              </p>
                              <p className="whitespace-pre-wrap text-muted">{booking.message}</p>
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(booking, `${date} ${jstTime(slot.startTime)}`)}
                                disabled={busy}
                                className="mt-2 px-3 py-1 text-sm font-bold rounded border-2 border-red-600 text-red-700 disabled:opacity-40"
                              >
                                この予約を取り消す
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
