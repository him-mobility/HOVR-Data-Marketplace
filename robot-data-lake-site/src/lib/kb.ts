// HOVR Q&A knowledge base. CLIENT-SAFE: no node imports (imported by route + tests).
//
// CUSTOMER SCOPE (global invariant #2 — customer-exposure hygiene):
// CHUNKS holds both customer-facing and internal (case-study) knowledge, but the
// customer chatbot path ONLY ever sees CUSTOMER_CHUNKS / CUSTOMER_GOLDEN. Internal
// chunks (PRNG bug, agent/SQL design, infra/deploy, "values are mostly synthetic",
// collaboration principles, design/map journey) are filtered out by INTERNAL_IDS so
// they can never surface as retrieval evidence or as a golden answer/source.

export type Chunk = { id: string; title: string; text: string };

export const CHUNKS: Chunk[] = [
  // ── customer chunks ──────────────────────────────────────────────────────
  {
    id: "overview",
    title: "개요",
    text: "HOVR는 HIM이 운영하는 로봇 데이터 마켓플레이스입니다. 도시를 주행하는 로봇이 직접 수집한 약 98,043건의 현장 데이터(위치·현장 상황·도로 이벤트·사진)를 구독과 맞춤 형태로 제공합니다. 전문 지식이 없어도 화면에서 자연어로 물어보면 원하는 지역과 기간을 골라 미리 보고 바로 받아볼 수 있습니다.",
  },
  {
    id: "purpose",
    title: "목적·셀링포인트",
    text: "현장 담당자는 SQL을 몰라도 데이터를 봐야 합니다. HOVR는 질문을 그대로 입력하면 지도와 차트가 함께 움직이고, 미리 본 그대로의 범위만 받아 갈 수 있게 합니다. 위치를 기준으로 현장 상황·도로 이벤트·사진이 한 줄로 연결되어, 도로 안전·도시 운영·연구에 바로 쓸 수 있는 형태로 제공합니다.",
  },
  {
    id: "scale",
    title: "데이터 규모·이벤트 분포",
    text: "전체 보유 데이터는 약 98,043건이며 매월 갱신됩니다. 도로 이벤트는 불법주정차(약 29,841건)가 가장 많고, 포트홀(약 22,487건), 정차차량(약 14,722건), 공사(약 12,017건), 인파밀집(약 11,038건), 침수(약 6,961건), 사고(약 777건) 순으로 분포합니다.",
  },
  {
    id: "data-model",
    title: "4테이블 구조",
    text: "데이터는 네 갈래로 정리됩니다. 위치 기록은 로봇이 언제 어느 도로를 지났는지를 담은 기준 데이터입니다. 현장 관측은 각 위치에서 본 차량·보행자 수, 차선·혼잡도, 날씨·노면·시야를 기록합니다. 도로 이벤트는 포트홀·사고·침수 등 7종을 발생 위치·시각과 함께 정리합니다. 사진·영상은 현장의 썸네일·짧은 클립·실시간 스트림으로 전체의 약 34%에 연결됩니다.",
  },
  {
    id: "insight",
    title: "데이터 인사이트",
    text: "날씨별 사고 비율을 비교하면 비가 오는 날의 사고 비중이 맑은 날보다 약 1.8배 높게 나타납니다. 노면이 젖은 구간에서 위험이 커지며, 수집량은 통행이 많은 낮 시간대에 가장 높고 심야에 낮아집니다. 포트홀과 불법주정차는 간선도로에 집중되는 경향이 뚜렷합니다.",
  },
  {
    id: "coverage",
    title: "수집 지역",
    text: "데이터는 전국에 걸쳐 분포합니다. 광주, 수도권(서울·경기·인천), 부산, 대구, 대전, 울산, 세종 등 주요 도시에서 로봇이 수집하며, 지역을 좁혀 보면 해당 권역의 도로 상황을 자세히 확인할 수 있습니다.",
  },
  {
    id: "detection",
    title: "감지 도로상황 7종",
    text: "로봇이 감지하는 도로 상황은 불법주정차, 포트홀, 정차차량, 공사, 인파밀집, 침수, 사고의 7종입니다. 각 이벤트는 발생한 위치와 시각, 그리고 현장 사진과 함께 기록됩니다.",
  },
  {
    id: "access",
    title: "데이터 구매·이용",
    text: "무료 체험에서는 전국 표본 데이터를 미리 보고 자연어로 지도·차트를 탐색할 수 있습니다. 월 구독(월 $100, 부가세 별도)은 전 지역·전 항목 열람과 지역·기간 맞춤 다운로드, 매월 갱신 자동 반영을 제공합니다. 원하는 지역·항목만 선별하거나 대량·정기 납품이 필요하면 맞춤 견적으로 안내해 드립니다. 문의는 sales@him-ai.com 으로 받습니다.",
  },
  {
    id: "freshness",
    title: "갱신 주기",
    text: "데이터는 매월 갱신됩니다. 구독 중이면 갱신된 데이터가 자동으로 반영되어 최근 현황을 이어서 확인할 수 있습니다.",
  },

  // ── internal chunks (NEVER customer-facing) ──────────────────────────────
  {
    id: "principles",
    title: "협업 6원칙",
    text: "내부 협업 원칙: 고객이 쓰는 말로 화면을 조작한다, 보이는 대로 받는다, 키 없이도 동작한다, 결정적으로 재현한다, 내부 흔적을 화면에 닿기 전에 지운다, 작은 단위로 자주 커밋한다.",
  },
  {
    id: "lesson",
    title: "최대 교훈 — PRNG 정밀도 버그",
    text: "초기에 LCG(seed*1103515245)를 쓰자 JS 정수정밀도(2^53)를 넘겨 유니크 좌표가 741개로 붕괴했다. mulberry32(Math.imul 기반, 시드 42)로 교체하고 유니크 좌표 95,000개 초과를 테스트로 강제했다.",
  },
  {
    id: "agent",
    title: "AI Agent 설계",
    text: "HOVI 에이전트는 자연어 질문을 도구 호출로 바꿔 데이터로 답한다. 도구로는 search_records, focus_dashboard, run_readonly_sql(SELECT 전용) 등을 두고, raw 트레이스·SQL·도구명·테이블/컬럼명은 화면에 노출하지 않는다.",
  },
  {
    id: "design",
    title: "디자인 진화",
    text: "디자인은 HIM 브랜드(네이비·퍼플·블루·틸)를 기반으로 마켓플레이스 홈과 다크 운영 콘솔 두 톤으로 진화했다. 내부 디자인 의사결정 기록.",
  },
  {
    id: "map",
    title: "지도 렌더링 여정",
    text: "MapLibre 렌더링에서 paint 색은 hex/rgb만 허용되고 oklch는 거부된다. 좌표는 지역 중심 반경 박스(약 1.8km) 안에서만 생성해 바다·산·타지역 이탈을 0으로 맞췄다.",
  },
  {
    id: "deploy",
    title: "배포",
    text: "배포 인프라는 S3·Terraform 등으로 구성한다. 내부 운영 문서이며 고객 화면과는 무관하다.",
  },
  {
    id: "honesty",
    title: "데이터 정직성",
    text: "내부 메모: 표시 수치와 좌표는 대부분 합성(synthetic) 데이터로 생성되었다. 이 사실은 고객 화면에 노출하지 않는다.",
  },
];

