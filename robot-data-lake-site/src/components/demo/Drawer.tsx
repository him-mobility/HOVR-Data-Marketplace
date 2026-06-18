"use client";

import { useEffect, useState } from "react";
import { EVENT_TYPES } from "@/lib/schema";

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));

type Detail = {
  position?: {
    idx: number;
    robot_id: string;
    project: string;
    ts: number;
    lat: number;
    lng: number;
    road_name: string;
    heading: number;
    speed: number;
  };
  observation?: {
    object_type: string;
    object_count: number;
    weather_condition: string;
    road_surface: string;
    visibility: number;
    traffic_density: string;
  };
  event?: { event_type: string };
  media?: { hasThumbnail: boolean; hasClip: boolean };
};

function fmtFull(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h4>
  );
}

export default function Drawer({ idx, onClose }: { idx: number | null; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);

  useEffect(() => {
    if (idx == null) {
      setData(null);
      return;
    }
    let cancelled = false;
    setData(null);
    fetch(`/api/record/${idx}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [idx]);

  if (idx == null) return null;

  const ev = data?.event ? EMAP[data.event.event_type] : undefined;
  const pos = data?.position;
  const obs = data?.observation;
  const media = data?.media;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-[#0d1320] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">수집 레코드 상세</h3>
            <span className="mono text-xs text-slate-500">#{idx}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md px-2 py-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            {pos && (
              <span className="mono inline-flex items-center rounded-md bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                {pos.robot_id}
              </span>
            )}
            {ev && (
              <span
                className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium"
                style={{ background: `${ev.color}22`, borderColor: ev.color, color: ev.color }}
              >
                {ev.label}
              </span>
            )}
          </div>

          {pos && (
            <>
              <SectionTitle>위치</SectionTitle>
              <Field label="수집처" value={pos.project} />
              <Field label="도로" value={pos.road_name} />
              <Field label="좌표" value={<span className="mono">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>} />
              <Field label="시각" value={<span className="mono">{fmtFull(pos.ts)}</span>} />
              <Field label="이동" value={<span className="mono">{Math.round(pos.speed)}km/h · {Math.round(pos.heading)}°</span>} />
            </>
          )}

          {obs && (
            <>
              <SectionTitle>현장 관측</SectionTitle>
              <Field label="관측 대상" value={`${obs.object_type}×${obs.object_count}`} />
              <Field label="날씨·노면" value={`${obs.weather_condition}·${obs.road_surface}`} />
              <Field label="시정·혼잡" value={`${obs.visibility}m·${obs.traffic_density}`} />
            </>
          )}

          <SectionTitle>사진·영상</SectionTitle>
          {media && (media.hasThumbnail || media.hasClip) ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-slate-400">
              썸네일 미리보기
            </div>
          ) : (
            <p className="text-sm text-slate-500">이 레코드에는 사진·영상이 없습니다.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
