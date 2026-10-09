'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmailComposer, type SentEmail } from './EmailComposer';

interface Booking {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  createdAt: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: 'NEW' | 'DONE';
  createdAt: string;
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

const jstDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function BookingDetails({
  booking,
  messageLabel = 'ご相談内容',
}: {
  booking: Pick<Booking, 'name' | 'email' | 'company' | 'message' | 'createdAt'>;
  messageLabel?: string;
}) {
  return (
    <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm text-ink break-words">
      <dt className="font-bold text-muted">お名前</dt>
      <dd>{booking.name} 様</dd>
      <dt className="font-bold text-muted">会社名 / 肩書</dt>
      <dd>{booking.company || '（なし）'}</dd>
      <dt className="font-bold text-muted">メール</dt>
      <dd>
        <a className="underline" href={`mailto:${booking.email}`}>
          {booking.email}
        </a>
      </dd>
      <dt className="font-bold text-muted">受付日時</dt>
      <dd>{jstDateTime(booking.createdAt)}</dd>
      <dt className="font-bold text-muted col-span-2">{messageLabel}</dt>
      <dd className="col-span-2 p-3 bg-soft border-2 border-ink rounded whitespace-pre-wrap text-base">
        {booking.message}
      </dd>
    </dl>
  );
}

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
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
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
    loadInquiries();
  };

  const loadInquiries = async () => {
    const [inq, sent] = await Promise.all([
      fetch('/api/admin/inquiries', { cache: 'no-store' }),
      fetch('/api/admin/emails', { cache: 'no-store' }),
    ]);
    if (inq.ok) setInquiries(await inq.json());
    if (sent.ok) setSentEmails(await sent.json());
  };

  const setInquiryStatus = async (inquiry: Inquiry, status: Inquiry['status']) => {
    setBusy(true);
    const res = await fetch('/api/admin/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inquiry.id, status }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: 'error', text: '更新できませんでした' });
      return;
    }
    setInquiries((prev) => prev.map((i) => (i.id === inquiry.id ? { ...i, status } : i)));
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

  const handleSendLoginLink = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/magic-link', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMessage(
      res.ok
        ? { type: 'ok', text: '管理者のメールアドレスに、ログイン用のリンクを送りました。メールを確認してください。' }
        : { type: 'error', text: data.error || '送信できませんでした' }
    );
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
  const bookedSlots = slots.filter((s) => s.bookings.length > 0);
  const bookedCount = bookedSlots.length;

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
          {message && (
            <p className={`text-sm ${message.type === 'ok' ? 'text-green-800' : 'text-red-600'}`}>{message.text}</p>
          )}
        </form>

        <div className="mt-10 pt-6 border-t-2 border-ink">
          <p className="text-sm font-bold text-ink mb-2">パスワードを忘れたとき</p>
          <p className="text-sm text-muted mb-3">
            管理者のメールアドレスに、ログイン用のリンクを送ります。リンクは15分間、1回だけ使えます。
          </p>
          <button
            type="button"
            onClick={handleSendLoginLink}
            disabled={busy}
            className="w-full px-4 py-3 bg-paper text-ink font-bold rounded border-2 border-ink disabled:opacity-50"
          >
            ログイン用のリンクをメールで受け取る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-ink">
          HITORI<span className="bg-accent">MO</span> 管理画面
        </h1>
        <div className="flex items-center gap-4">
          <a href="/admin/content" className="px-3 py-1 text-sm font-bold rounded border-2 border-ink bg-accent text-ink">
            サイトの文章を編集
          </a>
          <a href="/admin/students" className="px-3 py-1 text-sm font-bold rounded border-2 border-ink bg-accent text-ink">
            受講生ページの管理
          </a>
          <button onClick={handleLogout} className="text-sm underline text-muted">
            ログアウト
          </button>
        </div>
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

      {/* これからの予約 */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-ink mb-4">これからの予約（{bookedSlots.length}件）</h2>
        {bookedSlots.length === 0 ? (
          <p className="text-muted">まだ予約は入っていません。</p>
        ) : (
          <ul className="space-y-4">
            {bookedSlots.map((slot) => (
              <li key={slot.id} className="p-4 border-2 border-ink rounded">
                <p className="font-bold text-ink text-lg">
                  {jstDate(slot.startTime)} {jstTime(slot.startTime)}～{jstTime(slot.endTime)}
                </p>
                <BookingDetails booking={slot.bookings[0]} />
                <EmailComposer
                  target={{
                    type: 'booking',
                    id: slot.bookings[0].id,
                    name: slot.bookings[0].name,
                    email: slot.bookings[0].email,
                    when: `${jstDate(slot.startTime)} ${jstTime(slot.startTime)}～${jstTime(slot.endTime)}`,
                  }}
                  history={sentEmails.filter((e) => e.bookingId === slot.bookings[0].id)}
                  onSent={(email) => setSentEmails((prev) => [email, ...prev])}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCancelBooking(slot.bookings[0], `${jstDate(slot.startTime)} ${jstTime(slot.startTime)}`)
                    }
                    disabled={busy}
                    className="px-3 py-1 text-sm font-bold rounded border-2 border-red-600 text-red-700 disabled:opacity-40"
                  >
                    この予約を取り消す
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* お問い合わせ */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-ink mb-4">
          お問い合わせ（未対応 {inquiries.filter((i) => i.status === 'NEW').length}件）
        </h2>
        {inquiries.length === 0 ? (
          <p className="text-muted">まだお問い合わせはありません。</p>
        ) : (
          <ul className="space-y-4">
            {inquiries.map((inquiry) => (
              <li
                key={inquiry.id}
                className={`p-4 border-2 rounded ${inquiry.status === 'NEW' ? 'border-ink' : 'border-muted opacity-60'}`}
              >
                <p className="font-bold text-ink">
                  <span
                    className={`mr-2 px-2 py-0.5 text-xs rounded ${
                      inquiry.status === 'NEW' ? 'bg-accent text-ink' : 'bg-soft text-muted'
                    }`}
                  >
                    {inquiry.status === 'NEW' ? '未対応' : '対応済み'}
                  </span>
                  {inquiry.name} 様
                </p>
                <BookingDetails booking={inquiry} messageLabel="お問い合わせ内容" />
                <EmailComposer
                  target={{ type: 'inquiry', id: inquiry.id, name: inquiry.name, email: inquiry.email }}
                  history={sentEmails.filter((e) => e.inquiryId === inquiry.id)}
                  onSent={(email) => setSentEmails((prev) => [email, ...prev])}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInquiryStatus(inquiry, inquiry.status === 'NEW' ? 'DONE' : 'NEW')}
                    disabled={busy}
                    className="px-3 py-1 text-sm font-bold rounded border-2 border-ink disabled:opacity-40"
                  >
                    {inquiry.status === 'NEW' ? '対応済みにする' : '未対応に戻す'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                            <div>
                              <BookingDetails booking={booking} />
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(booking, `${date} ${jstTime(slot.startTime)}`)}
                                disabled={busy}
                                className="mt-3 px-3 py-1 text-sm font-bold rounded border-2 border-red-600 text-red-700 disabled:opacity-40"
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
