# 05 · HOVI AGENT — 도구 · `/api/agent` · 고객 친화 패널

> 목표: 자연어 질문을 도구 호출로 바꿔 대시보드를 필터링·집계하고 인사이트로 답하는 데모 내 AI 어시스턴트 **HOVI**. **고객 화면엔 코드·SQL·도구명을 절대 노출하지 않는다.** 키 없으면 스크립트 폴백.

## A. `src/lib/agent-tools.ts` (서버 전용, read-only)

도구 구현 + Anthropic `TOOL_DEFS`:
- `describe_schema()` → 4테이블 요약·이벤트(slug/label/count)·project 목록. **note는 합성/내부 언급 금지**: `"전국 주요 도시(광주·수도권·부산·대구·대전·울산·세종)에서 수집. 4테이블이 position_idx로 연결."`
- `search_records(input)` → `normalizeFilter`(events 한글라벨/슬러그 정규화) + `buildWhere` → count + 샘플 5행 + resolvedWhere. base = `FROM robot_position p JOIN event e ON e.position_idx=p.idx JOIN observation o ON o.position_idx=p.idx {sql}`.
- `aggregate(input)` → groupBy ∈ `event|project|road|day|hour|weather` 화이트리스트(컬럼 매핑, 사용자 텍스트 SQL 금지), GROUP BY top-30.
- `run_readonly_sql(input)` → 폴백. 주석(`--`,`/* */`) 제거 후 `^(select|with)`만, `;` 금지, 쓰기/DDL 정규식 차단(`insert|update|delete|drop|alter|create|attach|detach|pragma|replace|truncate|vacuum|reindex|load_extension`), `LIMIT` 없으면 `LIMIT 100` 부착. 본질 방어선은 read-only 커넥션(db.ts).
- `focus_dashboard(input)` → `{ok:true, filter:normalizeFilter(input)}`(대시보드 동기화 신호).
- `TOOL_DEFS`: 위 5개 Anthropic tool 스키마. `runTool(name,input)→{data,summary}`(summary 예: `"29,841건"`, `"event별 7그룹"`, `"100행"`, `"대시보드 동기화"`).

## B. `src/app/api/agent/route.ts`

`runtime="nodejs"`, `dynamic="force-dynamic"`. `MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-6"`.
- `{question}` 검증(빈값 400). `rateLimit("agent:"+clientKey(req))` 초과 시 429("요청이 너무 많습니다…").
- **키 없으면** `{noKey:true}` 반환(클라가 스크립트 폴백).
- 키 있으면 도구 루프(최대 6턴): `client.messages.create({ model:MODEL, max_tokens:2048, system:SYSTEM, tools:TOOL_DEFS, messages })`. `stop_reason==="tool_use"`면 각 블록 `runTool` 실행, `focus_dashboard`면 `applyFilter` 보관, tool_result(데이터 `JSON.stringify(...).slice(0,4000)`) push 후 계속. end_turn이면 텍스트 합쳐 `{answer, trace, applyFilter}` 반환. (trace = `{tool,input,summary}[]` — **클라가 코드용으로 쓰지 않고 건수만 추출**.)
- 실패 시 `{error}` 500.

**SYSTEM 프롬프트(핵심 — 고객 노출 위생 포함):**
```
당신은 HIM의 로봇 데이터 마켓플레이스 "HOVR"의 데이터 분석 에이전트입니다.
데이터: 전국 주요 도시(광주·수도권·부산·대구·대전·울산·세종)에서 로봇이 수집한 약 98,043건. 4테이블(robot_position·observation·event·media).
이벤트 슬러그: illegal_parking pothole stopped_vehicle construction crowd flood accident.
프로젝트: aban, gwangju-loop, sangmu, pungam.
규칙:
- 자연어 질문을 도구 호출로 바꿔 데이터로 답하세요. 추측 금지, 도구 결과에 근거.
- 사용자가 특정 조건을 "보고/필터링"하려 하면 반드시 focus_dashboard로 대시보드를 동기화하세요.
- 단순 도구로 안 되면 run_readonly_sql(SELECT 전용)을 쓰세요.
- 최종 답변은 한국어로, 핵심 수치를 포함해 명확하게. 필요하면 여러 문장으로 충분히, 군더더기는 줄이고. 데이터가 풍부하면 분포·비교·추세를 짚어 줍니다.
- 답변은 고객 화면에 그대로 노출됩니다. SQL·도구명(search_records 등)·테이블/컬럼명 같은 내부 구현 용어나, 합성 데이터 여부·개발 과정·인프라 등 고객과 무관한 내용은 답변 본문에 절대 쓰지 마세요. 데이터가 보여주는 사실만 자연스러운 한국어로 전달하세요.
```