// Customer scope (core) — see file header.
const INTERNAL_IDS = new Set(["principles", "lesson", "agent", "design", "map", "deploy", "honesty"]);
export const CUSTOMER_CHUNKS: Chunk[] = CHUNKS.filter((c) => !INTERNAL_IDS.has(c.id));
const CUSTOMER_TITLES = new Set(CUSTOMER_CHUNKS.map((c) => c.title));

// Per-chunk retrieval keywords (weighted ×3). Customer + internal; only customer
// ids are ever scored because retrieve() iterates CUSTOMER_CHUNKS.
const KEYWORDS: Record<string, string[]> = {
  overview: ["HOVR", "소개", "무엇", "마켓플레이스", "서비스"],
  purpose: ["왜", "목적", "장점", "자연어", "SQL", "이유"],
  scale: ["규모", "몇 건", "건수", "분포", "이벤트", "얼마나"],
  "data-model": ["구성", "테이블", "구조", "종류", "위치", "관측", "이벤트", "사진"],
  insight: ["사고", "우천", "비", "날씨", "인사이트", "1.8", "노면", "시간대"],
  coverage: ["지역", "도시", "어디", "부산", "수도권", "광주", "전국", "권역"],
  detection: ["감지", "도로 상황", "이벤트", "종류", "포트홀", "침수", "7종"],
  access: ["구매", "이용", "구독", "가격", "요금", "다운로드", "어떻게"],
  freshness: ["갱신", "주기", "업데이트", "최신", "자주", "얼마나 자주"],
};

