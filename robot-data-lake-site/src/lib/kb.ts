// Knowledge base for the HOVR Q&A widget. CLIENT-SAFE (no node imports).
//
// CUSTOMER HYGIENE (critical): the customer-facing retrieval/answer paths must
// only ever see CUSTOMER_CHUNKS / CUSTOMER_GOLDEN. Internal chunks (PRNG bug,
// deploy infra, "values are mostly synthetic", tool/SQL design, dev process)
// exist here for the internal regression corpus only and are excluded from
// every customer code path by INTERNAL_IDS / CUSTOMER_TITLES filtering. Never
// surface SQL, tool names, table/column names, the synthetic nature of the
// data, PRNG/mulberry32, dev process, or infra (S3/Terraform) to a customer.

export type Chunk = { id: string; title: string; text: string };

// ── Chunks ───────────────────────────────────────────────────────────────────
// Customer chunks first (overview…freshness), then internal chunks.
export const CHUNKS: Chunk[] = [
  // ── Customer-facing ──
  {
    id: "overview",
    title: "개요",
    text: "HOVR는 HIM이 운영하는 로봇 데이터 마켓플레이스입니다. 도시를 주행하는 로봇이 직접 수집한 약 98,043건의 현장 데이터(위치·현장 관측·도로 이벤트·사진/영상)를 구독·맞춤으로 제공합니다. 전문 지식 없이도 화면에서 자연어로 물어보면 원하는 지역과 기간을 골라 미리 보고 바로 받아볼 수 있습니다.",
  },
  {
    id: "purpose",
    title: "목적",
    text: "HOVR의 목적은 도시 현장 데이터를 누구나 쉽게 사고 활용하도록 만드는 것입니다. 위치를 기준으로 현장 상황·이벤트·사진이 하나로 연결되어 있어, 지도와 차트로 바로 살펴보고 필요한 만큼만 구매할 수 있습니다. 데이터를 다루는 전문 도구나 코드 없이 자연어로 탐색하는 것이 핵심 강점입니다.",
  },
  {
    id: "scale",
    title: "데이터 규모",
    text: "보유 데이터는 약 98,043건이며 매월 갱신됩니다. 도로 이벤트는 불법주정차가 가장 많고(약 29,841건), 포트홀(약 22,487건), 정차차량, 공사, 인파밀집, 침수(약 6,961건), 사고(약 777건) 순으로 분포합니다. 사진·영상은 약 33,000건이 함께 제공됩니다.",
  },
  {
    id: "data-model",
    title: "데이터 구성",
    text: "데이터는 위치 기록, 현장 관측, 도로 이벤트, 사진·영상의 네 가지 형태로 제공됩니다. 위치 기록이 기준이 되어 같은 지점의 현장 관측(도로·교통·날씨), 발생한 도로 이벤트, 현장 사진·영상이 하나로 연결됩니다. 원하는 지역과 기간만 골라 연결된 데이터를 한 번에 받아볼 수 있습니다.",
  },
  {
    id: "insight",
    title: "데이터 인사이트",
    text: "수집된 데이터를 보면 날씨에 따라 사고 양상이 달라집니다. 비가 오는 날의 사고 비중은 맑은 날보다 약 1.8배 높게 나타나며, 노면이 젖은 구간에서 위험이 커집니다. 수집량은 낮 시간대에 가장 많고 출퇴근 시간대를 전후로 늘어나는 패턴이 또렷합니다.",
  },
  {
    id: "coverage",
    title: "수집 지역",
    text: "전국 주요 도시에서 데이터를 수집합니다. 광주 권역이 가장 활발하고, 수도권(서울 강남·여의도·잠실·구로·홍대, 경기 분당·수원·고양, 인천 송도)과 부산·대구·대전·울산·세종 등 광역시를 포함해 전국 권역을 폭넓게 다룹니다. 지역마다 자주 발생하는 도로 상황이 조금씩 다릅니다.",
  },
  {
    id: "detection",
    title: "감지 도로 상황",
    text: "로봇은 도로에서 발생하는 상황을 7종으로 분류해 감지합니다. 불법주정차, 포트홀, 정차차량, 공사, 인파밀집, 침수, 사고입니다. 각 상황은 발생 위치·시점과 함께 기록되며, 관련 사진·영상이 연결되어 현장을 바로 확인할 수 있습니다.",
  },
  {
    id: "access",
    title: "데이터 구매",
    text: "데이터는 세 가지로 이용할 수 있습니다. 무료 체험은 표본 데이터를 둘러보고 자연어 탐색을 체험할 수 있습니다. 서비스 구독은 월 100달러로 전체 데이터 조회·다운로드와 매월 갱신되는 최신 데이터를 제공합니다. 맞춤·대량은 원하는 지역·기간을 맞춤 추출해 견적으로 제공합니다. 구매 문의는 sales@him-ai.com으로 받습니다.",
  },
  {
    id: "freshness",
    title: "갱신 주기",
    text: "데이터는 매월 갱신됩니다. 구독 중에는 매월 추가되는 최신 현장 데이터를 계속 받아볼 수 있고, 맞춤·대량 데이터도 최신 수집분을 기준으로 추출해 제공합니다.",
  },

  // ── Internal (EXCLUDED from every customer path) ──
  {
    id: "principles",
    title: "협업 6원칙",
    text: "프로젝트 협업은 6가지 원칙을 따랐습니다. 단일 진실 공급원, 시각 충실도 우선, 고객 위생, 결정론적 재현, 검증 게이트, 점진적 단계 진행입니다.",
  },
  {
    id: "lesson",
    title: "최대 교훈 — PRNG 정밀도 버그",
    text: "가장 큰 교훈은 PRNG 정밀도 버그였습니다. mulberry32 의사난수 좌표가 부동소수점 정밀도로 인해 중복 붕괴되어 고유 좌표가 무너질 뻔했고, 검증 게이트로 잡아냈습니다.",
  },
  {
    id: "agent",
    title: "AI Agent 설계",
    text: "AI 에이전트는 자연어 질문을 read-only SQL 도구 호출(search_records / run_readonly_sql 등)로 바꿔 데이터로 답하도록 설계했습니다.",
  },
  {
    id: "design",
    title: "디자인 진화",
    text: "디자인 시스템은 HIM 브랜드 토큰(navy/him-teal/him-blue)을 기준으로 여러 차례 진화했습니다.",
  },
  {
    id: "map",
    title: "지도 렌더링 여정",
    text: "지도 렌더링은 MapLibre 기반으로 좌표 클러스터링과 성능 튜닝을 거쳐 완성했습니다.",
  },
  {
    id: "deploy",
    title: "배포",
    text: "배포 인프라는 S3와 Terraform을 사용해 구성했습니다.",
  },
  {
    id: "honesty",
    title: "데이터 정직성",
    text: "내부적으로 이 데이터셋의 값은 대부분 합성(synthetic)으로 생성되었습니다. 외부 로드분 약 200건을 제외한 나머지는 시드 기반으로 생성된 합성 데이터입니다.",
  },
];

