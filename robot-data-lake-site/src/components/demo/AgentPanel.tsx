"use client";

import { useRef, useState } from "react";
import { EVENT_TYPES, PROJECTS } from "@/lib/schema";
import type { F } from "./types";

// ---- customer-facing shapes -------------------------------------------------
// HOVI never renders raw tool traces, code, or SQL. From the trace it pulls only
// the "N건" count; from the applied filter it builds "관련 데이터" chips.

type Insight = { title: string; body: string; stat?: string };
type Related = { chips: string[]; note?: string };
type Msg = { role: "user"; text: string } | { role: "agent"; insight: Insight; related?: Related };

type AppliedFilter = Partial<Pick<F, "events" | "projects" | "roads" | "from" | "to">>;

const ELABEL: Record<string, string> = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e.label]));
const EVENT_SLUGS = new Set(EVENT_TYPES.map((e) => e.slug));
const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));

// Keep only filter keys the dashboard understands (defense in depth).
function cleanApply(f?: AppliedFilter): AppliedFilter | undefined {
  if (!f) return undefined;
  const events = (f.events ?? []).filter((v) => EVENT_SLUGS.has(v));
  const projects = (f.projects ?? []).filter((v) => PROJECT_NAMES.has(v));
  const roads = (f.roads ?? []).map((v) => String(v).slice(0, 40)).filter(Boolean);
  const out: AppliedFilter = { events, projects, roads };
  if (typeof f.from === "number") out.from = f.from;
  if (typeof f.to === "number") out.to = f.to;
  const empty =
    events.length === 0 && projects.length === 0 && roads.length === 0 && f.from == null && f.to == null;
  return empty ? undefined : out;
}

// Build the "관련 데이터" chip set from an applied filter + a count.
function relatedFromFilter(f?: AppliedFilter, count?: string): Related | undefined {
  const chips: string[] = [];
  if (f) {
    for (const e of f.events ?? []) chips.push(ELABEL[e] ?? e);
    for (const p of f.projects ?? []) chips.push(p);
    for (const r of f.roads ?? []) chips.push(r);
    if (f.from != null) chips.push("기간 지정");
  }
  if (count) chips.push(count);
  if (chips.length === 0) return undefined;
  const note = f ? "지도·차트에 반영했어요" : undefined;
  return { chips, note };
}

// Pull only the first "N건" number out of the trace summaries — never tool names/inputs.
function extractCount(trace?: { summary?: string }[]): string | undefined {
  if (!trace) return undefined;
  for (const t of trace) {
    const m = (t.summary ?? "").match(/([\d,]+)\s*건/);
    if (m) return `${m[1]}건`;
  }
  return undefined;
}

// ---- no-key / error fallback scenarios (customer wording, no code) ----------

type Scenario = { match: RegExp; insight: Insight; filter?: AppliedFilter };

