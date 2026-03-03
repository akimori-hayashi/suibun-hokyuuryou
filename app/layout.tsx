import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '水分補給量計算アプリ',
  description: '体重・運動量・気温から1日に必要な水分補給量を計算します',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
