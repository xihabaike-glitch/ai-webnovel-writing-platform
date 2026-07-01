import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 网文写作平台",
  description: "面向网文作者的 AI 写作生产工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

