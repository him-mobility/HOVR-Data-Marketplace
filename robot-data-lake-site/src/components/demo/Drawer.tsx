"use client";

import { useEffect, useState } from "react";
import { EVENT_TYPES } from "@/lib/schema";

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));

const OBJECT_LABELS: Record<string, string> = {
  car: "승용차", truck: "트럭", bus: "버스", motorcycle: "오토바이",
  pedestrian: "보행자", bicycle: "자전거",
};
const SURFACE_LABELS: Record<string, string> = { dry: "건조", wet: "젖음", snow: "적설" };
const TRAFFIC_LABELS: Record<string, string> = { low: "원활", medium: "보통", high: "혼잡" };

type Detail = {
  position?: {
    idx: number; robot_id: string; project: string; ts: number; lat: number; lng: number;
    road_name: string; heading: number; speed: number;
  };
  observation?: {
    object_type: string; object_count: number; weather_condition: string;
    road_surface: string; visibility: number; traffic_density: string;
  };
  event?: { event_type: string };
  media?: unknown;
};

function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{children}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0e1626] p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </section>
  );
}

export default function Drawer({ idx, onClose }: { idx: number | null; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (idx == null) return;
    setData(null);
    fetch(`/api/record/${idx}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [idx]);

  if (idx == null) return null;

  const pos = data?.position;
  const obs = data?.observation;
  const ev = data?.event ? EMAP[data.event.event_type] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-[#0d1320] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">수집 레코드 상세</h3>
            <p className="font-mono text-xs text-slate-500">#{idx}</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {!data ? (
            <p className="text-sm text-slate-500">불러오는 중…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {pos && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300">
                    {pos.robot_id}
                  </span>
                )}
                {ev && (
                  <span
                    className="rounded-full border px-2.5 py-1 text-xs font-medium"
                    style={{ background: `${ev.color}22`, borderColor: ev.color, color: ev.color }}
                  >
                    {ev.label}
                  </span>
                )}
              </div>

              {pos && (
                <Block title="위치">
                  <Field label="수집처">{pos.project}</Field>
                  <Field label="도로">{pos.road_name}</Field>
                  <Field label="좌표">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</Field>
                  <Field label="시각">{fmtDateTime(pos.ts)}</Field>
                  <Field label="주행">{Math.round(pos.speed)}km/h · {Math.round(pos.heading)}°</Field>
                </Block>
              )}

              {obs && (
                <Block title="현장 관측">
                  <Field label="대상">{OBJECT_LABELS[obs.object_type] ?? obs.object_type} × {obs.object_count}</Field>
                  <Field label="환경">{obs.weather_condition} · {SURFACE_LABELS[obs.road_surface] ?? obs.road_surface}</Field>
                  <Field label="시야">{Math.round(obs.visibility)}m · {TRAFFIC_LABELS[obs.traffic_density] ?? obs.traffic_density}</Field>
                </Block>
              )}

              <Block title="사진·영상">
                {data.media ? (
                  <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#0b1220] text-xs text-slate-500">
                    썸네일 미리보기
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">이 레코드에는 연결된 시각 자료가 없습니다.</p>
                )}
              </Block>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
