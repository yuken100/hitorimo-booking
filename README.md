# HITORIMO Booking System

HITORIMO コンサルティング予約システム。Sara Yoga の設計をリファレンスに、シンプルにカスタマイズした Next.js アプリケーション。

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** + PostgreSQL (Neon)
- **Resend** (メール送信)

## プロジェクト構造

```
hitorimo-booking/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── slots/route.ts          # 予約枠取得 API
│   │   │   └── book/route.ts           # 予約確定 API
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # 予約ページ（カレンダー + フォーム）
│   │   └── globals.css
│   ├── components/
│   │   └── BookSlotButton.tsx          # 予約ボタンコンポーネント
│   └── lib/
│       └── email.ts                    # メール送信（Resend）
├── prisma/
│   └── schema.prisma                   # DB スキーマ
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── .env.example
```

## DB スキーマ

### Slot（予約枠）
- id: String
- startTime: DateTime
- endTime: DateTime
- status: String ("OPEN" | "FULL" | "CANCELLED")

### Booking（予約）
- id: String
- slotId: String (外部キー)
- name: String
- email: String
- company: String (Optional)
- message: String
- status: String ("PENDING" | "CONFIRMED" | "CANCELLED")

## セットアップ

### 1. 環境変数設定

`.env.local` を作成（`.env.example` をコピー）:

```bash
cp .env.example .env.local
```

以下の値を設定:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="noreply@goodrelationship.net"
ADMIN_EMAIL="admin@goodrelationship.net"
```

### 2. DB セットアップ

```bash
npm install
npx prisma migrate dev --name init
node prisma/seed.mjs # (optional)
```

### 3. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 使用方法

### 予約枠の作成

`prisma/seed.mjs` でサンプルデータを作成するか、DB 管理画面で直接作成:

```sql
INSERT INTO "Slot" ("id", "startTime", "endTime", "status")
VALUES (
  'slot_1',
  '2026-10-05 10:00:00',
  '2026-10-05 11:00:00',
  'OPEN'
);
```

### API エンドポイント

**GET /api/slots**

指定期間の予約枠を取得

```
GET /api/slots?startDate=2026-10-01&endDate=2026-10-31
```

**POST /api/book**

予約を確定

```json
{
  "slotId": "slot_1",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "company": "●●株式会社",
  "message": "営業人材育成について相談したいです"
}
```

## デプロイ

### Vercel にデプロイ

```bash
vercel deploy
```

環境変数を Vercel ダッシュボードで設定:
- DATABASE_URL
- RESEND_API_KEY
- EMAIL_FROM
- ADMIN_EMAIL

## メール送信

Resend REST API を直接使用（SDK 依存なし）:

- `sendEmail()` - 汎用メール送信
- `sendBookingConfirmationEmail()` - 顧客確認メール
- `sendAdminNotificationEmail()` - 管理者通知メール

## Notes

- 予約確定後、自動的に顧客と管理者にメール送信
- メール送信失敗してもレスポンスは成功（ベストエフォート）
- データベースは Neon (PostgreSQL) 推奨

## ライセンス

HITORIMO
