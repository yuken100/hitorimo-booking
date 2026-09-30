import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お問い合わせ | HITORIMO',
  description: 'HITORIMO へのお問い合わせ・ご相談はこちらから。内容を確認のうえ、あらためてご連絡します。',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