export type Golden = { q: string; a: string; sources: string[]; keywords: string[] };

// ~19 golden Q&A. Internal questions (PRNG/deploy/synthetic/agent/principles) are
// present but get filtered out of CUSTOMER_GOLDEN because their sources are internal.
export const GOLDEN: Golden[] = [
  // ── customer golden (sources ∈ CUSTOMER_TITLES) ──────────────────────────
  {
    q: "HOVR는 어떤 서비스인가요?",
    a: "HOVR는 HIM이 운영하는 로봇 데이터 마켓플레이스입니다. 도시를 주행한 로봇이 직접 수집한 약 98,043건의 현장 데이터(위치·현장 상황·도로 이벤트·사진)를 구독과 맞춤으로 제공하며, 화면에서 자연어로 물어보면 원하는 지역·기간을 골라 미리 보고 바로 받아볼 수 있습니다.",
    sources: ["개요"],
    keywords: ["마켓플레이스", "로봇", "98,043"],
  },
  {
    q: "왜 SQL 대신 자연어로 탐색하나요?",
    a: "현장 담당자는 SQL을 몰라도 데이터를 봐야 하기 때문입니다. 질문을 그대로 입력하면 지도와 차트가 함께 움직이고, 미리 본 그대로의 범위만 받아 갈 수 있습니다.",
    sources: ["목적·셀링포인트"],
    keywords: ["자연어", "SQL", "지도"],
  },
  {
    q: "데이터는 모두 몇 건인가요?",
    a: "전체 보유 데이터는 약 98,043건이며 매월 갱신됩니다. 도로 이벤트는 불법주정차가 가장 많고 포트홀·정차차량·공사·인파밀집·침수·사고 순으로 분포합니다.",
    sources: ["데이터 규모·이벤트 분포"],
    keywords: ["98,043", "불법주정차", "분포"],
  },
  {
    q: "데이터는 어떻게 구성되어 있나요?",
    a: "위치 기록(기준 데이터), 현장 관측(차량·보행자·차선·날씨·노면), 도로 이벤트(7종), 사진·영상의 네 갈래로 구성됩니다. 위치를 기준으로 관측·이벤트·사진이 한 줄로 연결됩니다.",
    sources: ["4테이블 구조"],
    keywords: ["위치", "관측", "이벤트", "사진"],
  },
  {
    q: "우천 시 사고가 늘어나나요?",
    a: "네. 날씨별 사고 비율을 비교하면 비가 오는 날의 사고 비중이 맑은 날보다 약 1.8배 높게 나타납니다. 노면이 젖은 구간에서 위험이 커집니다.",
    sources: ["데이터 인사이트"],
    keywords: ["1.8", "비", "사고"],
  },
  {
    q: "어떤 지역의 데이터를 보유하고 있나요?",
    a: "데이터는 전국에 걸쳐 분포합니다. 광주, 수도권(서울·경기·인천), 부산, 대구, 대전, 울산, 세종 등 주요 도시에서 수집하며, 지도에서 지역을 좁혀 권역별 상황을 확인할 수 있습니다.",
    sources: ["수집 지역"],
    keywords: ["전국", "부산", "수도권"],
  },
  {
    q: "어떤 도로 상황을 감지하나요?",
    a: "불법주정차, 포트홀, 정차차량, 공사, 인파밀집, 침수, 사고의 7종 도로 상황을 감지합니다. 각 이벤트는 발생 위치·시각과 현장 사진과 함께 기록됩니다.",
    sources: ["감지 도로상황 7종"],
    keywords: ["7종", "포트홀", "침수"],
  },
  {
    q: "데이터는 어떻게 구매하나요?",
    a: "무료 체험으로 전국 표본을 먼저 보고, 월 구독(월 $100, 부가세 별도)으로 전 지역·전 항목 열람과 지역·기간 맞춤 다운로드를 이용할 수 있습니다. 대량·정기 납품은 맞춤 견적으로 안내하며 문의는 sales@him-ai.com 으로 받습니다.",
    sources: ["데이터 구매·이용"],
    keywords: ["구독", "$100", "견적"],
  },
  {
    q: "데이터는 얼마나 자주 갱신되나요?",
    a: "데이터는 매월 갱신됩니다. 구독 중이면 갱신된 데이터가 자동으로 반영되어 최근 현황을 이어서 확인할 수 있습니다.",
    sources: ["갱신 주기"],
    keywords: ["매월", "갱신", "자동"],
  },

  // ── internal golden (sources ∈ internal titles → excluded from CUSTOMER) ──
  {
    q: "데이터가 합성인가요?",
    a: "표시 수치와 좌표는 대부분 합성 데이터로 생성되었습니다.",
    sources: ["데이터 정직성"],
    keywords: ["합성"],
  },
  {
    q: "PRNG 버그가 뭐였나요?",
    a: "LCG가 JS 정수정밀도를 넘겨 유니크 좌표가 741개로 붕괴했고, mulberry32(시드 42)로 교체했습니다.",
    sources: ["최대 교훈 — PRNG 정밀도 버그"],
    keywords: ["mulberry32", "741"],
  },
  {
    q: "어디에 배포했나요?",
    a: "배포 인프라는 S3·Terraform 등으로 구성합니다.",
    sources: ["배포"],
    keywords: ["Terraform", "S3"],
  },
  {
    q: "AI 에이전트는 어떻게 설계했나요?",
    a: "HOVI는 자연어를 search_records·run_readonly_sql 등 도구 호출로 바꿔 답합니다.",
    sources: ["AI Agent 설계"],
    keywords: ["search_records", "도구"],
  },
  {
    q: "협업 원칙은 무엇인가요?",
    a: "고객이 쓰는 말로, 보이는 대로 받는다, 키 없이도 동작 등 6원칙을 따릅니다.",
    sources: ["협업 6원칙"],
    keywords: ["원칙"],
  },
  {
    q: "지도는 어떻게 렌더링했나요?",
    a: "MapLibre paint 색은 hex/rgb만 쓰고 좌표는 반경 박스 안에서만 생성했습니다.",
    sources: ["지도 렌더링 여정"],
    keywords: ["MapLibre", "hex"],
  },
  {
    q: "디자인은 어떻게 진화했나요?",
    a: "HIM 브랜드 색을 기반으로 마켓플레이스 홈과 다크 콘솔 두 톤으로 진화했습니다.",
    sources: ["디자인 진화"],
    keywords: ["브랜드"],
  },
  {
    q: "포트홀과 사고는 어디서 함께 보나요?",
    a: "도로 이벤트 7종은 발생 위치·시각과 사진과 함께 기록되어, 위치 기준으로 관측·사진과 한 줄로 연결됩니다.",
    sources: ["감지 도로상황 7종", "4테이블 구조"],
    keywords: ["7종", "위치"],
  },
  {
    q: "데이터 품질은 어떻게 보장하나요?",
    a: "결정적 생성과 좌표 정합으로 재현 가능하게 만들고, 화면에 닿기 전 내부 흔적을 지웁니다.",
    sources: ["데이터 정직성", "최대 교훈 — PRNG 정밀도 버그"],
    keywords: ["정합"],
  },
  {
    q: "수집량이 가장 많은 시간대는 언제인가요?",
    a: "수집량은 통행이 많은 낮 시간대에 가장 높고 심야에 낮아집니다.",
    sources: ["데이터 인사이트"],
    keywords: ["낮", "시간대"],
  },
];

