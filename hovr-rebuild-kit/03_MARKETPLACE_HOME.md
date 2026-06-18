# 03 · MARKETPLACE HOME — content.ts SSOT · `/` 섹션

> 목표: 콘텐츠 SSOT(`src/lib/content.ts`)와 홈 `/`(히어로·상품·구성·요금)를 구현. 모두 고객 대상 카피. 케이스스터디 섹션은 홈에 렌더하지 않는다.

## A. `src/lib/content.ts` (스키마에서 파생, 핵심 값 그대로)

```ts
import { EVENT_TYPES, TOTAL, DISPLAY_TOTAL, REGIONS, METRO_REGIONS } from "./schema";
export { DISPLAY_TOTAL };

export const SITE = { brand:"HIM", title:"HOVR", tagline:"데이터를 SQL이 아니라 자연어로 탐색하다",
  demoUrl:"/demo", liveUrl:"https://demo.him-ai.com", author:"Han Sanghoon", date:"2026-06-16" };

export const NAV = [
  { href:"/#data", label:"데이터 상품" },
  { href:"/#lineage", label:"데이터 구성" },
  { href:"/#pricing", label:"요금" },
  { href:"/search", label:"맞춤형 데이터" },   // ← SiteHeader가 틸 강조 필로 렌더
];

export const HERO = {
  eyebrow:"HOVR · 로봇이 모은 도시 현장 데이터 by HIM",
  headline:"도시를 달린 로봇이 모은 데이터, 지금 받아보고 바로 살펴보세요",
  sub:"전국 주요 도시(광주·수도권·부산·대구·대전 등)에서 로봇이 직접 수집한 약 9.8만 건의 현장 데이터(위치·현장 상황·이벤트·사진)를 구독·맞춤으로 제공합니다. 전문 지식이 없어도 화면에서 자연어로 물어보면 원하는 지역·기간을 골라 미리 보고 바로 받아볼 수 있습니다.",
  ctaPrimary:{ label:"나만의 맞춤형 데이터", href:"/search" },
  ctaSecondary:{ label:"요금 보기", href:"/#pricing" },
  stats:[
    { value: DISPLAY_TOTAL.toLocaleString("en-US"), label:"보유 데이터(건) · 매월 갱신" },
    { value:"위치·관측·이벤트·영상", label:"데이터 종류" },
    { value:"포트홀·사고·침수 등", label:"수집 항목" },
    { value:`수도권 외 ${REGIONS.length + METRO_REGIONS.length}개 지역`, label:"수집 지역" }, // 21개 지역
  ],
};
```
> 히어로 4지표 규칙(고객 요구): ①보유 건수 + "매월 갱신" ②종류는 개수 아닌 **항목 나열** ③수집 항목도 항목 나열 ④지역은 **"수도권 외 N개 지역"**(N = 광주 16권역 + 광역시 5 = 21, 스키마에서 계산).

- **`SALES`** `{eyebrow:"데이터 상품", title:"지금 받아볼 수 있는 데이터", lead, datasets[]}` — datasets 4종(A 위치 기록 / B 현장 관측 / C 도로 이벤트(7종) / D 현장 사진·영상 ~34%), 각 `{code,name,desc,unit}`. unit 예: A/B "약 98,043건", C "7종 / 약 98,043", D "약 33,000건".
- **`PRICING`** `{eyebrow:"요금", title:"필요한 만큼만, 간편하게", plans[3], note}` — plans: 무료 체험(무료, highlight:false) / 서비스 구독($100/월·부가세별도, highlight:true) / 맞춤·대량(맞춤 견적, false). 각 `{name,price,period,features[],cta,href,highlight}`. 구독/맞춤 CTA는 `mailto:sales@him-ai.com?subject=...`.
- **`LINEAGE`** [4]: A 위치 기록(기준 데이터) / B 현장 관측 / C 도로 이벤트 / D 사진·영상. 각 `{code,name,role,cols,rel}`.
- **`EVENTS`** = `EVENT_TYPES.map(e=>({label,slug,count,color, pct: round(count/TOTAL*1000)/10}))`.
- (선택·홈 미렌더) 케이스스터디 export: `PROOF, PRINCIPLES, WORKFLOW, LESSON, CHECKLIST, DIALOGUE`. 만들어 두되 `/`에는 렌더하지 않는다(고객 페이지). Q&A에도 노출 금지(06단계 스코프).

## B. `src/app/page.tsx`

