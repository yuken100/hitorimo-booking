import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | HITORIMO',
};

const CONTACT_EMAIL = 'info@goodrelationship.net';
const ENACTED_ON = '2020年';
const REVISED_ON = '2026年10月9日';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-10 pt-5 border-t-2 border-ink">
    <h2 className="text-xl font-bold text-ink">{title}</h2>
    <div className="mt-3 space-y-3 text-ink leading-relaxed">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <a href="/" className="text-3xl font-bold text-ink">
        HITORI<span className="bg-accent">MO</span>
      </a>
      <h1 className="mt-6 text-3xl font-bold text-ink">プライバシーポリシー</h1>
      <p className="mt-6 text-ink leading-relaxed">
        HITORIMO（運営者：小宮 直樹。以下「当方」といいます）は、当方のウェブサイトおよびサービスをご利用になる方の個人情報を、次の方針に沿って大切に取り扱います。
      </p>

      <Section title="1. 取得する個人情報">
        <p>ご相談や予約の際に、次の情報をお預かりすることがあります。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>お名前</li>
          <li>メールアドレス</li>
          <li>会社名・役職（任意でご入力いただいた場合）</li>
          <li>ご相談の内容、ご希望の日時</li>
          <li>メールなどでのやりとりの記録</li>
          <li>受講生ページをご利用の方の、お名前、メールアドレス、レッスンの完了状況、最後にログインした日時</li>
          <li>予約時の通信元の情報（IPアドレスを、元に戻せない形に変換したもの）</li>
        </ul>
      </Section>

      <Section title="2. 利用目的">
        <p>お預かりした個人情報は、次の目的の範囲でのみ利用します。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>ご相談・お問い合わせへの返信と、日程の調整のため</li>
          <li>サービスのご提供と、その前後のご連絡（予約の確認、前日のご案内など）のため</li>
          <li>受講生ページへのログイン用リンクの送信と、学習の進み具合の確認、受講中のご案内のため</li>
          <li>いたずらや不正な予約を防ぐため</li>
          <li>サービスの改善や品質向上のための検討（個人が特定されない形で行います）</li>
          <li>法令に基づく対応のため</li>
        </ul>
        <p>上記以外の目的で利用する場合は、あらかじめお知らせし、必要に応じてご同意をいただきます。</p>
      </Section>

      <Section title="3. 第三者への提供">
        <p>法令に基づく場合など、法律で認められた場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。</p>
      </Section>

      <Section title="4. 業務の委託と外部サービス">
        <p>
          ご予約の受付や日程調整、メールの送受信、オンラインでのご相談のために、次の外部サービスを利用しています。これらのサービスには、上記の利用目的に必要な範囲で個人情報が預けられます。サービスによっては、日本国外のサーバーで情報が扱われることがあります。
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>予約受付：当方の予約システム（Vercel Inc. のサーバーと、Neon Inc. のデータベースを利用）</li>
          <li>メールの送信：Resend</li>
          <li>オンライン相談：Zoom（Zoom Communications, Inc.）</li>
        </ul>
        <p>外部サービスを利用する際は、個人情報が適切に扱われるよう配慮します。</p>
      </Section>

      <Section title="5. 安全管理">
        <p>個人情報への不正なアクセス、紛失、漏えいなどを防ぐため、端末やアカウントの管理など、必要かつ適切な対策を行います。</p>
      </Section>

      <Section title="6. 保有期間">
        <p>個人情報は、利用目的に必要な期間だけ保有し、不要になったときは速やかに消去します。</p>
      </Section>

      <Section title="7. 開示・訂正・削除などのご請求">
        <p>
          ご本人から、保有する個人情報の開示、訂正、利用停止、削除のご請求があった場合は、ご本人であることを確認したうえで、法令に従って対応します。下記の窓口までご連絡ください。
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
          <dt className="font-bold">事業者</dt>
          <dd>HITORIMO（運営者：小宮 直樹）</dd>
          <dt className="font-bold">所在地</dt>
          <dd>ご請求があれば、遅滞なくお知らせします</dd>
          <dt className="font-bold">窓口</dt>
          <dd>HITORIMO 個人情報お問い合わせ窓口</dd>
          <dt className="font-bold">メール</dt>
          <dd>{CONTACT_EMAIL}</dd>
        </dl>
      </Section>

      <Section title="8. ウェブサイトの閲覧について">
        <p>
          本サイトは、文字のデザインや画面の動きを表示するために、外部の配信サービス（Google Fonts、cdnjs など）からフォントやプログラムを読み込んでいます。閲覧時には、IPアドレスなどが、これらの提供元に送信されることがあります。
        </p>
        <p>現在、アクセス解析ツールや広告のための追跡は使用していません。今後導入する場合は、この方針にその内容を記載します。</p>
      </Section>

      <Section title="9. 方針の変更">
        <p>この方針は、法令の変更やサービスの変更に合わせて、見直すことがあります。変更した場合は、このページでお知らせします。</p>
      </Section>

      <p className="mt-12 text-sm text-muted">
        制定日：{ENACTED_ON}
        <br />
        最終改定日：{REVISED_ON}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/" className="px-4 py-2 border-2 border-ink rounded font-bold hover:bg-accent">
          トップへ戻る
        </a>
        <a href="/booking" className="px-4 py-2 border-2 border-ink rounded font-bold hover:bg-accent">
          予約ページへ
        </a>
      </div>
    </div>
  );
}
