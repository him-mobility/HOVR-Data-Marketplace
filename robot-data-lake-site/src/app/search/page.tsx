"use client";

// /search — 직업·활용목적·관심지역(보유 데이터 기반)·관심항목·세부내용을 받아
// AI가 보유 데이터셋을 추천한다. 추천 후 가장 맞는 데이터셋 1개로 곧장 지도(/demo)
// 로 이동하므로 이 페이지에는 결과/미리보기 영역이 없다(폼만 존재).
//
// REGION_PROJECTS는 반드시 @/lib/schema에서 import한다. server 전용 recommend.ts
// 를 import하면 better-sqlite3가 클라 번들로 들어가 빌드가 깨진다.

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  "리스크 분석",
  "수요·입지 분석",
  "유지보수 우선순위",
  "안전·방재",
  "단속·관리",
  "모델 학습 데이터",
  "정책·계획 수립",
  "상권·마케팅",
  "연구·검증",
];

const REGIONS = ["전체", ...Object.keys(REGION_PROJECTS)];

const INTERESTS = ["불법주정차", "포트홀", "정차차량", "공사", "인파밀집", "침수", "사고"];

type Dataset = { demoQuery: string };

export default function SearchPage() {
  const router = useRouter();

  const [occupation, setOccupation] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [region, setRegion] = useState("전체");
  const [interests, setInterests] = useState<string[]>([]);
  const [details, setDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], v: string, set: (x: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const occ = occupation.trim();
    if (!occ && purposes.length === 0) {
      setError("직업 또는 활용 목적을 하나 이상 선택해 주세요.");
      return;
    }

    const extra = [
      region !== "전체" ? `관심 지역: ${region}` : "",
      interests.length ? `관심 항목: ${interests.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" / ");
    const fullDetails = [details.trim(), extra].filter(Boolean).join(" / ");
    const selectedProjects = region !== "전체" ? [...(REGION_PROJECTS[region] ?? [])] : [];

    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occupation: occ,
          purposes,
          details: fullDetails,
          region: region !== "전체" ? region : undefined,
          projects: selectedProjects.length ? selectedProjects : undefined,
        }),
      });

      if (!res.ok) {
        setError("추천을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { datasets?: Dataset[] };
      const best = data.datasets?.[0];
      if (!best) {
        setError("맞는 데이터셋을 찾지 못했습니다. 조건을 바꿔 다시 시도해 주세요.");
        setLoading(false);
        return;
      }

      // 가장 적합한 데이터셋 하나로 지도 페이지로 곧장 이동(로딩 표시는 유지).
      const q = best.demoQuery;
      router.push(q ? `/demo?${q}` : "/demo");
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <main id="main" className="bg-surface2">
      {/* 다크 navy 히어로 */}
      <section className="on-navy bg-navy">
        <div className="container-x py-16 sm:py-20">
          <p className="eyebrow text-him-teal">AI 추천</p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-bold text-white sm:text-4xl">
            비즈니스에 맞는 데이터, AI가 직접 찾아드립니다
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base text-white/80">
            직업과 활용 목적, 관심 지역과 항목을 알려 주시면, 보유한 로봇 수집 데이터에서 가장
            잘 맞는 데이터셋을 골라 지도에서 바로 보여드립니다.
          </p>
        </div>
      </section>

      {/* 폼: 전체 화면 단일 컬럼(읽기 좋은 폭으로 가운데 정렬) */}
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex flex-col gap-10">
          {/* 01 직업 */}
          <Section step="01" title="직업" hint="가장 가까운 분야를 고르거나 직접 입력하세요.">
            <div className="flex flex-wrap gap-2">
              {OCCUPATIONS.map((o) => (
                <Chip key={o} active={occupation === o} onClick={() => setOccupation(o)}>
                  {o}
                </Chip>
              ))}
            </div>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="직접 입력 (예: 손해사정사, 도시계획 연구원)"
              className="mt-3 w-full rounded-md border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-him-blue"
            />
          </Section>

          {/* 02 활용 목적 */}
          <Section step="02" title="활용 목적" hint="복수 선택 가능합니다.">
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <Chip
                  key={p}
                  active={purposes.includes(p)}
                  onClick={() => toggle(purposes, p, setPurposes)}
                >
                  {p}
                </Chip>
              ))}
            </div>
          </Section>

          {/* 03 관심 지역 (단일) */}
          <Section
            step="03"
            title="관심 지역"
            hint="보유 데이터 기반 지역입니다. 선택 시 추천·지도가 그 지역으로 한정됩니다."
          >
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </Section>

          {/* 04 관심 항목 (복수) */}
          <Section step="04" title="관심 항목" hint="복수 선택 가능합니다.">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i}
                  active={interests.includes(i)}
                  onClick={() => toggle(interests, i, setInterests)}
                >
                  {i}
                </Chip>
              ))}
            </div>
          </Section>

          {/* 05 세부 내용 */}
          <Section step="05" title="세부 내용" hint="자유롭게 적어 주세요. (선택)">
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="예: 우천 시 사고가 잦은 구간을 찾아 보험료 산정에 활용하고 싶습니다."
              className="w-full resize-y rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-him-blue"
            />
          </Section>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "가장 맞는 데이터를 찾는 중…" : "AI 추천 받기 →"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="mono text-sm font-semibold text-him-blue">{step}</span>
        <h2 className="text-lg font-bold text-navy">{title}</h2>
      </div>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
        (active
          ? "border-navy bg-navy text-white"
          : "border-line bg-white text-ink/80 hover:border-navy-300 hover:text-navy")
      }
    >
      {children}
    </button>
  );
}