// ── Customer scope (the only thing customer paths may read) ───────────────────
const INTERNAL_IDS = new Set([
  "principles",
  "lesson",
  "agent",
  "design",
  "map",
  "deploy",
  "honesty",
]);

export const CUSTOMER_CHUNKS: Chunk[] = CHUNKS.filter((c) => !INTERNAL_IDS.has(c.id));
const CUSTOMER_TITLES = new Set(CUSTOMER_CHUNKS.map((c) => c.title));
export const CUSTOMER_TITLE_LIST: string[] = CUSTOMER_CHUNKS.map((c) => c.title);

// Per-chunk keyword boosts used by retrieve(). Only customer ids are scanned,
// but internal ids are included for completeness.
const KEYWORDS: Record<string, string[]> = {
  overview: ["개요", "HOVR", "마켓플레이스", "소개", "무엇", "뭐"],
  purpose: ["목적", "강점", "셀링", "자연어", "왜", "장점"],
  scale: ["규모", "건수", "몇", "분포", "얼마나", "총", "개수"],
  "data-model": ["구성", "구조", "형태", "종류", "연결", "테이블", "어떻게 이루어"],
  insight: ["인사이트", "사고", "우천", "비", "날씨", "1.8", "시간대", "패턴"],
  coverage: ["지역", "권역", "전국", "도시", "어디", "수도권", "광주", "부산"],
  detection: ["감지", "도로 상황", "7종", "이벤트", "포트홀", "침수", "불법주정차", "상황"],
  access: ["구매", "구독", "이용", "가격", "요금", "얼마", "비용", "어떻게 사", "결제"],
  freshness: ["갱신", "주기", "최신", "얼마나 자주", "업데이트", "언제"],
  // internal (not scanned by customer retrieve)
  principles: ["원칙", "협업"],
  lesson: ["PRNG", "버그", "교훈", "정밀도"],
  agent: ["에이전트", "SQL", "도구"],
  design: ["디자인"],
  map: ["지도", "렌더링"],
  deploy: ["배포", "인프라", "S3", "Terraform"],
  honesty: ["합성", "synthetic", "정직"],
};

