"use client";

// HOVI — customer-friendly in-demo assistant.
// HARD RULE: never render tool traces, SQL, tool names, or table/column names.
// From the trace we extract ONLY the "N건" number; the applied filter is shown
// as friendly "관련 데이터" chips. Keep the default export and the onApplyFilter
// prop (DemoApp wires its applyPatch into this).
import { useEffect, useRef, useState } from "react";
import { EVENT_TYPES, REGION_PROJECTS } from "@/lib/schema";

// ── Types ───────────────────────────────────────────────────────────────────
type Insight = { title: string; body: string; stat?: string };
type Related = { chips: string[]; note?: string };
type Msg =
  | { role: "user"; text: string }
  | { role: "agent"; insight: Insight; related?: Related };

// slug → 한글 라벨 (e.g. illegal_parking → 불법주정차).
const ELABEL = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e.label]));

// project 이름 → 지역 라벨 (e.g. busan → 부산). 고객 화면엔 지역명만 노출.
const PROJECT_REGION: Record<string, string> = {};
for (const [region, projects] of Object.entries(REGION_PROJECTS)) {
  for (const p of projects) PROJECT_REGION[p] = region;
}

// Applied filter shape coming back from the agent / scenarios (loose).
type ApplyFilter = {
  events?: string[];
  projects?: string[];
  roads?: string[];
  from?: number;
  to?: number;
};

// ── relatedFromFilter ──────────────────────────────────────────────────────
// Build the "관련 데이터" chips from the applied filter + an optional count.
function relatedFromFilter(f?: ApplyFilter, count?: string): Related | undefined {
  if (!f && !count) return undefined;
  const chips: string[] = [];
  if (f?.events?.length) for (const e of f.events) chips.push(ELABEL[e] ?? e);
  if (f?.projects?.length) {
    const regions = Array.from(
      new Set(f.projects.map((p) => PROJECT_REGION[p] ?? p))
    );
    for (const r of regions) chips.push(r);
  }
  if (f?.roads?.length) for (const r of f.roads) chips.push(r);
  if (f?.from !== undefined || f?.to !== undefined) chips.push("기간 지정");
  if (count) chips.push(count);

  const hasFilter = !!(
    f &&
    ((f.events && f.events.length) ||
      (f.projects && f.projects.length) ||
      (f.roads && f.roads.length) ||
      f.from !== undefined ||
      f.to !== undefined)
  );
  if (!chips.length) return undefined;
  return { chips, note: hasFilter ? "지도·차트에 반영했어요" : undefined };
}

// ── extractCount ─────────────────────────────────────────────────────────────
// Pull ONLY the first "N건" number out of the trace summaries. Tool names and
// inputs are discarded — never rendered.
function extractCount(trace?: { summary?: string }[]): string | undefined {
  if (!Array.isArray(trace)) return undefined;
  for (const t of trace) {
    const m = typeof t?.summary === "string" ? t.summary.match(/([\d,]+)\s*건/) : null;
    if (m) return `${m[1]}건`;
  }
  return undefined;
}

// Keep only known fields from an applied filter (defense for what we render).
function cleanApply(f: unknown): ApplyFilter | undefined {
  if (!f || typeof f !== "object") return undefined;
  const src = f as Record<string, unknown>;
  const out: ApplyFilter = {};
  if (Array.isArray(src.events)) out.events = src.events.filter((x): x is string => typeof x === "string");
  if (Array.isArray(src.projects)) out.projects = src.projects.filter((x): x is string => typeof x === "string");
  if (Array.isArray(src.roads)) out.roads = src.roads.filter((x): x is string => typeof x === "string");
  if (typeof src.from === "number") out.from = src.from;
  if (typeof src.to === "number") out.to = src.to;
  return out;
}

