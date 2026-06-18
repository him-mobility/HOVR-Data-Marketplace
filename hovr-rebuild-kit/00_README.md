# HOVR Rebuild Kit — 현재 작동본 정밀 재현 프롬프트 (00 · 오케스트레이션)

> 목적: **지금 작동 중인 HOVR 데모(기능 + 디자인)를 다른 PC에서 프롬프트만으로 똑같이 재현**한다.
> 사용처: Claude Code(또는 동급 에이전트 코딩 도구). 파일 01→08을 순서대로 한 번에 하나씩 붙여넣어 빌드한다.
> 이 킷은 구버전 `prompt/hovr-build-kit/`(광주 전용·97,843·제품범위 Q&A)을 **대체**한다. 차이는 본 문서 말미 참조.

---

## 0. 무엇을 만드는가 (모두 고객 대상)

단일 Next.js 앱 `robot-data-lake-site` 안에 4개 표면:

1. **마켓플레이스 홈 `/`** — 로봇 수집 데이터를 파는 랜딩(히어로·상품·데이터 구성·요금).
2. **탐색 데모 `/demo`** — 다크 "Live Operations Console": 지도(MapLibre)·차트(Recharts)·데이터 표 + 우측 **HOVI** AI 패널. SQL/필터 대신 자연어로 대시보드를 조작.
3. **맞춤형 데이터 `/search`** — 직업·목적·관심지역·관심항목을 받아 AI가 보유 데이터셋을 추천.
4. **HOVR Q&A 챗봇** — 모든 페이지 우하단 플로팅 위젯. 고객용 지식만 근거로 답변.

브랜드: **HOVR** = 마켓플레이스 제품명, **HOVI** = 데모 안의 AI 어시스턴트(에이전트 패널) 이름, **HIM** = 회사/로고.

---

## 1. 고정 스택 (버전 그대로)

- Next.js **14.2.35** (App Router) · React ^18 · TypeScript (strict) · `src/` 레이아웃 · 경로 별칭 `@/* → ./src/*`
- Tailwind CSS ^3.4.1 (+ postcss ^8)
- SQLite: **better-sqlite3 ^12.11.1** (read-only 싱글톤) · 시드는 **tsx ^4.22.4**
- 지도: **maplibre-gl ^5.24.0** · 차트: **recharts ^3.8.1**
- LLM: **@anthropic-ai/sdk ^0.104.2**
- 테스트: **vitest ^4.1.9**
- lint: eslint ^8 + eslint-config-next 14.2.35

`package.json` scripts: `dev`/`build`/`start`/`lint`/`seed`(`tsx scripts/seed.ts`)/`pretest`(시드 후 테스트)/`test`(`vitest run`)/`test:watch`.

---

## 2. 빌드 순서 (파일별 = 기능별)

| 단계 | 파일 | 산출물 |
|---|---|---|
| 1 | `01_FOUNDATION.md` | 스캐폴드·디자인 시스템·셸(헤더/푸터/챗위젯 마운트)·브랜드 SVG |
| 2 | `02_DATA_MODEL_AND_SEED.md` | 4테이블 스키마·결정적 시드(98,043·좌표검증)·검증 테스트 |
| 3 | `03_MARKETPLACE_HOME.md` | `content.ts` SSOT·`/` 섹션(히어로 4지표·상품·구성·요금) |
| 4 | `04_DEMO_DASHBOARD.md` | `/demo`·지도/차트/표/드로어/필터·데이터 API 5종 |
| 5 | `05_HOVI_AGENT.md` | 에이전트 도구·`/api/agent`·HOVI 패널(코드 숨김·친화) |
| 6 | `06_QA_CHATBOT.md` | 지식베이스(고객 스코프)·`/api/chat`·ChatWidget |
| 7 | `07_RECOMMEND_SEARCH.md` | `/search` 폼(지역=보유데이터)·`/api/recommend`(지역 한정) |
| 8 | `08_SECURITY_DEPLOY_VERIFY.md` | 레이트리밋·Basic-Auth 게이트·env·최종 검증 체크리스트 |

각 파일은 그 단계의 정확한 코드/스펙/불변식을 담는다. 앞 단계가 통과(빌드+테스트)된 뒤 다음으로 간다.

---

## 3. 전역 원칙 (모든 단계에 적용 — 위반 시 재현 실패)