## C. `src/components/demo/AgentPanel.tsx` (`"use client"`) — 고객 친화 HOVI 패널

핵심 원칙: **도구 트레이스/코드/SQL을 화면에 절대 렌더하지 않는다.** 트레이스에서는 "N건" 숫자만 뽑고, 적용된 필터를 "관련 데이터" 칩으로 보여준다.

- 타입:
  ```ts
  type Insight = { title:string; body:string; stat?:string };
  type Related = { chips:string[]; note?:string };
  type Msg = { role:"user"; text:string } | { role:"agent"; insight:Insight; related?:Related };
  ```
- `ELABEL = Object.fromEntries(EVENT_TYPES.map(e=>[e.slug,e.label]))`.
- `relatedFromFilter(f?, count?) → Related|undefined`: f.events→ELABEL 라벨, projects, roads, from→"기간 지정", count→`${count}건`을 칩으로. 필터가 있으면 note `"지도·차트에 반영했어요"`.
- `extractCount(trace) → string|undefined`: trace.summary에서 `([\d,]+)\s*건` 첫 매치만(도구명/입력은 버림).
- `SCENARIOS`(무키/오류 폴백, 코드 없는 고객 표현): 포트홀/사고/시간대/우천/수집처/지역 6개 `{match:RegExp, insight, filter?}`. 시나리오의 body엔 SQL/도구명 금지(예: 우천 시나리오는 "날씨별 사고 비율을 직접 비교한 결과"로).
- `SUGGESTIONS`: ["도시별로 데이터가 가장 많은 곳은?","전국에서 포트홀이 가장 많은 지역은?","비 올 때 사고가 얼마나 늘어?","수집량이 가장 많은 시간대는?","부산에서 가장 흔한 도로 상황은?"].
- `ask(q)`: `POST /api/agent {question}`. `!ok || d.noKey || !d.answer` → `pushScripted`(시나리오 매칭 → insight + relatedFromFilter(scenario.filter)). 아니면: `applied=d.applyFilter?cleanApply(d.applyFilter):undefined`, `related=relatedFromFilter(applied, extractCount(d.trace))`, 메시지 `{role:"agent", insight:{title:"HOVI", body:d.answer}, related}` push, `onApplyFilter(applied)`.
- 렌더:
  - 헤더: 틸 펄스 점 + "HOVI".
  - 빈 상태: `"자연어로 물어보면 HOVI가 관련 데이터를 찾아 지도·차트로 보여주고 핵심만 정리해 답합니다. 아래 추천 질문을 눌러보세요."` (도구/SQL 언급 없음.)
  - agent 메시지 = `<AgentAnswer insight related/>`: 제목(+stat) → body → related 있으면 구분선 아래 "관련 데이터" 라벨 + 틸 칩들 + `📍 {note}`.
  - **pending 표시(친화 문구·코드 아님)**: 점 3개 bounce 애니메이션 + `"관련 데이터를 살펴보는 중…"`.
  - 하단: SUGGESTIONS 칩 + 입력폼(placeholder "자연어로 질문하기…", 버튼 "질문").
- `onApplyFilter`는 DemoApp의 `applyPatch`로 연결 → 지도/차트/표가 질문 관련 데이터로 동기화(질문 관련 데이터를 UI에 노출).

## D. 검증 포인트

- 키 있는 환경에서 HOVI에 "부산에서 포트홀 많은 도로?" → 답변 본문에 SQL/도구명/테이블명 없음, "관련 데이터" 칩(포트홀·부산·건수), 지도가 부산·포트홀로 동기화.
- 키 없는 환경 → 스크립트 시나리오로 같은 UX(코드 없음).