```tsx
import { Hero, DataSales, Pricing, Lineage } from "@/components/site/sections";
export default function Home(){ return (<><Hero/><DataSales/><Lineage/><Pricing/></>); }
```
(순서: Hero → DataSales → Lineage → Pricing. 케이스스터디 섹션은 import하지 않는다.)

## C. `src/components/site/sections.tsx` — 섹션 컴포넌트

**Hero** (Section 미사용, 독립 다크 히어로), `HERO` 소비:
- `<section className="on-navy relative overflow-hidden bg-navy text-white">` + `<GraphicMotive tone="light" className="pointer-events-none absolute right-0 top-0 h-80 w-2/3 opacity-[0.12]" />`
- `<div className="container-x relative py-20 md:py-28">`: eyebrow `<p className="eyebrow">{HERO.eyebrow}</p>`; H1 `text-4xl font-bold leading-[1.15] md:text-6xl max-w-4xl text-balance break-keep text-white`; sub `text-lg text-white/80 max-w-2xl`.
- CTA 행 `mt-8 flex flex-wrap items-center gap-3`: 1차 `<Link href={HERO.ctaPrimary.href} className="animate-fadeup inline-flex items-center gap-2 rounded-lg bg-[#2dd4bf] px-6 py-3.5 text-base font-semibold text-[#06121f] shadow-lg hover:bg-[#2dd4bf]/90"><span aria-hidden>✨</span>{label} →</Link>`; 2차 `<a … className="rounded-md border border-white/30 px-5 py-3 font-medium text-white hover:bg-white/10">`.
- **stats 그리드**: `<dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/10 sm:grid-cols-4">`, 각 `<div className="bg-navy p-5"><dt className="text-sm text-white/60">{s.label}</dt><dd className="mono mt-1 text-2xl font-semibold text-white md:text-3xl">{s.value}</dd></div>` (gap-px+bg-white/10 = 헤어라인 구분선).

**DataSales** — `<Section id="data" index="01" eyebrow={SALES.eyebrow} title={SALES.title}>`:
- lead `max-w-3xl text-lg text-ink text-pretty`.
- 카드 그리드 `mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4`, datasets.map: `<div className="rounded-md border border-line bg-surface2 p-6 shadow-card">` → 헤더행(코드뱃지 `mono flex h-7 w-7 items-center justify-center rounded bg-navy text-sm font-semibold text-white` + `<span className="mono text-xs text-him-blue">{d.unit}</span>`) → `<h3 className="mt-3 text-lg">{d.name}</h3>` → `<p className="mt-2 text-[15px] text-muted">{d.desc}</p>`.
- CTA 행: `표본 데이터 둘러보기 →`(`/demo`, `bg-navy text-white`) + `구매 문의`(mailto, `border border-navy/30 text-navy`).

**Lineage** — `<Section id="lineage" index="02" eyebrow="데이터 구성" title="데이터가 이렇게 연결됩니다">`, `LINEAGE/EVENTS/DISPLAY_TOTAL` 소비. `max = Math.max(...EVENTS.map(e=>e.count))`.
- 흐름 그리드 `grid gap-4 lg:grid-cols-4`, LINEAGE.map: 카드(코드뱃지 + `mono text-navy` 이름 + role + `mono text-xs text-muted` cols + `mono text-xs text-him-teal` rel), 마지막 아닌 카드엔 `→` 화살표(`absolute -right-3 top-1/2 hidden lg:block text-line`).
- `<h3 className="mt-12 text-lg">도로 상황별 데이터 양 · 총 {DISPLAY_TOTAL.toLocaleString("en-US")}건</h3>`
- 가로 막대: `<ul className="mt-4 space-y-2.5">`, EVENTS.map: 라벨(`w-24`) + 트랙(`relative h-4 flex-1 rounded-full bg-surface2`) 내부 fill `style={{width:`${e.count/max*100}%`, backgroundColor:e.color}}` + 건수(`mono w-24 text-right`) + pct(`mono w-14 text-right text-muted`).

**Pricing** — `<Section id="pricing" index="03" eyebrow={PRICING.eyebrow} title={PRICING.title}>`:
- `grid gap-5 md:grid-cols-3`, plans.map: 카드 `flex flex-col rounded-lg border p-6 shadow-card`(highlight면 `border-navy bg-navy text-white`, else `border-line bg-surface`); 이름·가격(`mono text-3xl font-bold`+period)·features(각 `<li><span className="text-him-teal">✓</span>{f}</li>`)·CTA(highlight면 `bg-white text-navy`, else `bg-navy text-white`).
- note `mt-6 text-sm text-muted`.

> 색/클래스는 01단계 토큰 규칙을 따른다. 모든 카피는 위 한국어 그대로.
