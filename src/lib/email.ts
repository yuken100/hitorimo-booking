// Resend REST API を直接使用してメール送信（SDK なし）
import { MEETING_URL, LEAD_MS, cancelUrl } from './config';
import { formatJstDateTime, formatJstRange } from './time';
import { buildIcs, googleCalendarUrl } from './calendar';

interface Attachment {
  filename: string;
  content: string; // base64
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

export async function sendEmail({ to, subject, html, attachments }: EmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@goodrelationship.net';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: `HITORIMO <${from}>`, to, subject, html, attachments }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Resend error:', error);
    throw new Error(`Failed to send email: ${error.message ?? response.status}`);
  }

  return response.json();
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const layout = (body: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #141414; line-height: 1.8;">
    <p style="font-size: 20px; font-weight: bold; margin: 0 0 16px;">HITORI<span style="background: #FFE03A;">MO</span></p>
    ${body}
    <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0 16px;" />
    <p style="color: #666; font-size: 12px;">
      このメールは HITORIMO 予約システムから自動で送信しています。<br />
      このメールに心当たりがない場合は、お手数ですが破棄してください。
    </p>
  </div>`;

const button = (href: string, label: string, primary = true) => `
  <a href="${escapeHtml(href)}" style="display: inline-block; margin: 4px 8px 4px 0; padding: 12px 20px; border: 2px solid #141414; border-radius: 6px; font-weight: bold; text-decoration: none; color: #141414; background: ${primary ? '#FFE03A' : '#FFFFFF'};">${label}</a>`;

const meetingBlock = () => `
  <h3 style="margin: 24px 0 8px;">当日の参加方法（Zoom）</h3>
  <p style="margin: 0 0 8px;">開始時刻になりましたら、下のボタンから Zoom にご参加ください。</p>
  ${button(MEETING_URL, 'Zoom に参加する')}
  <p style="margin: 8px 0 0; font-size: 13px; color: #666; word-break: break-all;">${escapeHtml(MEETING_URL)}</p>`;

const cancelBlock = (token: string, startTime: Date) => {
  const deadline = formatJstDateTime(new Date(startTime.getTime() - LEAD_MS));
  return `
  <h3 style="margin: 24px 0 8px;">キャンセルについて</h3>
  <p style="margin: 0 0 8px;">ご都合が悪くなった場合は、<strong>${deadline}</strong> までに、下のボタンからキャンセルできます。それ以降は、このメールへの返信ではなく、お手数ですが別途ご連絡ください。</p>
  ${button(cancelUrl(token), '予約をキャンセルする', false)}`;
};

interface BookingEmailData {
  bookingId: string;
  name: string;
  email: string;
  company?: string | null;
  message: string;
  startTime: Date;
  endTime: Date;
  cancelToken: string;
}

const calendarEvent = (data: BookingEmailData) => ({
  uid: `${data.bookingId}@hitorimo-booking`,
  title: 'HITORIMO 初回相談（Zoom）',
  start: data.startTime,
  end: data.endTime,
  description: `Zoom: ${MEETING_URL}\nキャンセル: ${cancelUrl(data.cancelToken)}`,
  location: MEETING_URL,
});

// 予約確認メール（お客様へ）
export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  const when = formatJstRange(data.startTime, data.endTime);
  const event = calendarEvent(data);

  const html = layout(`
    <h2 style="margin: 0 0 16px;">ご予約を承りました</h2>
    <p>${escapeHtml(data.name)} 様</p>
    <p>HITORIMO の初回相談をご予約いただき、ありがとうございます。当日お話しできることを楽しみにしています。</p>
    <h3 style="margin: 24px 0 8px;">ご予約内容</h3>
    <p style="margin: 0;"><strong>日時：</strong>${when}</p>
    <p style="margin: 8px 0 0;"><strong>ご相談内容：</strong></p>
    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
    ${meetingBlock()}
    <h3 style="margin: 24px 0 8px;">カレンダーに登録する</h3>
    ${button(googleCalendarUrl(event), 'Google カレンダーに追加', false)}
    <p style="margin: 8px 0 0; font-size: 13px; color: #666;">iPhone や Outlook をお使いの方は、添付の「hitorimo.ics」を開くと登録できます。</p>
    ${cancelBlock(data.cancelToken, data.startTime)}
  `);

  return sendEmail({
    to: data.email,
    subject: `[HITORIMO] ご予約を承りました（${when}）`,
    html,
    attachments: [{ filename: 'hitorimo.ics', content: Buffer.from(buildIcs(event)).toString('base64') }],
  });
}

// 新規予約の通知（管理者へ）
export async function sendAdminNotificationEmail(data: BookingEmailData, adminEmail: string) {
  const when = formatJstRange(data.startTime, data.endTime);

  const html = layout(`
    <h2 style="margin: 0 0 16px;">新しい予約がありました</h2>
    <p style="margin: 0;"><strong>日時：</strong>${when}</p>
    <p style="margin: 0;"><strong>名前：</strong>${escapeHtml(data.name)}</p>
    <p style="margin: 0;"><strong>メール：</strong>${escapeHtml(data.email)}</p>
    ${data.company ? `<p style="margin: 0;"><strong>会社名：</strong>${escapeHtml(data.company)}</p>` : ''}
    <p style="margin: 8px 0 0;"><strong>相談内容：</strong></p>
    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
  `);

  return sendEmail({ to: adminEmail, subject: `[HITORIMO 管理] 新しい予約（${when}）`, html });
}

// 前日（または当日朝）のリマインド（お客様へ）
export async function sendReminderEmail(data: BookingEmailData, dayLabel: '明日' | '本日') {
  const when = formatJstRange(data.startTime, data.endTime);
  const canStillCancel = data.startTime.getTime() - Date.now() >= LEAD_MS;

  const html = layout(`
    <h2 style="margin: 0 0 16px;">${dayLabel}は初回相談の日です</h2>
    <p>${escapeHtml(data.name)} 様</p>
    <p>ご予約いただいている初回相談は、${dayLabel}です。お会いできるのを楽しみにしています。</p>
    <p style="margin: 16px 0 0;"><strong>日時：</strong>${when}</p>
    ${meetingBlock()}
    ${canStillCancel ? cancelBlock(data.cancelToken, data.startTime) : ''}
  `);

  return sendEmail({ to: data.email, subject: `[HITORIMO] ${dayLabel}の初回相談のご案内（${when}）`, html });
}

// キャンセル受付（お客様へ）と、キャンセル通知（管理者へ）
export async function sendCancellationEmails(data: BookingEmailData, adminEmail: string | undefined) {
  const when = formatJstRange(data.startTime, data.endTime);

  const customer = sendEmail({
    to: data.email,
    subject: `[HITORIMO] ご予約のキャンセルを承りました（${when}）`,
    html: layout(`
      <h2 style="margin: 0 0 16px;">キャンセルを承りました</h2>
      <p>${escapeHtml(data.name)} 様</p>
      <p>次のご予約のキャンセルを承りました。またご都合のよいときに、いつでもお声がけください。</p>
      <p style="margin: 16px 0 0;"><strong>日時：</strong>${when}</p>
    `),
  });

  const admin = adminEmail
    ? sendEmail({
        to: adminEmail,
        subject: `[HITORIMO 管理] 予約がキャンセルされました（${when}）`,
        html: layout(`
          <h2 style="margin: 0 0 16px;">予約がキャンセルされました</h2>
          <p style="margin: 0;"><strong>日時：</strong>${when}</p>
          <p style="margin: 0;"><strong>名前：</strong>${escapeHtml(data.name)}</p>
          <p style="margin: 0;"><strong>メール：</strong>${escapeHtml(data.email)}</p>
          <p style="margin: 8px 0 0;">この枠は、予約ページで再び「空き」として表示されています。</p>
        `),
      })
    : Promise.resolve();

  return Promise.all([customer, admin]);
}
