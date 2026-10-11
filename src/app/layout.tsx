import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "McRemote / 麦麦遥控器",
  description: "给朋友一笔预算，让他们决定你这一顿麦当劳吃什么。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