export const CUSTOMER_GOLDEN = GOLDEN.filter(
  (g) => g.sources.length > 0 && g.sources.every((s) => CUSTOMER_TITLES.has(s))
);

// Customer-facing suggested questions (chips).
export const SUGGESTED = [
  "어떤 지역의 데이터를 보유하고 있나요?",
  "어떤 도로 상황을 감지하나요?",
  "데이터는 어떻게 구매하나요?",
  "데이터는 얼마나 자주 갱신되나요?",
  "우천 시 사고가 늘어나나요?",
];

// ── retrieval (customer scope only) ─────────────────────────────────────────

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^0-9a-z가-힣.]+/i)
    .filter((t) => t.length > 1);
}

function scoreChunk(c: Chunk, qTokens: string[]): number {
  let score = 0;
  const kws = (KEYWORDS[c.id] ?? []).map((k) => k.toLowerCase());
  const titleTokens = tokens(c.title);
  const bodyTokens = new Set(tokens(c.text));
  for (const qt of qTokens) {
    if (kws.some((k) => k.includes(qt) || qt.includes(k))) score += 3;
    if (titleTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 2;
    if (bodyTokens.has(qt)) score += 1;
  }
  return score;
}

export function retrieve(query: string, k = 3): Chunk[] {
  const qTokens = tokens(query);
  const ranked = CUSTOMER_CHUNKS
    .map((c) => ({ c, s: scoreChunk(c, qTokens) }))
    .sort((a, b) => b.s - a.s);
  const hits = ranked.filter((r) => r.s > 0).slice(0, k).map((r) => r.c);
  if (hits.length > 0) return hits;
  return CUSTOMER_CHUNKS.slice(0, k);
}

// ── golden answering (customer scope only) ──────────────────────────────────

export type GoldenAnswer = { answer: string; sources: string[]; grounded: boolean };

function scoreGolden(g: Golden, qTokens: string[]): number {
  let score = 0;
  const kws = g.keywords.map((k) => k.toLowerCase());
  const qTok = new Set(tokens(g.q));
  for (const qt of qTokens) {
    if (kws.some((k) => k.includes(qt) || qt.includes(k))) score += 2;
    if (qTok.has(qt)) score += 1;
  }
  return score;
}

export function answerFromGolden(query: string): GoldenAnswer {
  const qTokens = tokens(query);
  let bestIdx = -1;
  let best = 0;
  for (let i = 0; i < CUSTOMER_GOLDEN.length; i++) {
    const s = scoreGolden(CUSTOMER_GOLDEN[i]!, qTokens);
    if (s > best) {
      best = s;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) {
    return {
      answer:
        "제가 안내할 수 있는 범위 밖이라 확인되지 않습니다. 대신 보유 지역이나 데이터 구매 방법 같은 주제는 안내해 드릴 수 있어요.",
      sources: [],
      grounded: false,
    };
  }
  const g = CUSTOMER_GOLDEN[bestIdx]!;
  return { answer: g.a, sources: g.sources, grounded: false };
}
