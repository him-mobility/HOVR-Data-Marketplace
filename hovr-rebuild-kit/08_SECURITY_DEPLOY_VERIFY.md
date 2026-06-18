# 08 · SECURITY · DEPLOY · VERIFY — 레이트리밋 · 게이트 · env · 고객 위생 · 최종 검증

> 목표: API 보호, 선택적 데모 게이트, 환경설정, 그리고 "지금과 똑같이 작동"을 보장하는 최종 검증.

## A. `src/lib/ratelimit.ts` — 인메모리 슬라이딩 윈도우

```ts
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max = 15, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }   // 차단
  arr.push(now); hits.set(key, arr); return true;                // 허용
}
export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : req.headers.get("x-real-ip") || "anon").trim();
  return ip.slice(0, 64);
}
```
- 기본 **15요청/60초/키**. `/api/agent`·`/api/chat`(·`/api/recommend`)에 적용, 초과 시 429. 단일 프로세스 메모리(한 `npm start` 기준).

## B. `src/middleware.ts` — 선택적 Basic-Auth 게이트

```ts
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
export function middleware(req: NextRequest) {
  const pass = process.env.DEMO_PASSWORD;
  if (!pass) return NextResponse.next();           // 미설정 → 게이트 없음(로컬 영향 X)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try { const provided = atob(auth.slice(6)).split(":").slice(1).join(":"); if (provided === pass) return NextResponse.next(); } catch {}
  }
  return new NextResponse("인증이 필요합니다 (HOVR 데모).", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="HOVR Demo"' } });
}
```
- 패스워드만 검사(username 무시). 공개 URL에서 키 소모 방지용.

## C. 환경 (`.env.local`, 서버 전용)

```
ANTHROPIC_API_KEY=                          # 선택. 없으면 전 기능 결정적 폴백
AGENT_MODEL=claude-sonnet-4-6               # 선택. HOVI 에이전트 + Q&A 챗봇
RECOMMEND_MODEL=claude-haiku-4-5-20251001   # 선택. /search 추천(빠른 응답)
DEMO_PASSWORD=                              # 선택. 설정 시 사이트 전체 Basic-Auth
```
`max_tokens`: chat **1500** · agent **2048** · recommend **3000**.
(선택) Claude Code로 빌드 시 `.claude/settings.local.json`의 `CLAUDE_CODE_MAX_OUTPUT_TOKENS`를 키워 두면 긴 산출에 유리(앱 동작과 무관).

## D. 고객 노출 위생 — 전 기능 공통 점검 (재현 필수 불변식)

다음이 고객 경로 어디에서도 노출되면 **재현 실패**:
- HOVI/Q&A/추천/홈에 **SQL·도구명(search_records/run_readonly_sql 등)·테이블/컬럼명** 노출.
- "값은 대부분 합성"·PRNG/mulberry32·협업원칙·디자인/지도 여정·Terraform/S3/CloudFront 등 **개발/인프라/케이스스터디** 정보.
- HOVI 패널에 **도구 트레이스/코드 라인** 렌더(트레이스는 "N건" 숫자만 추출, 나머지 폐기).
방어선: ① UI에서 코드/트레이스 미렌더 ② Q&A는 `CUSTOMER_CHUNKS`/`CUSTOMER_GOLDEN`만 ③ `describe_schema` note에 합성 없음 ④ agent/chat **시스템 프롬프트에 내부용어·합성·인프라 금지 규칙**.

## E. 실행 / 시드 / 공개

```bash
node scripts/gen-extra.mjs   # 외부 200건 재생성 (seed 전에)
npm run seed                 # 98,043 SQLite 생성 (data/robot-data-lake.sqlite)
npm test                     # pretest가 재시드 → 검증 게이트
npm run build && npm start   # 또는 LAN: npx next start -H 0.0.0.0 -p 3000
```
공개가 필요하면 cloudflared quick-tunnel(`cloudflared tunnel --url http://localhost:3000`) + `DEMO_PASSWORD`로 게이트. 서버리스 배포 시 read-only FS 주의(시드한 sqlite를 함께 배포하거나 호스트에서 시드).

## F. 최종 검증 체크리스트 (= "지금과 똑같이 작동" 판정)

데이터/빌드
- [ ] `npm run seed` → `positions=98043, uniqueCoords>95000, media≈33k`
- [ ] `npm test` → 시드 6 + Q&A 4 = 10 통과
- [ ] `npm run build` → 에러 0
- [ ] (선택) 좌표 검증 스크립트: 2.5km 초과 이탈 0 · metro 불일치 0 (바다/산/타지역 0)

마켓플레이스 `/`
- [ ] 히어로 4지표: `98,043 · 매월 갱신` / `위치·관측·이벤트·영상` / `포트홀·사고·침수 등` / `수도권 외 21개 지역`
- [ ] 헤더에 틸 강조 "✨ 맞춤형 데이터"(→`/search`), 상품/구성/요금 섹션 정상

데모 `/demo`
- [ ] 지도 center 전국, 점이 광주~수도권~광역시에 분포, 바다/산 점 없음, 우상단 "이 영역 N / 전체 98,043"
- [ ] 필터/차트/표/드로어 동작, `/demo?events=pothole&projects=busan` 딥링크 반영

HOVI / Q&A / 추천
- [ ] HOVI 질문 → 코드/SQL/도구명 미노출, "관련 데이터를 살펴보는 중…", 답변에 관련데이터 칩 + 지도/차트 동기화
- [ ] Q&A가 합성/PRNG/배포/도구 질문에 "범위 밖"(고객 스코프)
- [ ] `/search` 지역=부산 → 추천·건수·딥링크가 부산 한정
- [ ] 키 제거 후에도 HOVI/Q&A/추천 모두 폴백으로 정상 동작(UI 안 깨짐)

> 위가 전부 통과하면 다른 PC에서도 현재 작동본과 동일하다. 빌드 순서·전역 원칙(00_README §3)을 어기면(특히 mulberry32·좌표 박스·고객 위생·hex 지도색) 재현이 깨진다.
