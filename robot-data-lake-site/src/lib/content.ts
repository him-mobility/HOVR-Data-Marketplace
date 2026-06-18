// Single source of truth for customer-facing copy. Derived from ./schema.
// NOTE: customer hygiene — never surface SQL, tool names, table/column names,
// the synthetic nature of the data, PRNG details, dev process, or infra here.
import { EVENT_TYPES, TOTAL, DISPLAY_TOTAL, REGIONS, METRO_REGIONS } from "./schema";
export { DISPLAY_TOTAL };

export const SITE = {
  brand: "HIM",
  title: "HOVR",
  tagline: "데이터를 SQL이 아니라 자연어로 탐색하다",
  demoUrl: "/demo",
  liveUrl: "https://demo.him-ai.com",
  author: "Han Sanghoon",
  date: "2026-06-16",
};

export const NAV = [
  { href: "/#data", label: "데이터 상품" },
  { href: "/#lineage", label: "데이터 구성" },
  { href: "/#pricing", label: "요금" },
  { href: "/search", label: "맞춤형 데이터" }, // ← SiteHeader가 틸 강조 필로 렌더
];

export const HERO = {
  eyebrow: "HOVR · 로봇이 모은 도시 현장 데이터 by HIM",
  headline: "도시를 달린 로봇이 모은 데이터, 지금 받아보고 바로 살펴보세요",
  sub: "전국 주요 도시(광주·수도권·부산·대구·대전 등)에서 로봇이 직접 수집한 약 9.8만 건의 현장 데이터(위치·현장 상황·이벤트·사진)를 구독·맞춤으로 제공합니다. 전문 지식이 없어도 화면에서 자연어로 물어보면 원하는 지역·기간을 골라 미리 보고 바로 받아볼 수 있습니다.",
  ctaPrimary: { label: "나만의 맞춤형 데이터", href: "/search" },
  ctaSecondary: { label: "요금 보기", href: "/#pricing" },
  stats: [
    { value: DISPLAY_TOTAL.toLocaleString("en-US"), label: "보유 데이터(건) · 매월 갱신" },
    { value: "위치·관측·이벤트·영상", label: "데이터 종류" },
    { value: "포트홀·사고·침수 등", label: "수집 항목" },
    { value: `수도권 외 ${REGIONS.length + METRO_REGIONS.length}개 지역`, label: "수집 지역" }, // 21개 지역
  ],
};

export const SALES = {
  eyebrow: "데이터 상품",
  title: "지금 받아볼 수 있는 데이터",
  lead: "로봇이 도시를 주행하며 모은 현장 데이터를 4가지 형태로 제공합니다. 위치를 기준으로 현장 상황·이벤트·사진이 하나로 연결되어, 원하는 지역과 기간만 골라 바로 받아볼 수 있습니다.",
  datasets: [
    {
      code: "A",
      name: "위치 기록",
      desc: "로봇이 주행한 도로 위 위치와 이동 정보. 모든 데이터를 연결하는 기준이 됩니다.",
      unit: "약 98,043건",
    },
    {
      code: "B",
      name: "현장 관측",
      desc: "각 지점의 도로·교통·날씨 등 현장 상황을 기록한 관측 데이터.",
      unit: "약 98,043건",
    },
    {
      code: "C",
      name: "도로 이벤트",
      desc: "포트홀·불법주정차·침수·사고 등 도로에서 발생한 상황을 7종으로 분류해 제공합니다.",
      unit: "7종 / 약 98,043",
    },
    {
      code: "D",
      name: "현장 사진·영상",
      desc: "현장을 담은 사진과 영상. 개인정보는 가려진 상태로 제공됩니다.",
      unit: "약 33,000건",
    },
  ],
};

export const PRICING = {
  eyebrow: "요금",
  title: "필요한 만큼만, 간편하게",
  plans: [
    {
      name: "무료 체험",
      price: "무료",
      period: "",
      features: ["표본 데이터 둘러보기", "자연어 탐색 체험", "지역·기간 미리보기"],
      cta: "표본 데이터 둘러보기",
      href: "/demo",
      highlight: false,
    },
    {
      name: "서비스 구독",
      price: "$100",
      period: "/월",
      features: [
        "전체 데이터 조회·다운로드",
        "매월 갱신되는 최신 데이터",
        "위치·관측·이벤트·사진 전 종류",
        "자연어 탐색 무제한",
      ],
      cta: "구독 문의",
      href: "mailto:sales@him-ai.com?subject=HOVR%20서비스%20구독%20문의",
      highlight: true,
    },
    {
      name: "맞춤·대량",
      price: "맞춤 견적",
      period: "",
      features: ["원하는 지역·기간 맞춤 추출", "대량 데이터 일괄 제공", "전용 지원 및 연동 상담"],
      cta: "맞춤 견적 문의",
      href: "mailto:sales@him-ai.com?subject=HOVR%20맞춤%C2%B7대량%20데이터%20문의",
      highlight: false,
    },
  ],
  note: "구독 요금은 부가세 별도입니다. 맞춤·대량 데이터는 지역·기간·수량에 따라 견적이 달라집니다.",
};

export const LINEAGE = [
  {
    code: "A",
    name: "위치 기록",
    role: "기준 데이터",
    cols: "위치 · 도로 · 이동 정보",
    rel: "모든 데이터의 기준",
  },
  {
    code: "B",
    name: "현장 관측",
    role: "현장 상황",
    cols: "도로 · 교통 · 날씨",
    rel: "위치 기준 연결",
  },
  {
    code: "C",
    name: "도로 이벤트",
    role: "발생 상황",
    cols: "이벤트 종류 · 시점",
    rel: "위치 기준 연결",
  },
  {
    code: "D",
    name: "사진·영상",
    role: "현장 기록",
    cols: "사진 · 영상",
    rel: "위치·이벤트 연결",
  },
];

export const EVENTS = EVENT_TYPES.map((e) => ({
  label: e.label,
  slug: e.slug,
  count: e.count,
  color: e.color,
  pct: Math.round((e.count / TOTAL) * 1000) / 10,
}));
