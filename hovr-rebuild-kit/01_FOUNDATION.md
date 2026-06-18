# 01 · FOUNDATION — 스캐폴드 · 디자인 시스템 · 셸

> Claude Code에게: 아래 스펙대로 Next.js 14 앱 `robot-data-lake-site`를 만들고 HIM 브랜드 디자인 시스템과 페이지 셸을 구현하라. 값/클래스/SVG는 **그대로** 재현한다(시각 충실도).

## A. 스캐폴드

- `npx`로 Next.js 14.2.35 App Router + TS + Tailwind, `src/` 디렉터리, import alias `@/* → ./src/*`.
- `tsconfig.json`: `strict:true`, `noEmit`, `module/moduleResolution: esnext/bundler`, `jsx:preserve`, `allowJs`, `resolveJsonModule`, `isolatedModules`, `incremental`, plugin `next`, `paths:{ "@/*":["./src/*"] }`.
- `next.config.mjs`: `const nextConfig = {}; export default nextConfig;`
- `postcss.config.mjs`: `export default { plugins: { tailwindcss: {} } };`
- `.eslintrc.json`: extends `["next/core-web-vitals","next/typescript"]`; rules `@typescript-eslint/no-explicit-any: "warn"`, `@typescript-eslint/no-unused-vars: "warn"`, `@next/next/no-page-custom-font: "off"`.
- 의존성: 00_README §1 버전대로.

## B. tailwind.config.ts (verbatim theme.extend)

```ts
colors: {
  navy: { DEFAULT:"#001b5c", 950:"#00102f", 900:"#001b5c", 700:"#0a2f7a", 500:"#1e4aa8", 300:"#6f8fd0" },
  him: { purple:"#6a258a", blue:"#1e95d4", teal:"#00a9a9" },
  ink:"#0f1722", muted:"#5b6573", line:"#e3e8f0", surface:"#ffffff", surface2:"#f5f7fb",
},
fontFamily: { sans:["var(--font-sans)","system-ui","sans-serif"], mono:["var(--font-mono)","ui-monospace","monospace"] },
maxWidth: { container:"1200px" },
boxShadow: { card:"0 1px 2px rgba(0,27,92,.06), 0 8px 24px rgba(0,27,92,.06)" },
borderRadius: { sm:"6px", md:"10px", lg:"16px" },
```
content globs: `./src/{pages,components,app}/**/*.{js,ts,jsx,tsx,mdx}`. plugins: `[]`.

## C. 폰트 — Google Fonts `<link>` (next/font 아님)

`layout.tsx`의 `<head>`에:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />
```
실제 사용 폰트: **Noto Sans KR(sans) + JetBrains Mono(mono)**. (Bricolage/Hanken은 쓰지 않음.)

## D. globals.css (verbatim)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: "Noto Sans KR", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "Noto Sans Mono", monospace;
  --him-navy:#001b5c; --him-purple:#6a258a; --him-blue:#1e95d4; --him-teal:#00a9a9;
  --ink:#0f1722; --muted:#5b6573; --line:#e3e8f0; --surface:#ffffff; --surface-2:#f5f7fb;
}

@layer base {
  html { scroll-behavior: smooth; scroll-padding-top: 84px; }
  body {
    color: var(--ink); background: var(--surface); font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
    line-height: 1.7; word-break: keep-all; overflow-wrap: break-word;
  }
  h1,h2,h3,h4 { letter-spacing:-0.01em; line-height:1.2; color:var(--him-navy); font-weight:700; }
  .on-navy h1, .on-navy h2, .on-navy h3, .on-navy h4 { color:#fff; }
  a { color: var(--him-navy); }
  ::selection { background:#cfe0f5; }
  :focus-visible { outline:2px solid var(--him-blue); outline-offset:2px; border-radius:3px; }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
  .text-pretty { text-wrap: pretty; }
  .mono { font-family: var(--font-mono); font-feature-settings: "tnum" 1; }
  .container-x { width:100%; max-width:1200px; margin-inline:auto; padding-inline:1.25rem; }
  .eyebrow { font-family:var(--font-mono); font-size:0.78rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--him-blue); }
  .hairline { border-color: var(--line); }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration:0.001ms!important; animation-iteration-count:1!important; transition-duration:0.001ms!important; }
}
@keyframes fadeup { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.animate-fadeup { animation: fadeup 0.3s ease-out both; }
```
`.btn`/`.card`/`bg-navy` 같은 커스텀 클래스는 없다. 카드/버튼은 인라인 Tailwind, `bg-navy`는 토큰, `shadow-card`는 boxShadow 토큰, `.on-navy`는 헤딩만 흰색으로.

