// 웹 앱 매니페스트 (홈 화면 설치용)
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "재고 관리",
    short_name: "재고",
    description: "품목과 위치별 재고를 관리하는 웹앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "ko",
    orientation: "portrait",
    // 라이트 토큰 --ux-page 값. 스플래시와 상단 바가 앱 배경과 같은 색이 되도록 한다.
    background_color: "#F4F2EE",
    theme_color: "#F4F2EE",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
