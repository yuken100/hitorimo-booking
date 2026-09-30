'use client';

import { useState, useEffect } from 'react';
import { BookSlotButton } from '@/components/BookSlotButton';

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: 'numeric', minute: '2-digit' });

const emptyForm = { name: '', email: '', company: '', message: '', website: '' };

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookedTime, setBookedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/slots', { cache: 'no-store' });
      if (response.ok) setSlots(await response.json());
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedSlotTime = selectedSlot
    ? `${dayLabel(selectedSlot.startTime)} ${timeLabel(selectedSlot.startTime)}〜${timeLabel(selectedSlot.endTime)}`
    : null;

  const handleBooked = () => {
    setBookedTime(selectedSlotTime);
    setSelectedSlotId(null);
    setFormData(emptyForm);
    setPrivacyAgreed(false);
    loadSlots();
  };

  // 選んだ枠が先に埋まっていた場合は、一覧を最新にする
  const handleSlotGone = (message: string) => {
    setNotice(message);
    setSelectedSlotId(null);
    loadSlots();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const groupedByDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const date = dayLabel(slot.startTime);
    (acc[date] ||= []).push(slot);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-ink mb-2">
          HITORI<span className="bg-accent">MO</span>
        </h1>
        <h2 className="text-2xl font-bold text-ink mb-4">コンサルティング予約</h2>
        <p className="text-muted text-lg">
          誰一人として置き去りにしない社会を創る。小宮直樹のコンサルティングをご予約ください。
        </p>
        <ul className="mt-4 text-sm text-muted list-disc pl-5 space-y-1">
          <li>初回相談は無料です。Zoom でのオンライン相談になります（参加リンクは確認メールでお送りします）。</li>
          <li>ご予約は、開始の24時間前まで受け付けています。</li>
          <li>キャンセルは、開始の24時間前まで、確認メールのボタンからできます。</li>
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 左：スロット選択 */}
        <div>
          <h3 className="text-xl font-bold mb-4">ご都合の良い日時をお選びください</h3>
          {loading ? (
            <p className="text-muted">読み込み中...</p>
          ) : slots.length === 0 ? (
            <p className="text-muted">ただいま予約できる日時がありません。時間をおいて、もう一度ご確認ください。</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByDate).map(([date, dateSlots]) => (
                <div key={date}>
                  <h4 className="font-bold text-sm text-muted mb-2">{date}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {dateSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => {
                          setSelectedSlotId(slot.id);
                          setBookedTime(null);
                          setNotice(null);
                        }}
                        aria-pressed={selectedSlotId === slot.id}
                        className={`p-3 border-2 rounded font-semibold transition ${
                          selectedSlotId === slot.id
                            ? 'bg-accent border-ink text-ink'
                            : 'border-ink text-ink hover:bg-soft'
                        }`}
                      >
                        {timeLabel(slot.startTime)}～{timeLabel(slot.endTime)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：予約フォーム */}
        {bookedTime ? (
          <div className="p-6 border-2 border-ink rounded bg-soft h-fit">
            <p className="text-xl font-bold text-ink mb-2">ご予約を承りました</p>
            <p className="font-bold text-ink mb-4">{bookedTime}</p>
            <p className="text-muted mb-6">
              確認メールをお送りしました。Zoom の参加リンクと、キャンセル用のボタンが入っています。メールが届かない場合は、迷惑メールのフォルダもご確認ください。
            </p>
            <button
              onClick={() => setBookedTime(null)}
              className="px-4 py-2 border-2 border-ink rounded font-bold hover:bg-accent transition"
            >
              別の日時を予約する
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold mb-4">ご情報をご入力ください</h3>
            <div className="space-y-4">
              {notice && (
                <p role="alert" className="p-3 border-2 border-red-600 rounded text-red-700 text-sm">
                  {notice}
                </p>
              )}
              {selectedSlotTime && (
                <div className="p-4 bg-soft rounded border-2 border-ink">
                  <p className="font-bold text-sm text-muted">選択済み</p>
                  <p className="font-bold text-ink">{selectedSlotTime}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-ink mb-2">
                  お名前 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={100}
                  autoComplete="name"
                  className="w-full px-3 py-2 border-2 border-ink rounded focus:outline-none focus:border-accent"
                  placeholder="山田太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-ink mb-2">
                  メールアドレス <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  maxLength={254}
                  autoComplete="email"
                  className="w-full px-3 py-2 border-2 border-ink rounded focus:outline-none focus:border-accent"
                  placeholder="example@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-ink mb-2">会社名 / 肩書（任意）</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  maxLength={200}
                  autoComplete="organization"
                  className="w-full px-3 py-2 border-2 border-ink rounded focus:outline-none focus:border-accent"
                  placeholder="●●株式会社 代表取締役"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-ink mb-2">
                  ご相談内容 <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  maxLength={2000}
                  className="w-full px-3 py-2 border-2 border-ink rounded h-24 focus:outline-none focus:border-accent"
                  placeholder="どのようなことでお困りですか？"
                />
              </div>

              {/* 機械による送信を見分けるための欄。人には見えない */}
              <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                <label>
                  ウェブサイト
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
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

              {selectedSlotId ? (
                <BookSlotButton
                  slotId={selectedSlotId}
                  name={formData.name}
                  email={formData.email}
                  company={formData.company}
                  message={formData.message}
                  privacyAgreed={privacyAgreed}
                  website={formData.website}
                  onBooked={handleBooked}
                  onSlotGone={handleSlotGone}
                />
              ) : (
                <button disabled className="w-full px-4 py-3 bg-muted text-white rounded opacity-50 cursor-not-allowed">
                  日時を選択してください
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
