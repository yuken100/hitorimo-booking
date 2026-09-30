'use client';

import { useState, useEffect } from 'react';
import { BookSlotButton } from '@/components/BookSlotButton';

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookedTime, setBookedTime] = useState<string | null>(null);
  const emptyForm = { name: '', email: '', company: '', message: '' };
  const [formData, setFormData] = useState(emptyForm);

  // 今日から60日先までの予約枠を取得
  const loadSlots = () => {
    const today = new Date();
    const endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    fetchSlots(today.toISOString(), endDate.toISOString());
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleBooked = () => {
    setBookedTime(selectedSlotTime);
    setSelectedSlotId(null);
    setFormData(emptyForm);
    loadSlots();
  };

  const fetchSlots = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/slots?startDate=${startDate}&endDate=${endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const groupedByDate = slots.reduce(
    (acc, slot) => {
      const date = new Date(slot.startTime).toLocaleDateString('ja-JP');
      if (!acc[date]) acc[date] = [];
      acc[date].push(slot);
      return acc;
    },
    {} as Record<string, Slot[]>
  );

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedSlotTime = selectedSlot
    ? new Date(selectedSlot.startTime).toLocaleString('ja-JP')
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-ink mb-2">HITORI<span className="bg-accent">MO</span></h1>
        <h2 className="text-2xl font-bold text-ink mb-4">コンサルティング予約</h2>
        <p className="text-muted text-lg">
          誰一人として置き去りにしない社会を創る。小宮直樹のコンサルティングをご予約ください。
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 左：スロット選択 */}
        <div>
          <h3 className="text-xl font-bold mb-4">ご都合の良い日時をお選びください</h3>
          {loading ? (
            <p className="text-muted">読み込み中...</p>
          ) : slots.length === 0 ? (
            <p className="text-muted">ご利用可能な時間枠がありません。お問い合わせください。</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByDate).map(([date, dateSlots]) => (
                <div key={date}>
                  <h4 className="font-bold text-sm text-muted mb-2">{date}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {dateSlots.map((slot) => {
                      const startTime = new Date(slot.startTime).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const endTime = new Date(slot.endTime).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-3 border-2 rounded font-semibold transition ${
                            selectedSlotId === slot.id
                              ? 'bg-accent border-ink text-ink'
                              : 'border-ink text-ink hover:bg-soft'
                          }`}
                        >
                          {startTime}～{endTime}
                        </button>
                      );
                    })}
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
              確認メールをお送りしますので、ご確認ください。
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
          <h3 className="text-xl font-bold mb-4">ご情報をお入力ください</h3>
          <div className="space-y-4">
            {/* 選択された日時 */}
            {selectedSlotTime && (
              <div className="p-4 bg-soft rounded border-2 border-ink">
                <p className="font-bold text-sm text-muted">選択済み</p>
                <p className="font-bold text-ink">{selectedSlotTime}</p>
              </div>
            )}

            {/* フォーム */}
            <div>
              <label className="block text-sm font-bold text-ink mb-2">
                お名前 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
                className="w-full px-3 py-2 border-2 border-ink rounded focus:outline-none focus:border-accent"
                placeholder="example@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-2">
                会社名 / 肩書（任意）
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
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
                className="w-full px-3 py-2 border-2 border-ink rounded h-24 focus:outline-none focus:border-accent"
                placeholder="どのようなことでお困りですか？"
              />
            </div>

            {/* 予約ボタン */}
            {selectedSlotId ? (
              <BookSlotButton
                slotId={selectedSlotId}
                name={formData.name}
                email={formData.email}
                company={formData.company}
                message={formData.message}
                disabled={!selectedSlotId}
                onBooked={handleBooked}
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