// ── Golden Q&A ────────────────────────────────────────────────────────────────
export type Golden = { q: string; a: string; sources: string[]; keywords: string[] };

export const GOLDEN: Golden[] = [
  // ── Customer goldens (sources are all customer titles) ──
  {
    q: "HOVR가 뭐예요?",
    a: "HOVR는 HIM이 운영하는 로봇 데이터 마켓플레이스입니다. 도시를 주행하는 로봇이 직접 수집한 약 98,043건의 현장 데이터를 구독·맞춤으로 제공하며, 전문 지식 없이도 화면에서 자연어로 물어보며 원하는 지역과 기간을 골라 받아볼 수 있습니다.",
    sources: ["개요"],
    keywords: ["마켓플레이스", "98,043", "로봇"],
  },
  {
    q: "HOVR의 목적과 강점은 무엇인가요?",
    a: "HOVR의 목적은 도시 현장 데이터를 누구나 쉽게 사고 활용하도록 만드는 것입니다. 위치를 기준으로 현장 상황·이벤트·사진이 하나로 연결되어 있어 지도와 차트로 바로 살펴볼 수 있고, 전문 도구나 코드 없이 자연어로 탐색하는 것이 핵심 강점입니다.",
    sources: ["목적"],
    keywords: ["목적", "자연어", "강점"],
  },
  {
    q: "보유 데이터 규모는 얼마나 되나요?",
    a: "보유 데이터는 약 98,043건이며 매월 갱신됩니다. 도로 이벤트는 불법주정차가 가장 많고, 포트홀, 정차차량, 공사, 인파밀집, 침수, 사고 순으로 분포합니다. 사진·영상은 약 33,000건이 함께 제공됩니다.",
    sources: ["데이터 규모"],
    keywords: ["98,043", "규모", "분포"],
  },
  {
    q: "데이터는 어떻게 구성되어 있나요?",
    a: "데이터는 위치 기록, 현장 관측, 도로 이벤트, 사진·영상의 네 가지 형태로 제공됩니다. 위치 기록을 기준으로 같은 지점의 현장 관측·도로 이벤트·사진·영상이 하나로 연결되어, 원하는 지역과 기간만 골라 한 번에 받아볼 수 있습니다.",
    sources: ["데이터 구성"],
    keywords: ["구성", "위치", "연결"],
  },
  {
    q: "우천 시 사고가 늘어나나요?",
    a: "네. 수집된 데이터를 보면 비가 오는 날의 사고 비중이 맑은 날보다 약 1.8배 높게 나타납니다. 노면이 젖은 구간에서 위험이 커지는 것으로 보입니다.",
    sources: ["데이터 인사이트"],
    keywords: ["1.8", "사고", "비"],
  },
  {
    q: "어떤 지역의 데이터를 보유하고 있나요?",
    a: "전국 주요 도시에서 데이터를 수집합니다. 광주 권역이 가장 활발하고, 수도권과 부산·대구·대전·울산·세종 등 광역시를 포함해 전국 권역을 폭넓게 다룹니다.",
    sources: ["수집 지역"],
    keywords: ["전국", "권역", "지역"],
  },
  {
    q: "어떤 도로 상황을 감지하나요?",
    a: "로봇은 도로 상황을 7종으로 분류해 감지합니다. 불법주정차, 포트홀, 정차차량, 공사, 인파밀집, 침수, 사고이며, 각 상황은 발생 위치·시점과 함께 기록되고 관련 사진·영상이 연결됩니다.",
    sources: ["감지 도로 상황"],
    keywords: ["7종", "포트홀", "불법주정차"],
  },
  {
    q: "데이터는 어떻게 구매하나요?",
    a: "데이터는 무료 체험, 월 100달러 서비스 구독, 맞춤·대량의 세 가지로 이용할 수 있습니다. 구독은 전체 데이터 조회·다운로드와 매월 갱신되는 최신 데이터를 제공하며, 맞춤·대량은 원하는 지역·기간을 추출해 견적으로 제공합니다. 구매 문의는 sales@him-ai.com으로 받습니다.",
    sources: ["데이터 구매"],
    keywords: ["구독", "구매", "100"],
  },
  {
    q: "데이터는 얼마나 자주 갱신되나요?",
    a: "데이터는 매월 갱신됩니다. 구독 중에는 매월 추가되는 최신 현장 데이터를 계속 받아볼 수 있습니다.",
    sources: ["갱신 주기"],
    keywords: ["매월", "갱신", "최신"],
  },

  // ── Internal goldens (sources include internal titles → excluded from CUSTOMER_GOLDEN) ──
  {
    q: "데이터가 합성인가요?",
    a: "내부적으로 이 데이터셋의 값은 대부분 합성으로 생성되었습니다.",
    sources: ["데이터 정직성"],
    keywords: ["합성", "synthetic"],
  },
  {
    q: "PRNG 버그가 뭐였나요?",
    a: "mulberry32 의사난수 좌표가 부동소수점 정밀도로 중복 붕괴될 뻔한 버그였고, 검증 게이트로 잡아냈습니다.",
    sources: ["최대 교훈 — PRNG 정밀도 버그"],
    keywords: ["PRNG", "mulberry32"],
  },
  {
    q: "어디에 배포했나요?",
    a: "배포 인프라는 S3와 Terraform을 사용해 구성했습니다.",
    sources: ["배포"],
    keywords: ["S3", "Terraform"],
  },
  {
    q: "협업 원칙은 무엇인가요?",
    a: "단일 진실 공급원, 시각 충실도 우선, 고객 위생, 결정론적 재현, 검증 게이트, 점진적 단계 진행의 6원칙을 따랐습니다.",
    sources: ["협업 6원칙"],
    keywords: ["원칙", "협업"],
  },
  {
    q: "AI 에이전트는 어떻게 설계했나요?",
    a: "자연어 질문을 read-only SQL 도구 호출로 바꿔 데이터로 답하도록 설계했습니다.",
    sources: ["AI Agent 설계"],
    keywords: ["에이전트", "SQL"],
  },
  {
    q: "디자인은 어떻게 진화했나요?",
    a: "HIM 브랜드 토큰을 기준으로 여러 차례 진화했습니다.",
    sources: ["디자인 진화"],
    keywords: ["디자인", "진화"],
  },
  {
    q: "지도는 어떻게 렌더링했나요?",
    a: "MapLibre 기반으로 좌표 클러스터링과 성능 튜닝을 거쳐 완성했습니다.",
    sources: ["지도 렌더링 여정"],
    keywords: ["지도", "MapLibre"],
  },
  {
    q: "단일 진실 공급원이 무엇인가요?",
    a: "모든 상수와 사실을 한 곳에서 관리해 시드·API·클라이언트가 동일한 값을 읽도록 한 원칙입니다.",
    sources: ["협업 6원칙"],
    keywords: ["단일", "진실"],
  },
  {
    q: "검증 게이트는 무엇인가요?",
    a: "데이터 계층의 핵심 불변식을 자동 테스트로 고정해 회귀를 막는 장치입니다. PRNG 좌표 붕괴도 이 게이트로 잡았습니다.",
    sources: ["최대 교훈 — PRNG 정밀도 버그"],
    keywords: ["검증", "게이트"],
  },
  {
    q: "이 값들은 실제 측정값인가요?",
    a: "내부적으로 값은 대부분 합성으로 생성되었으며 일부만 외부에서 로드되었습니다.",
    sources: ["데이터 정직성"],
    keywords: ["합성", "synthetic"],
  },
];