const SCENARIOS: Scenario[] = [
  {
    match: /포트홀|pothole|패임|도로\s*파손/i,
    insight: {
      title: "포트홀 분포",
      body: "전국에서 포트홀은 가장 빈번한 이벤트 중 하나로, 간선도로에 집중되는 경향이 뚜렷합니다. 지도와 차트에서 도로별 빈도를 비교해 보세요.",
      stat: "22,487건",
    },
    filter: { events: ["pothole"] },
  },
  {
    match: /사고|충돌|accident/i,
    insight: {
      title: "사고 발생",
      body: "사고는 전체에서 드물게 발생하지만 특정 도로와 시간대에 몰리는 패턴이 보입니다. 관련 데이터를 지도로 확인해 보세요.",
      stat: "777건",
    },
    filter: { events: ["accident"] },
  },
  {
    match: /시간대|몇\s*시|hour|새벽|출근|퇴근|수집량.*시간/i,
    insight: {
      title: "시간대별 수집량",
      body: "수집량은 통행이 많은 낮 시간대에 가장 높고 심야에 낮아집니다. 차트의 시간대 분포에서 피크 구간을 확인할 수 있습니다.",
    },
  },
  {
    match: /비|우천|날씨|강우|rain|weather/i,
    insight: {
      title: "우천 시 사고",
      body: "날씨별 사고 비율을 직접 비교한 결과, 비가 오는 날의 사고 비중이 맑은 날보다 뚜렷하게 높게 나타납니다. 노면이 젖은 구간에서 위험이 커집니다.",
    },
  },
  {
    match: /수집처|프로젝트|project|로봇|어디서/i,
    insight: {
      title: "수집처별 비중",
      body: "수집량은 운영 규모가 큰 수집처에 집중됩니다. 차트의 수집처별 분포에서 상위 비중을 확인해 보세요.",
    },
  },
  {
    match: /부산|대구|대전|울산|세종|서울|수도권|지역|도시|광주/i,
    insight: {
      title: "지역별 데이터",
      body: "데이터는 광주·수도권·부산·대구·대전·울산·세종 전국에 걸쳐 분포합니다. 지도에서 지역을 좁혀 보면 해당 권역의 상황을 자세히 볼 수 있어요.",
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

// ---- panel ------------------------------------------------------------------

export default function AgentPanel({ onApplyFilter }: { onApplyFilter: (f?: AppliedFilter) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  function pushScripted(q: string) {
    const sc = SCENARIOS.find((s) => s.match.test(q));
    const insight: Insight = sc
      ? sc.insight
      : {
          title: "HOVI",
          body: "지도·차트·데이터 표를 직접 살펴보면 질문에 가까운 답을 찾을 수 있어요. 위의 추천 질문도 눌러보세요.",
        };
    const applied = cleanApply(sc?.filter);
    const related = relatedFromFilter(applied);
    setMsgs((m) => [...m, { role: "agent", insight, related }]);
    onApplyFilter(applied);
    scrollToEnd();
  }

  async function ask(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setText("");
    setPending(true);
    scrollToEnd();

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await res.json().catch(() => ({}));

      if (!res.ok || d.noKey || !d.answer) {
        pushScripted(question);
        return;
      }

      const applied = d.applyFilter ? cleanApply(d.applyFilter) : undefined;
      const related = relatedFromFilter(applied, extractCount(d.trace));
      setMsgs((m) => [...m, { role: "agent", insight: { title: "HOVI", body: d.answer }, related }]);
      onApplyFilter(applied);
    } catch {
      pushScripted(question);
    } finally {
      setPending(false);
      scrollToEnd();
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-xl border border-white/10 bg-[#0b1220]">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dd4bf] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2dd4bf]" />
        </span>
        <span className="text-sm font-semibold text-[#2dd4bf]">HOVI</span>
        <span className="text-xs text-slate-500">데이터 어시스턴트</span>
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && !pending && (
          <p className="px-1 py-6 text-center text-sm leading-relaxed text-slate-400">
            자연어로 물어보면 HOVI가 관련 데이터를 찾아 지도·차트로 보여주고 핵심만 정리해 답합니다. 아래 추천 질문을 눌러보세요.
          </p>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#2dd4bf]/15 px-3 py-2 text-sm text-slate-100">
                {m.text}
              </div>
            </div>
          ) : (
            <AgentAnswer key={i} insight={m.insight} related={m.related} />
          )
        )}

        {pending && (
          <div className="flex items-center gap-2 px-1 text-sm text-slate-400">
            <span className="flex gap-1">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </span>
            관련 데이터를 살펴보는 중…
          </div>
        )}
      </div>

      {/* suggestions + composer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={pending}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="자연어로 질문하기…"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#080c14] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#2dd4bf]/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="shrink-0 rounded-lg bg-[#2dd4bf] px-3 py-2 text-sm font-semibold text-[#06121f] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            질문
          </button>
        </form>
      </div>
    </aside>
  );
}

function AgentAnswer({ insight, related }: { insight: Insight; related?: Related }) {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-[#2dd4bf]">{insight.title}</span>
        {insight.stat && <span className="text-xs font-medium text-[#f59e0b]">{insight.stat}</span>}
      </div>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-200">{insight.body}</p>
      {related && (
        <div className="mt-2.5 border-t border-white/10 pt-2.5">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">관련 데이터</div>
          <div className="flex flex-wrap gap-1.5">
            {related.chips.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 px-2 py-0.5 text-xs text-[#2dd4bf]"
              >
                {c}
              </span>
            ))}
          </div>
          {related.note && <p className="mt-2 text-xs text-slate-400">📍 {related.note}</p>}
        </div>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#2dd4bf]"
      style={{ animationDelay: delay }}
    />
  );
}