1. **키 없이도 동작 (key-optional).** `ANTHROPIC_API_KEY`는 선택. 모든 AI 기능(에이전트·챗봇·추천)은 키가 없으면 **결정적 폴백**으로 답을 보장한다. 키 유무로 UI가 깨지지 않는다.
2. **고객 노출 위생 (가장 중요).** 고객 화면(데모·챗봇·추천·홈)에는 다음을 **절대 노출하지 않는다**: SQL·도구 이름(`search_records` 등)·테이블/컬럼명·"합성 데이터" 사실·PRNG/개발 과정·인프라(S3/Terraform 등). 내부 트레이스는 화면에 닿기 전에 버린다. LLM 자유서술도 시스템 프롬프트로 같은 금지를 건다.
3. **결정적 PRNG = mulberry32.** 데이터 생성은 `Math.imul` 기반 mulberry32(시드 42)로만. 과거 LCG(`seed*1103515245`)는 JS 정수정밀도(2^53)를 넘겨 유니크 좌표가 741개로 붕괴했다. 시드 후 **유니크 (lat,lng) > 95,000**을 테스트로 강제한다.
4. **좌표는 도심 반경 박스 안.** 점은 지역 중심에서 좁은 반경(≈1.8km) 안에만 생성하고, 좌표↔수집처(project)를 1:1 정합시킨다(바다/산/타지역 이탈 0).
5. **지도 색은 hex/rgb만.** MapLibre 레이어 paint에 oklch를 쓰면 거부된다.
6. **데이터는 전국.** 광주·수도권(서울/경기/인천)·부산·대구·대전·울산·세종. 총 **98,043건**(생성 97,843 + 외부 적재 200).

---

## 4. 환경변수 (`.env.local`, 모두 서버 전용 — `NEXT_PUBLIC_` 금지)

```
ANTHROPIC_API_KEY=   # 선택. 없으면 전 기능 폴백 동작
AGENT_MODEL=claude-sonnet-4-6        # 선택. HOVI 에이전트/Q&A 기본
RECOMMEND_MODEL=claude-haiku-4-5-20251001  # 선택. /search 추천(빠른 응답)
DEMO_PASSWORD=       # 선택. 설정 시 사이트 전체 Basic-Auth 게이트
```

`max_tokens` 기준값: 챗봇 1500 · 에이전트 2048 · 추천 3000. (잘림 방지 여유.)

---

## 5. 완료 정의 (Definition of Done)

- [ ] `npm run seed` → `positions=98043, uniqueCoords>95000, media≈33k` 출력
- [ ] `npm test` → 전부 통과(시드 검증 6 + Q&A 고객스코프)
- [ ] `npm run build` → 에러 0(경고만 허용)
- [ ] `/` 히어로 4지표 = `98,043 · 매월 갱신` / `위치·관측·이벤트·영상` / `포트홀·사고·침수 등` / `수도권 외 21개 지역`
- [ ] 헤더에 틸 강조 "✨ 맞춤형 데이터" 필(→`/search`)
- [ ] `/demo` 지도가 전국(광주~수도권~광역시)에 점 분포, 바다/산 점 없음, 우상단 "이 영역 N / 전체 98,043" 게이지
- [ ] HOVI에 질문 → 코드/SQL/도구명 **안 보임**, "관련 데이터를 살펴보는 중…", 답변에 관련 데이터 칩 + 지도/차트 동기화
- [ ] Q&A 챗봇이 합성/PRNG/배포/도구 질문에 "안내 범위 밖" 응답(고객 스코프)
- [ ] `/search`에서 지역=부산 선택 → 추천·건수·딥링크가 부산으로 한정

---

## 6. 구버전(`hovr-build-kit`) 대비 변경점 (재현 시 반드시 반영)

- 범위: 광주 전용 → **전국 7개 지역**(`REGION_PROJECTS` 신설, 12개 project).
- 수치: 97,843·"광주 전역" → **98,043**·**"수도권 외 21개 지역"**·**"매월 갱신"**.
- 지도 center: `[126.851,35.16]` zoom~ → **`[127.0,36.35]` zoom 6.4**.
- 좌표 생성: 광역 산포 → **반경 박스 + 좌표↔project 정합**(바다/산 제거).
- Q&A: 제품 소개 범위 → **고객 전용 스코프**(`CUSTOMER_CHUNKS`/`CUSTOMER_GOLDEN`, 내부 청크 7종 제외).
- HOVI: raw 트레이스 노출 → **코드 숨김·친화 문구·관련데이터 칩**, 시스템 프롬프트에 내부용어 금지.
- 헤더: 3 nav → **4 nav + 틸 강조 맞춤형 데이터**.
- 신규: **`/search` 지역기반 추천**(지역→project 한정), `describe_schema`에서 합성 고백 제거.
