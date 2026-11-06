import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI cooking · 今晚吃什么",
  description: "输入一个念头，拿到 8–10 道能直接下手的健康家常菜。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
