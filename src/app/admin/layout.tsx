import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HITORIMO 予約枠の管理',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
