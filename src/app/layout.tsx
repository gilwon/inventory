// 루트 레이아웃 (한국어 문서 설정)
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "재고 관리",
  description: "품목과 위치별 재고를 관리하는 웹앱",
};

// 저장된 라이트·다크 선택을 첫 페인트 전에 적용해 화면이 깜빡이지 않게 한다. 저장값이 없으면 시스템 설정을 따른다.
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
