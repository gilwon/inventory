// 루트 레이아웃 (한국어 문서 설정)
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "재고 관리",
  description: "품목과 위치별 재고를 관리하는 웹앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