// ── Scenarios (no-key / error fallback) ─────────────────────────────────────
// Customer phrasing only — NO SQL, NO tool names. Each gives an insight and an
// optional filter to sync the dashboard.
type Scenario = { match: RegExp; insight: Insight; filter?: ApplyFilter };
const SCENARIOS: Scenario[] = [
  {
    match: /포트홀|도로\s*파|파임/,
    insight: {
      title: "포트홀 분포",
      stat: "22,487건",
      body: "전국에서 수집된 포트홀은 약 22,487건으로, 도로 이벤트 중 두 번째로 많습니다. 광주권에서 특히 자주 관측되며, 주요 간선도로를 따라 집중되는 경향이 있습니다.",
    },
    filter: { events: ["pothole"] },
  },
  {
    match: /사고|교통사고/,
    insight: {
      title: "사고 발생",
      stat: "777건",
      body: "사고는 약 777건으로 도로 이벤트 중 가장 드물지만, 발생 시 영향이 큰 항목입니다. 교통량이 많은 지역에 상대적으로 몰려 있습니다.",
    },
    filter: { events: ["accident"] },
  },
  {
    match: /시간대|몇\s*시|시간|언제|수집량/,
    insight: {
      title: "시간대별 수집량",
      body: "수집량은 낮 시간대에 가장 많고 새벽에 가장 적습니다. 출퇴근 시간대를 전후로 관측이 늘어나는 패턴이 또렷합니다.",
    },
  },
  {
    match: /비\s*올|우천|날씨|강우|비가/,
    insight: {
      title: "우천 시 사고",
      body: "날씨별 사고 비율을 직접 비교한 결과, 비가 오는 날의 사고 비중이 맑은 날보다 눈에 띄게 높았습니다. 노면이 젖은 구간에서 위험이 커지는 것으로 보입니다.",
    },
    filter: { events: ["accident"] },
  },
  {
    match: /수집처|수집\s*지|어디서|많이\s*수집|수집.*많/,
    insight: {
      title: "수집량이 많은 곳",
      body: "수집량은 광주권에서 가장 많고, 이어 수도권 주요 지역에서 활발합니다. 로봇 운행이 집중된 도심 간선도로를 중심으로 데이터가 쌓입니다.",
    },
    filter: { projects: ["aban", "gwangju-loop", "sangmu", "pungam"] },
  },
  {
    match: /부산|대구|대전|울산|세종|지역|도시|광주|수도권/,
    insight: {
      title: "지역별 현황",
      body: "지역별로 보면 광주권의 수집량이 가장 많고, 부산·대구·대전 등 광역시에서도 꾸준히 데이터가 모이고 있습니다. 지역마다 자주 발생하는 도로 상황이 조금씩 다릅니다.",
    },
  },
];

const SUGGESTIONS = [
  "도시별로 데이터가 가장 많은 곳은?",
  "전국에서 포트홀이 가장 많은 지역은?",
  "비 올 때 사고가 얼마나 늘어?",
  "수집량이 가장 많은 시간대는?",
  "부산에서 가장 흔한 도로 상황은?",
];

function matchScenario(q: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.match.test(q));
}

// ── Presentational pieces ─────────────────────────────────────────────────────
function AgentAnswer({ insight, related }: { insight: Insight; related?: Related }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e1626] p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#2dd4bf]">{insight.title}</h4>
        {insight.stat && (
          <span className="mono shrink-0 text-sm font-bold text-slate-100">{insight.stat}</span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{insight.body}</p>
      {related && related.chips.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="mb-1.5 text-[11px] font-medium text-slate-500">관련 데이터</div>
          <div className="flex flex-wrap gap-1.5">
            {related.chips.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-[#2dd4bf]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#2dd4bf]"
              >
                {c}
              </span>
            ))}
          </div>
          {related.note && (
            <div className="mt-2 text-[11px] text-slate-500">📍 {related.note}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Pending() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-slate-400">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf] [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf] [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf]" />
      </span>
      <span className="text-xs">관련 데이터를 살펴보는 중…</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AgentPanel({
  onApplyFilter,
}: {
  onApplyFilter?: (p: any) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pending]);

  function pushScripted(q: string) {
    const sc = matchScenario(q);
    if (sc) {
      const related = relatedFromFilter(sc.filter);
      setMsgs((m) => [...m, { role: "agent", insight: sc.insight, related }]);
      if (sc.filter) onApplyFilter?.(sc.filter);
    } else {
      setMsgs((m) => [
        ...m,
        {
          role: "agent",
          insight: {
            title: "HOVI",
            body: "질문과 관련된 데이터를 찾아 보여드릴게요. 지역·기간·도로 상황을 함께 말씀해 주시면 더 정확히 안내할 수 있어요. 아래 추천 질문도 참고해 보세요.",
          },
        },
      ]);
    }
  }

  async function ask(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setPending(true);
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.noKey || !d.answer) {
        pushScripted(question);
      } else {
        const applied = d.applyFilter ? cleanApply(d.applyFilter) : undefined;
        const related = relatedFromFilter(applied, extractCount(d.trace));
        setMsgs((m) => [
          ...m,
          { role: "agent", insight: { title: "HOVI", body: d.answer }, related },
        ]);
        onApplyFilter?.(applied);
      }
    } catch {
      pushScripted(question);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#0b1220]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dd4bf] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dd4bf]" />
        </span>
        <span className="text-sm font-semibold text-[#2dd4bf]">HOVI</span>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {msgs.length === 0 && !pending && (
          <p className="px-1 py-2 text-[13px] leading-relaxed text-slate-400">
            자연어로 물어보면 HOVI가 관련 데이터를 찾아 지도·차트로 보여주고 핵심만 정리해
            답합니다. 아래 추천 질문을 눌러보세요.
          </p>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[#2dd4bf]/15 px-3 py-2 text-[13px] text-slate-100">
                {m.text}
              </div>
            </div>
          ) : (
            <AgentAnswer key={i} insight={m.insight} related={m.related} />
          )
        )}
        {pending && <Pending />}
      </div>

      {/* Suggestions + input */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={pending}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="자연어로 질문하기…"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:border-[#2dd4bf]/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="shrink-0 rounded-md bg-[#2dd4bf] px-3.5 py-2 text-[13px] font-semibold text-[#06121f] transition-colors hover:bg-[#2dd4bf]/90 disabled:opacity-50"
          >
            질문
          </button>
        </form>
      </div>
    </div>
  );
}