## E. layout.tsx

- `<html lang="ko">`, `<head>`에 C의 링크.
- `<body className="min-h-screen bg-surface text-ink">`.
- 첫 자식: 스킵링크 `<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white">본문으로 건너뛰기</a>`.
- 그 다음 `<SiteChrome>{children}</SiteChrome>` (유일하게 마운트되는 전역 래퍼).
- metadata:
  - `title`: `HOVR — 로봇 수집 데이터 마켓플레이스 (by HIM)`
  - `description`: `전국 주요 도시에서 로봇이 수집한 약 9.8만 건의 위치·관측·이벤트·미디어 데이터를 구매하고, SQL 없이 자연어로 탐색하세요. HOVR by HIM.`
  - `openGraph`: title `HOVR — 로봇 데이터를 사고, 자연어로 탐색하다`, description `위치·관측·이벤트·미디어 4종 데이터셋. 구독·맞춤으로 제공. AI 에이전트로 바로 탐색. HOVR by HIM.`, `type:"website"`, `locale:"ko_KR"`
  - `metadataBase: new URL("https://demo.him-ai.com")`

## F. SiteChrome.tsx (`"use client"`, `usePathname`)

- `const BARE = ["/demo"];` → 경로가 `/demo`이거나 `/demo/`로 시작하면 **`<main id="main">{children}</main>`만** 렌더(크롬 없음).
- 그 외: 순서대로 `<SiteHeader />`, `<main id="main">{children}</main>`, `<SiteFooter />`, `<ChatWidget />`.

## G. SiteHeader.tsx (`NAV`,`SITE` from `@/lib/content`)

- `<header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">` → `<div className="container-x flex h-16 items-center justify-between gap-4">`
- 좌측 브랜드 링크(`href="/"`, `aria-label={`${SITE.brand} 홈`}`): `<HimWordmark height={22} className="text-navy" />` + `<span className="hidden text-sm font-medium text-muted sm:inline"><span className="font-semibold text-navy">HOVR</span> <span className="text-muted">Data Marketplace</span></span>`
- nav `<nav aria-label="섹션" className="hidden items-center gap-6 lg:flex">`, `NAV.map`:
  - **`n.href === "/search"` → 틸 강조 필**:
    ```tsx
    <a href={n.href} className="inline-flex items-center gap-1 rounded-full bg-him-teal px-3.5 py-1.5 text-sm font-semibold text-navy shadow-sm ring-1 ring-him-teal/30 transition-all hover:bg-him-teal/90 hover:shadow-md">
      <span aria-hidden>✨</span>{n.label}
    </a>
    ```
  - 그 외: `<a href={n.href} className="text-sm text-ink/80 transition-colors hover:text-navy">{n.label}</a>`
- 우측 CTA: `<Link href={SITE.demoUrl} className="inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-700">표본 데이터 둘러보기 →</Link>`

## H. SiteFooter.tsx (`SITE`)

- `<footer className="on-navy relative overflow-hidden bg-navy text-white/80">` + `<GraphicMotive tone="light" className="pointer-events-none absolute right-0 top-0 h-full w-64 opacity-10" />`
- `<div className="container-x relative grid gap-8 py-12 md:grid-cols-2">`
- 좌: 브랜드 행 `<HimWordmark height={24} className="text-white" />` + `HOVR` + `<p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">로봇이 도시를 주행하며 수집한 위치·관측·이벤트·미디어 데이터를 사고팔 수 있는 마켓플레이스. SQL 없이 자연어로 탐색하고 바로 받아보세요.</p>`
- 우(`flex flex-col gap-2 text-sm md:items-end`): 링크 `대시보드 둘러보기`(`SITE.demoUrl`), `요금 보기`(`/#pricing`), `구매 문의`(`mailto:sales@him-ai.com?subject=HOVR%20데이터%20구매%20문의`), 그 아래 `<p className="mt-4 text-white/50">{SITE.title} · by HIM</p>`.

