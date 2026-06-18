"use client";

import { useState } from "react";
// IMPORTANT: import the client-safe SSOT from schema, NOT from recommend.ts —
// recommend.ts is server-only (pulls in better-sqlite3) and importing it here
// would drag a native module into the client bundle and break the build.
import { REGION_PROJECTS } from "@/lib/schema";

const OCCUPATIONS = [
  "보험·금융",
  "물류·모빌리티",
  "도로·시설 관리",
  "부동산·도시계획",
  "마케팅·상권",
  "공공·행정",
  "연구·학계",
  "자율주행·로보틱스",
  "통신·인프라",
  "기타",
];

const PURPOSES = [
  "위험 구간 분석",
  "현장 모니터링",
  "수요·입지 분석",
  "정책·행정 의사결정",
  "리스크·보험 산정",
  "연구·데이터셋 확보",
  "AI 모델 학습",
  "운영 효율화",
  "기타",
];

const REGIONS = ["전체", ...Object.keys(REGION_PROJECTS)];

const INTERESTS = ["불법주정차", "포트홀", "정차차량", "공사", "인파밀집", "침수", "사고"];

type RecDataset = {
  name: string;
  description: string;
  tags: string[];
  reason: string;
  totalCount: number;
  demoQuery: string;
};

type RecResponse = {
  datasets: RecDataset[];
  aiPowered: boolean;
};

const SUBSCRIBE_MAILTO =
  "mailto:sales@him-ai.com?subject=HOVR%20%EB%A7%9E%EC%B6%A4%ED%98%95%20%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EB%AC%B8%EC%9D%98";

