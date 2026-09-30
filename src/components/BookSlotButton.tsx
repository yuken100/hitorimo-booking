'use client';

import { useState } from 'react';

interface BookSlotButtonProps {
  slotId: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  disabled?: boolean;
  onBooked: () => void;
}

export function BookSlotButton({
  slotId,
  name,
  email,
  company,
  message,
  disabled,
  onBooked,
}: BookSlotButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async () => {
    // バリデーション
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('必須項目を入力してください');
      return;
    }

    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          name,
          email,
          company: company || null,
          message,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Booking failed');
      }

      onBooked();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to book slot'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBook}
        disabled={disabled || isLoading}
        className="w-full px-4 py-3 bg-accent text-ink font-bold rounded hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isLoading ? '予約中...' : '予約する'}
      </button>
      {error && (
        <p className="mt-2 text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}
