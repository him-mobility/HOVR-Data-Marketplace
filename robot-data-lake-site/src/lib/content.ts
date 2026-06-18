// Content SSOT for customer-facing surfaces. Derived from the data schema.
// CLIENT-SAFE: no node imports. All copy here is customer-facing Korean.
// NOTE: case-study consts (PROOF/PRINCIPLES/WORKFLOW/LESSON/CHECKLIST/DIALOGUE)
// are defined here but MUST NOT be rendered on / and stay out of customer Q&A scope.

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
  lead: "로봇이 도시를 주행하며 남긴 기록을 네 갈래로 정리해 제공합니다. 위치를 기준으로 현장 상황·도로 이벤트·사진이 한 줄로 연결되어, 원하는 지역과 기간만 고르면 바로 살펴보고 받아볼 수 있습니다.",
  datasets: [
    {
      code: "A",
      name: "위치 기록",
      desc: "로봇이 언제 어느 도로를 지났는지를 담은 기준 데이터. 모든 관측·이벤트·사진이 이 위치에 연결됩니다.",
      unit: "약 98,043건",
    },
    {
      code: "B",
      name: "현장 관측",
      desc: "각 위치에서 본 도로 상황(차량·보행자 수, 차선·혼잡도, 날씨·노면·시야)을 기록한 데이터.",
      unit: "약 98,043건",
    },
    {
      code: "C",
      name: "도로 이벤트",
      desc: "포트홀·불법주정차·사고·침수 등 7종의 도로 이벤트를 발생 위치·시각과 함께 정리한 데이터.",
      unit: "7종 / 약 98,043",
    },
    {
      code: "D",
      name: "현장 사진·영상",
      desc: "이벤트 현장의 썸네일·짧은 클립·실시간 스트림 등 시각 자료. 전체 기록의 약 34%에 연결됩니다.",
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
      features: [
        "전국 표본 데이터 미리보기",
        "자연어로 지도·차트 탐색",
        "최근 30일 현황 확인",
      ],
      cta: "표본 데이터 둘러보기",
      href: "/demo",
      highlight: false,
    },
    {
      name: "서비스 구독",
      price: "$100",
      period: "/월 · 부가세 별도",
      features: [
        "전 지역·전 항목 데이터 열람",
        "지역·기간 맞춤 다운로드",
        "매월 갱신 데이터 자동 반영",
        "이메일 우선 지원",
      ],
      cta: "구독 문의",
      href: "mailto:sales@him-ai.com?subject=HOVR%20서비스%20구독%20문의",
      highlight: true,
    },
    {
      name: "맞춤·대량",
      price: "맞춤 견적",
      period: "",
      features: [
        "원하는 지역·항목만 선별 제공",
        "대량·정기 납품 및 연동",
        "데이터 형식·주기 맞춤 설계",
      ],
      cta: "맞춤 견적 문의",
      href: "mailto:sales@him-ai.com?subject=HOVR%20맞춤·대량%20데이터%20문의",
      highlight: false,
    },
  ],
  note: "표시 가격은 부가세 별도입니다. 맞춤·대량 도입은 데이터 범위와 주기에 따라 견적을 안내해 드립니다.",
};

export const LINEAGE = [
  {
    code: "A",
    name: "위치 기록",
    role: "기준 데이터",
    cols: "robot · road · ts · lat/lng",
    rel: "→ B/C/D 연결 기준",
  },
  {
    code: "B",
    name: "현장 관측",
    role: "도로 상황",
    cols: "object · lane · traffic · weather",
    rel: "위치 1건당 1관측",
  },
  {
    code: "C",
    name: "도로 이벤트",
    role: "이벤트 7종",
    cols: "event_type · ts",
    rel: "위치에 이벤트 부착",
  },
  {
    code: "D",
    name: "사진·영상",
    role: "시각 자료",
    cols: "thumbnail · clip · stream",
    rel: "이벤트·위치에 연결",
  },
];

export const EVENTS = EVENT_TYPES.map((e) => ({
  label: e.label,
  slug: e.slug,
  count: e.count,
  color: e.color,
  pct: Math.round((e.count / TOTAL) * 1000) / 10,
}));

// ────────────────────────────────────────────────────────────────────────
// Case-study consts — defined but NOT rendered on / and OUT of customer Q&A
// scope (see 06단계). Internal/author-facing narrative only.
// ────────────────────────────────────────────────────────────────────────

export const PROOF = {
  eyebrow: "검증",
  title: "왜 자연어 탐색인가",
  points: [
    "현장 담당자는 SQL을 모른다. 그래도 데이터를 봐야 한다.",
    "질문을 그대로 입력하면 지도·차트가 함께 움직인다.",
    "결과는 미리 보고, 필요한 범위만 받아 간다.",
  ],
};

export const PRINCIPLES = [
  { title: "고객이 쓰는 말로", body: "도구·테이블 이름이 아니라 고객의 질문으로 화면을 조작한다." },
  { title: "보이는 대로 받는다", body: "미리 본 화면과 받아 가는 데이터가 일치한다." },
  { title: "키 없이도 동작", body: "AI 키가 없어도 결정적 폴백으로 결과를 보장한다." },
];

export const WORKFLOW = [
  { step: "1", title: "질문", body: "원하는 지역·기간·상황을 자연어로 입력한다." },
  { step: "2", title: "탐색", body: "지도·차트·표가 질문에 맞춰 함께 갱신된다." },
  { step: "3", title: "확인", body: "관련 데이터를 미리 보고 범위를 좁힌다." },
  { step: "4", title: "수령", body: "선택한 범위만 바로 받아 간다." },
];

export const LESSON = {
  title: "재현에서 배운 것",
  body: "결정적 생성(mulberry32)과 좌표 정합이 신뢰의 출발점이다. 화면에 닿기 전 내부 흔적을 지우는 것이 제품의 위생이다.",
};

export const CHECKLIST = [
  "히어로 4지표가 고객 카피로 표시된다",
  "지도가 전국에 분포하고 이탈 점이 없다",
  "AI 답변에 내부 용어가 노출되지 않는다",
  "지역 선택이 추천·딥링크로 이어진다",
];

export const DIALOGUE = [
  { who: "고객", text: "부산에서 최근에 침수 있었던 곳 보여줘." },
  { who: "HOVI", text: "관련 데이터를 살펴보는 중이에요. 부산 지역의 최근 침수 기록을 지도와 함께 보여드릴게요." },
];
