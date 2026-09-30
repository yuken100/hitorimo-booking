// Resend REST API を直接使用してメール送信
// SDK 依存なし、環境変数：RESEND_API_KEY, EMAIL_FROM

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

// サーバーは UTC で動くため、日本時間を明示する
const formatJstRange = (start: Date, end: Date) => {
  const day = start.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const time = (d: Date) =>
    d.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: 'numeric', minute: '2-digit' });
  return `${day} ${time(start)}〜${time(end)}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function sendEmail({ to, subject, html }: EmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@goodrelationship.net';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

// 予約確認メール
export async function sendBookingConfirmationEmail({
  name,
  email,
  startTime,
  endTime,
  message,
}: {
  name: string;
  email: string;
  startTime: Date;
  endTime: Date;
  message: string;
}) {
  const when = formatJstRange(startTime, endTime);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>HITORIMO コンサルティング予約確認</h2>
      <p>${escapeHtml(name)} 様</p>
      <p>ご予約いただきありがとうございます。</p>
      <hr />
      <h3>予約内容</h3>
      <p><strong>日時：</strong> ${when}</p>
      <p><strong>ご相談内容：</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      <hr />
      <p>近々、担当者よりご連絡させていただきます。</p>
      <p style="color: #666; font-size: 12px;">
        このメールに心当たりがない場合は、お手数ですがご連絡ください。
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: '[HITORIMO] コンサルティング予約確認',
    html,
  });
}

// 管理者通知メール
export async function sendAdminNotificationEmail({
  name,
  email,
  company,
  startTime,
  endTime,
  message,
  adminEmail,
}: {
  name: string;
  email: string;
  company?: string;
  startTime: Date;
  endTime: Date;
  message: string;
  adminEmail: string;
}) {
  const when = formatJstRange(startTime, endTime);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>新しい予約がありました</h2>
      <h3>顧客情報</h3>
      <p><strong>名前：</strong> ${escapeHtml(name)}</p>
      <p><strong>メール：</strong> ${escapeHtml(email)}</p>
      ${company ? `<p><strong>会社名：</strong> ${escapeHtml(company)}</p>` : ''}
      <h3>予約内容</h3>
      <p><strong>日時：</strong> ${when}</p>
      <p><strong>相談内容：</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: '[HITORIMO 管理] 新しい予約通知',
    html,
  });
}
