import type { Metadata } from 'next';

// 受講生だけのページなので、検索結果には出さない
export const metadata: Metadata = {
  title: '受講生ページ | HITORIMO',
  robots: { index: false, follow: false },
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