## I. Section.tsx (재사용 섹션 래퍼)

`{ id?, index, eyebrow?, title, dark?, children }`:
```tsx
<section id={id} className={dark ? "on-navy bg-navy text-white/85" : "bg-surface text-ink"}>
  <div className="container-x py-16 md:py-24">
    <header className={`mb-10 border-b pb-5 ${dark ? "border-white/15" : "border-line"}`}>
      <div className="eyebrow">{index}{eyebrow ? ` · ${eyebrow}` : ""}</div>
      <h2 className="mt-2 text-3xl md:text-4xl text-balance">{title}</h2>
    </header>
    {children}
  </div>
</section>
```

## J. 브랜드 SVG

**HimWordmark.tsx** — props `{ className="", height=26, title="HIM" }`:
```tsx
<svg viewBox="168 196 608 134" height={height} role="img" aria-label={title} className={className} fill="currentColor">
  <path transform="matrix(1,0,0,-1,724.2081,199.24161)" d="M0 0-62.572-104.089-125.145 0H-174.231V-126.713H-145.93-145.911V-13.439L-77.732-126.713H-47.413L20.767-13.439V-126.713H20.785 49.087V0Z"/>
  <path transform="matrix(1,0,0,-1,0,540)" d="M241.942 214.045H270.262V261.284H241.942Z"/>
  <path transform="matrix(1,0,0,-1,0,540)" d="M472.092 214.045H500.41203V340.758H472.092Z"/>
  <path transform="matrix(1,0,0,-1,270.2626,199.2417)" d="M0 0H-28.32V-52.825H-99.329V-71.699H-99.078 113.195V-52.825H0Z"/>
  <path transform="matrix(1,0,0,-1,0,540)" d="M390.594 214.045H418.914V340.758H390.594Z"/>
</svg>
```
`fill="currentColor"`이므로 `text-navy`/`text-white`로 색이 바뀐다.

**GraphicMotive.tsx** — props `{ className="", tone="navy"|"light" }` (장식용 데이터바 스트라이프):
```tsx
const bars = [{w:120,o:0.9},{w:64,o:0.55},{w:150,o:0.75},{w:40,o:0.4},{w:96,o:0.6},{w:132,o:0.85},{w:56,o:0.5},{w:108,o:0.7}];
const base = tone === "navy" ? "#6f8fd0" : "#ffffff";
return (
  <svg viewBox="0 0 160 120" className={className} aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
    {bars.map((b,i)=>(<rect key={i} x={160-b.w} y={i*15+2} width={b.w} height={9} rx={1.5} fill={base} opacity={b.o} />))}
  </svg>
);
```

## K. 디자인 토큰 사용 규칙 (시각 일관성)

- 다크 섹션 = `bg-navy`(#001b5c) + `.on-navy` + 본문 `text-white/80~85`.
- 라이트 섹션 = `bg-surface`(#fff) / 카드 `bg-surface2`(#f5f7fb), 보더 `border-line`(#e3e8f0), 그림자 `shadow-card`.
- 액센트: `him-teal` #00a9a9(라이브/CTA), 히어로 1차 CTA만 하드코드 틸 `#2dd4bf`+ink `#06121f`. eyebrow/라벨 액센트 `him-blue` #1e95d4.
- `.mono`(JetBrains Mono + tnum)는 eyebrow·코드뱃지·수치/가격·lineage 컬럼·역할 태그에 사용.

> `HimWordmark`/`GraphicMotive`는 `src/components/brand/`에. `Section`/`SiteChrome`/`SiteHeader`/`SiteFooter`/`ChatWidget`은 `src/components/site/`에. `content.ts`(03단계)·`ChatWidget`(06단계)은 아직 없을 수 있으니 임시 스텁으로 빌드 통과시키고 해당 단계에서 채운다.
