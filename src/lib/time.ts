const TZ = 'Asia/Tokyo';

const jstDay = (d: Date) =>
  d.toLocaleDateString('ja-JP', { timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

const jstTime = (d: Date) =>
  d.toLocaleTimeString('ja-JP', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

// 例：2026年10月5日(月) 8:00〜9:00
export const formatJstRange = (start: Date, end: Date) => `${jstDay(start)} ${jstTime(start)}〜${jstTime(end)}`;

// 例：2026年10月4日(日) 8:00
export const formatJstDateTime = (d: Date) => `${jstDay(d)} ${jstTime(d)}`;

// 日本時間の「明日」が終わる瞬間
export function endOfTomorrowJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const endUtc = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + 2);
  return new Date(endUtc - 9 * 60 * 60 * 1000);
}

export const isSameJstDay = (a: Date, b: Date) => jstDay(a) === jstDay(b);
