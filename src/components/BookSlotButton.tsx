'use client';

import { useState } from 'react';

interface BookSlotButtonProps {
  slotId: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  privacyAgreed: boolean;
  website: string;
  onBooked: () => void;
  onSlotGone: (message: string) => void;
}

export function BookSlotButton({
  slotId,
  name,
  email,
  company,
  message,
  privacyAgreed,
  website,
  onBooked,
  onSlotGone,
}: BookSlotButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('必須項目を入力してください');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('メールアドレスを確認してください');
      return;
    }
    if (!privacyAgreed) {
      setError('プライバシーポリシーへの同意にチェックを入れてください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, name, email, company: company || null, message, privacyAgreed, website }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        onSlotGone(data.error || 'この日時は予約できなくなりました。別の日時をお選びください。');
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || '予約できませんでした');
      }
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約できませんでした');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBook}
        disabled={isLoading}
        className="w-full px-4 py-3 bg-accent text-ink font-bold rounded hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isLoading ? '予約中...' : '予約する'}
      </button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