// Customer goldens: every source must be a customer chunk title.
export const CUSTOMER_GOLDEN: Golden[] = GOLDEN.filter(
  (g) => g.sources.length > 0 && g.sources.every((s) => CUSTOMER_TITLES.has(s))
);

// Suggested customer topics (shown in the widget).
export const SUGGESTED: string[] = [
  "어떤 지역의 데이터를 보유하고 있나요?",
  "어떤 도로 상황을 감지하나요?",
  "데이터는 어떻게 구매하나요?",
  "데이터는 얼마나 자주 갱신되나요?",
  "우천 시 사고가 늘어나나요?",
];

// ── Tokenization & scoring ─────────────────────────────────────────────────────
const STOP = new Set(["은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "로", "으로"]);

// Split on whitespace + common punctuation/symbols (no Unicode-property escapes
// so this compiles under the default TS target). Korean/Latin/digits survive.
const SEP = /[\s.,!?;:"'`~@#$%^&*()\[\]{}<>/\\|+=\-—…·“”‘’]+/;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(SEP)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

// retrieve(query, k): scan ONLY CUSTOMER_CHUNKS.
// score = keyword partial-match ×3 + title-token partial-match ×2 + body-token ×1.
// Fallback to CUSTOMER_CHUNKS.slice(0,k) when nothing matches.
export function retrieve(query: string, k = 3): Chunk[] {
  const q = (query || "").toLowerCase();
  const qTokens = tokenize(query);

  const scored = CUSTOMER_CHUNKS.map((c) => {
    let score = 0;

    // keyword boost (×3) — substring match against the raw query
    for (const kw of KEYWORDS[c.id] ?? []) {
      if (q.includes(kw.toLowerCase())) score += 3;
    }

    // title tokens (×2)
    const titleTokens = tokenize(c.title);
    for (const tt of titleTokens) {
      if (q.includes(tt)) score += 2;
    }

    // body tokens (×1) — overlap between query tokens and body tokens
    const bodyTokens = new Set(tokenize(c.text));
    for (const qt of qTokens) {
      if (bodyTokens.has(qt)) score += 1;
    }

    return { c, score };
  });

  const hits = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.c);

  if (hits.length === 0) return CUSTOMER_CHUNKS.slice(0, k);
  return hits;
}

// ── answerFromGolden ───────────────────────────────────────────────────────────
export type GoldenAnswer = { answer: string; sources: string[]; grounded: boolean };

// Customer out-of-scope message + a couple of topics we CAN help with.
const OUT_OF_SCOPE = "제가 안내할 수 있는 범위 밖이라 확인되지 않습니다.";

function suggestTopics(): string {
  // 1~2 suggested topics, customer-safe.
  return ` 대신 이런 주제는 안내해 드릴 수 있어요: "${SUGGESTED[0]}", "${SUGGESTED[2]}".`;
}

// answerFromGolden(query): scan ONLY CUSTOMER_GOLDEN.
// score = keyword substring ×2 + question-token overlap ×1. No match → out-of-scope.
export function answerFromGolden(query: string): GoldenAnswer {
  const q = (query || "").toLowerCase();
  const qTokens = new Set(tokenize(query));

  let best: Golden | null = null;
  let bestScore = 0;

  for (const g of CUSTOMER_GOLDEN) {
    let score = 0;
    for (const kw of g.keywords) {
      if (q.includes(kw.toLowerCase())) score += 2;
    }
    for (const gt of tokenize(g.q)) {
      if (qTokens.has(gt)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }

  if (!best || bestScore === 0) {
    return { answer: OUT_OF_SCOPE + suggestTopics(), sources: [], grounded: false };
  }
  return { answer: best.a, sources: best.sources, grounded: false };
}
