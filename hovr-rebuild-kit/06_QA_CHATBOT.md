# 06 · QA CHATBOT — 고객 스코프 지식베이스 · `/api/chat` · ChatWidget

> 목표: 모든 페이지 우하단 플로팅 "HOVR Q&A". **고객에게 보일 정보만** 근거로 답한다 — 합성 데이터 고백·PRNG 버그·개발 과정·인프라·도구/SQL은 지식베이스에서 제외(고객 스코프). 키 없으면 골든 Q&A 폴백.

## A. `src/lib/kb.ts` — 지식베이스 (client-safe)

- `Chunk = {id,title,text}`. `CHUNKS`: 제품/케이스스터디 혼합 ~15개. 고객용 청크 + 내부 청크 모두 존재하되, **고객 경로는 고객 청크만 본다**.
  - 고객 청크 예: `overview`(개요), `purpose`(목적·셀링포인트), `scale`(데이터 규모·이벤트 분포), `data-model`(4테이블 구조), `insight`(우천 사고 1.8× 등 데이터 인사이트), `coverage`(수집 지역 — 전국), `detection`(감지 도로상황 7종), `access`(데이터 구매·이용), `freshness`(갱신 주기).
  - 내부 청크(고객 제외): `principles`(협업 6원칙), `lesson`(PRNG 버그), `agent`(도구·SQL 설계), `design`(디자인 진화), `map`(지도 렌더링 여정), `deploy`(배포 인프라), `honesty`("값은 대부분 합성").
- **고객 스코프 (핵심):**
  ```ts
  const INTERNAL_IDS = new Set(["principles","lesson","agent","design","map","deploy","honesty"]);
  export const CUSTOMER_CHUNKS: Chunk[] = CHUNKS.filter(c => !INTERNAL_IDS.has(c.id));
  const CUSTOMER_TITLES = new Set(CUSTOMER_CHUNKS.map(c => c.title));
  export const CUSTOMER_GOLDEN = GOLDEN.filter(g => g.sources.length>0 && g.sources.every(s => CUSTOMER_TITLES.has(s)));
  ```
- `GOLDEN`: `{q,a,sources[],keywords[]}[]` ~19개(내부질문 PRNG/배포/합성 포함). **고객 경로는 CUSTOMER_GOLDEN(~9개)만 사용.**
- `SUGGESTED`(고객용 5): ["어떤 지역의 데이터를 보유하고 있나요?","어떤 도로 상황을 감지하나요?","데이터는 어떻게 구매하나요?","데이터는 얼마나 자주 갱신되나요?","우천 시 사고가 늘어나나요?"].
- `retrieve(query,k=3)`: **CUSTOMER_CHUNKS만** 순회. 점수=키워드(×3, `KEYWORDS[id]`)·제목어(×2)·본문토큰(×1) 부분일치. top-k. 폴백도 `CUSTOMER_CHUNKS.slice(0,k)`.
- `answerFromGolden(query)`: **CUSTOMER_GOLDEN만** 순회(키워드×2+질문토큰×1). 매치 없으면 `{answer:"이 케이스 스터디 자료 범위 밖이라…", sources:[], grounded:false}` → 단, 고객 표현으로: `"제가 안내할 수 있는 범위 밖이라 확인되지 않습니다."` + 안내 가능한 주제 1~2개 제안. 매치면 `CUSTOMER_GOLDEN[bestIdx]`의 `{a,sources}`, `grounded:false`.

## B. `src/app/api/chat/route.ts`

`runtime="nodejs"`, `dynamic="force-dynamic"`. `MODEL = AGENT_MODEL || "claude-sonnet-4-6"`.
- `{question}` 검증, `rateLimit("chat:"+clientKey(req))` 429.
- `chunks = retrieve(question,3)`(고객 스코프), `sources = chunks.map(c=>c.title)`.
- **키 없으면** `answerFromGolden(question)` 반환.
- 키 있으면 evidence = 고객 청크 합쳐 system 구성 → `messages.create({model:MODEL, max_tokens:1500, system, messages:[{role:"user",content:question}]})` → `{answer, sources, grounded:true}`. 실패 시 `answerFromGolden` 폴백(+note).

**system 프롬프트(고객 위생):**
```
당신은 HOVR(HIM의 로봇 데이터 마켓플레이스) 안내 도우미입니다.
규칙:
- 아래 [근거] 발췌에 있는 내용으로만 답합니다. 추측하지 않습니다.
- 근거에 없으면 "제가 안내할 수 있는 범위 밖이라 확인되지 않습니다"라고 답하고 답할 수 있는 주제를 1~2개 제안합니다.
- SQL·도구명·테이블/컬럼명 등 내부 구현 용어나, 합성 데이터 여부·개발 과정·인프라처럼 고객과 무관한 내용은 답하지 않습니다.
- 한국어로 정확하게. 핵심을 먼저, 필요하면 근거를 충분히. 수치·고유명사는 근거 그대로 인용.

[근거]
{evidence}
```

## C. `src/components/site/ChatWidget.tsx` (`"use client"`, `SUGGESTED` from kb)

- 우하단 토글 버튼 `fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-navy text-white shadow-lg`(💬/✕).
- 열림 시 다이얼로그 `fixed bottom-24 right-5 z-50 h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] rounded-xl border border-line bg-surface shadow-2xl`.
- 헤더 `bg-navy text-white`: 틸 점 + "HOVR Q&A" + `ml-auto text-xs text-white/60 "근거 기반 답변"`.
- 빈 상태: "HOVR와 수집 데이터에 대해 물어보세요. 답변은 자료에 근거하며 출처 섹션을 함께 표시합니다."
- `ask(q)`: `POST /api/chat {question}` → bot 메시지 `{text:d.answer, sources:d.sources}`. user 버블 `bg-navy text-white`, bot 버블 `border-line bg-surface2`. sources 있으면 `mono ... text-navy "출처: {title}"` 칩(고객 스코프라 고객용 제목만 등장). pending "답변 작성 중…".
- 하단 SUGGESTED 칩 + 입력폼(placeholder "질문을 입력하세요…", 버튼 "전송").

## D. `src/lib/kb.test.ts` — 고객 스코프 회귀

`import { CUSTOMER_GOLDEN, retrieve, answerFromGolden }`. 4 테스트:
1. **고객 골든 라우팅**: 각 `g`에 `answerFromGolden(g.q)` 답변이 `g.keywords.some(k=>answer.includes(k))` → 전부 통과(`toBe(CUSTOMER_GOLDEN.length)`). (keywords는 택일 후보라 `.some`.)
2. **검색**: 각 `g` `retrieve(g.q,3)` 제목에 `g.sources` 하나 이상 포함 → `>= length-1`.
3. **내부 출처 제외**: `["최대 교훈 — PRNG 정밀도 버그","협업 6원칙","AI Agent 설계","배포","데이터 정직성"]`가 CUSTOMER_GOLDEN 출처에 **없음**.
4. **코퍼스 밖**: "HIM 매출은 얼마야?","오늘 날씨 어때?","대표 전화번호 알려줘" → `grounded:false` & "범위 밖".

## E. 검증 포인트

- "데이터가 합성인가요?"·"PRNG 버그가 뭐였나요?"·"어디에 배포했나요?" → 고객 스코프라 "범위 밖" 또는 고객 주제로 안내(내부 정보 미노출).
- "어떤 지역 데이터를 보유하나요?" → 전국 권역 답변 + 출처 "수집 지역".
