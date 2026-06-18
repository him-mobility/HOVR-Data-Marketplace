import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "HOVR — 로봇 수집 데이터 마켓플레이스 (by HIM)",
  description:
    "전국 주요 도시에서 로봇이 수집한 약 9.8만 건의 위치·관측·이벤트·미디어 데이터를 구매하고, SQL 없이 자연어로 탐색하세요. HOVR by HIM.",
  metadataBase: new URL("https://demo.him-ai.com"),
  openGraph: {
    title: "HOVR — 로봇 데이터를 사고, 자연어로 탐색하다",
    description:
      "위치·관측·이벤트·미디어 4종 데이터셋. 구독·맞춤으로 제공. AI 에이전트로 바로 탐색. HOVR by HIM.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-surface text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white">본문으로 건너뛰기</a>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
