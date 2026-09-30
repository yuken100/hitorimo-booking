import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HITORIMO コンサルティング予約',
  description: '誰一人として置き去りにしない社会を創る。HITORIMO のコンサルティング予約ページです。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <main className="min-h-screen bg-paper">
          {children}
        </main>
      </body>
    </html>
  );
}
