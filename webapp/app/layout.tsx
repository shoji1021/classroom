import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '時間割アプリ',
  description: '授業変更も見られる時間割アプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
