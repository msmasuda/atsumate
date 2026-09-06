import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "atsumate — 集まりを、ちゃんと楽しむ",
    template: "%s | atsumate",
  },
  description: "集まりの企画、日程調整、参加確認、会計と精算をひとつにまとめるアプリです。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
