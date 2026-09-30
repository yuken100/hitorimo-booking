export const SITE_URL = process.env.SITE_URL || 'https://hitorimo-booking.vercel.app';
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@goodrelationship.net';
export const MEETING_URL = process.env.MEETING_URL || 'https://us06web.zoom.us/j/5317818084';

// 予約の受付とキャンセルは、どちらも開始24時間前まで
export const LEAD_HOURS = 24;
export const LEAD_MS = LEAD_HOURS * 60 * 60 * 1000;

export const cancelUrl = (token: string) => `${SITE_URL}/cancel?token=${encodeURIComponent(token)}`;