export default function SearchPage() {
  const [occupation, setOccupation] = useState("");
  const [customOccupation, setCustomOccupation] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [region, setRegion] = useState("전체");
  const [interests, setInterests] = useState<string[]>([]);
  const [details, setDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RecResponse | null>(null);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const effectiveOccupation = occupation === "기타" ? customOccupation.trim() : occupation;
  const canSubmit = !!effectiveOccupation && purposes.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setResult(null);

    const extra = [
      region !== "전체" ? `관심 지역: ${region}` : "",
      interests.length ? `관심 항목: ${interests.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" / ");
    const fullDetails = [details.trim(), extra].filter(Boolean).join(" / ");
    const selectedProjects = region !== "전체" ? [...(REGION_PROJECTS[region] ?? [])] : [];

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occupation: effectiveOccupation,
          purposes,
          details: fullDetails,
          region: region !== "전체" ? region : undefined,
          projects: selectedProjects,
        }),
      });
      if (!res.ok) {
        setError("추천을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const data = (await res.json()) as RecResponse;
      setResult(data);
    } catch {
      setError("추천을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface text-ink">
      {/* Hero */}
      <section className="on-navy bg-navy text-white/85">
        <div className="container-x py-16 md:py-20">
          <div className="eyebrow">맞춤형 데이터 · AI 추천</div>
          <h1 className="mt-3 text-3xl md:text-4xl text-balance">AI 추천</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
            비즈니스에 맞는 데이터, AI가 직접 찾아드립니다. 직업과 활용 목적·관심 지역만 알려 주시면
            보유 데이터 중에서 가장 잘 맞는 데이터셋을 추천하고, 지도에서 바로 살펴볼 수 있게 안내합니다.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-surface">
        <div className="container-x py-12 md:py-16">
          <form onSubmit={handleSubmit} className="grid gap-10">
            {/* 01 직업 */}
            <fieldset>
              <legend className="text-lg font-semibold text-navy">
                <span className="mono mr-2 text-him-blue">01</span>직업
              </legend>
              <p className="mt-1 text-sm text-muted">어떤 일을 하고 계신가요? (1개 선택)</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {OCCUPATIONS.map((o) => {
                  const active = occupation === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOccupation(o)}
                      aria-pressed={active}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-navy bg-navy text-white"
                          : "border-line bg-surface2 text-ink/80 hover:border-navy-300"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {occupation === "기타" && (
                <input
                  type="text"
                  value={customOccupation}
                  onChange={(e) => setCustomOccupation(e.target.value)}
                  placeholder="직접 입력해 주세요"
                  className="mt-3 w-full max-w-md rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-him-blue"
                />
              )}
            </fieldset>

            {/* 02 활용목적 */}
            <fieldset>
              <legend className="text-lg font-semibold text-navy">
                <span className="mono mr-2 text-him-blue">02</span>활용 목적
              </legend>
              <p className="mt-1 text-sm text-muted">데이터로 무엇을 하시려나요? (복수 선택)</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {PURPOSES.map((p) => {
                  const active = purposes.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurposes((prev) => toggle(prev, p))}
                      aria-pressed={active}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-navy bg-navy text-white"
                          : "border-line bg-surface2 text-ink/80 hover:border-navy-300"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* 03 관심 지역 */}
            <fieldset>
              <legend className="text-lg font-semibold text-navy">
                <span className="mono mr-2 text-him-blue">03</span>관심 지역
              </legend>
              <p className="mt-1 text-sm text-muted">
                보유 데이터가 있는 지역으로 한정해 추천합니다. (1개 선택)
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {REGIONS.map((r) => {
                  const active = region === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      aria-pressed={active}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-him-teal bg-him-teal text-navy"
                          : "border-line bg-surface2 text-ink/80 hover:border-him-teal"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* 04 관심 항목 */}
            <fieldset>
              <legend className="text-lg font-semibold text-navy">
                <span className="mono mr-2 text-him-blue">04</span>관심 항목
              </legend>
              <p className="mt-1 text-sm text-muted">관심 있는 도로 상황을 골라 주세요. (복수 선택)</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {INTERESTS.map((it) => {
                  const active = interests.includes(it);
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setInterests((prev) => toggle(prev, it))}
                      aria-pressed={active}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-navy bg-navy text-white"
                          : "border-line bg-surface2 text-ink/80 hover:border-navy-300"
                      }`}
                    >
                      {it}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* 05 세부 내용 */}
            <fieldset>
              <legend className="text-lg font-semibold text-navy">
                <span className="mono mr-2 text-him-blue">05</span>세부 내용
              </legend>
              <p className="mt-1 text-sm text-muted">
                구체적으로 찾는 데이터나 목적이 있다면 자유롭게 적어 주세요. (선택)
              </p>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="예: 우천 시 사고가 잦은 구간을 보험 위험도 산정에 활용하고 싶어요."
                className="mt-4 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-him-blue"
              />
            </fieldset>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "추천을 찾는 중…" : "AI 추천 받기 →"}
              </button>
              {!effectiveOccupation || purposes.length === 0 ? (
                <span className="text-sm text-muted">직업과 활용 목적을 선택해 주세요.</span>
              ) : null}
            </div>
          </form>
        </div>
      </section>

      {/* Results */}
      {(error || result) && (
        <section className="bg-surface2">
          <div className="container-x py-12 md:py-16">
            {error && (
              <div className="rounded-md border border-line bg-surface p-6 text-sm text-ink/80">
                {error}
              </div>
            )}

            {result && (
              <>
                <div className="mb-8 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl md:text-3xl text-navy">추천 데이터셋</h2>
                  <span className="mono rounded-full bg-navy px-3 py-1 text-xs font-medium text-white">
                    {result.aiPowered ? "AI 맞춤 추천" : "추천(규칙 기반)"}
                  </span>
                </div>

                {result.datasets.length === 0 ? (
                  <div className="rounded-md border border-line bg-surface p-6 text-sm text-ink/80">
                    조건에 맞는 데이터셋을 찾지 못했습니다. 관심 지역이나 항목을 바꿔 다시 시도해 보세요.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {result.datasets.map((d, i) => (
                      <article
                        key={i}
                        className="flex flex-col rounded-lg border border-line bg-surface p-6 shadow-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold text-navy">{d.name}</h3>
                          <span className="mono shrink-0 rounded-full bg-him-teal/15 px-3 py-1 text-xs font-semibold text-him-teal">
                            약 {d.totalCount.toLocaleString("en-US")}건
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-ink/80">{d.description}</p>

                        {d.reason && (
                          <p className="mt-4 border-l-2 border-him-teal pl-3 text-sm text-ink/70">
                            💡 {d.reason}
                          </p>
                        )}

                        {d.tags?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {d.tags.map((t) => (
                              <span
                                key={t}
                                className="mono rounded-full bg-surface2 px-2.5 py-1 text-xs text-muted"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3 pt-2">
                          <a
                            href={`/demo?${d.demoQuery}`}
                            className="inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-700"
                          >
                            지도에서 살펴보기 →
                          </a>
                          <a
                            href={SUBSCRIBE_MAILTO}
                            className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-navy"
                          >
                            구독 문의
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
