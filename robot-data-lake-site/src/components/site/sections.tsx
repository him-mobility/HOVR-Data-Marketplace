import Link from "next/link";
import Section from "@/components/site/Section";
import GraphicMotive from "@/components/brand/GraphicMotive";
import { HERO, SALES, PRICING, LINEAGE, EVENTS, DISPLAY_TOTAL } from "@/lib/content";

export function Hero() {
  return (
    <section className="on-navy relative overflow-hidden bg-navy text-white">
      <GraphicMotive
        tone="light"
        className="pointer-events-none absolute right-0 top-0 h-80 w-2/3 opacity-[0.12]"
      />
      <div className="container-x relative py-20 md:py-28">
        <p className="eyebrow">{HERO.eyebrow}</p>
        <h1 className="text-4xl font-bold leading-[1.15] md:text-6xl max-w-4xl text-balance break-keep text-white">
          {HERO.headline}
        </h1>
        <p className="mt-6 text-lg text-white/80 max-w-2xl">{HERO.sub}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={HERO.ctaPrimary.href}
            className="animate-fadeup inline-flex items-center gap-2 rounded-lg bg-[#2dd4bf] px-6 py-3.5 text-base font-semibold text-[#06121f] shadow-lg hover:bg-[#2dd4bf]/90"
          >
            <span aria-hidden>✨</span>
            {HERO.ctaPrimary.label} →
          </Link>
          <a
            href={HERO.ctaSecondary.href}
            className="rounded-md border border-white/30 px-5 py-3 font-medium text-white hover:bg-white/10"
          >
            {HERO.ctaSecondary.label}
          </a>
        </div>
        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/10 sm:grid-cols-4">
          {HERO.stats.map((s) => (
            <div key={s.label} className="bg-navy p-5">
              <dt className="text-sm text-white/60">{s.label}</dt>
              <dd className="mono mt-1 text-2xl font-semibold text-white md:text-3xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function DataSales() {
  return (
    <Section id="data" index="01" eyebrow={SALES.eyebrow} title={SALES.title}>
      <p className="max-w-3xl text-lg text-ink text-pretty">{SALES.lead}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {SALES.datasets.map((d) => (
          <div key={d.code} className="rounded-md border border-line bg-surface2 p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="mono flex h-7 w-7 items-center justify-center rounded bg-navy text-sm font-semibold text-white">
                {d.code}
              </span>
              <span className="mono text-xs text-him-blue">{d.unit}</span>
            </div>
            <h3 className="mt-3 text-lg">{d.name}</h3>
            <p className="mt-2 text-[15px] text-muted">{d.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/demo"
          className="inline-flex items-center rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white"
        >
          표본 데이터 둘러보기 →
        </Link>
        <a
          href="mailto:sales@him-ai.com?subject=HOVR%20데이터%20구매%20문의"
          className="inline-flex items-center rounded-md border border-navy/30 px-5 py-2.5 text-sm font-medium text-navy"
        >
          구매 문의
        </a>
      </div>
    </Section>
  );
}

export function Lineage() {
  const max = Math.max(...EVENTS.map((e) => e.count));
  return (
    <Section id="lineage" index="02" eyebrow="데이터 구성" title="데이터가 이렇게 연결됩니다">
      <div className="grid gap-4 lg:grid-cols-4">
        {LINEAGE.map((l, i) => (
          <div
            key={l.code}
            className="relative rounded-md border border-line bg-surface2 p-5 shadow-card"
          >
            <span className="mono flex h-7 w-7 items-center justify-center rounded bg-navy text-sm font-semibold text-white">
              {l.code}
            </span>
            <h3 className="mono mt-3 text-navy">{l.name}</h3>
            <p className="mt-1 text-sm text-muted">{l.role}</p>
            <p className="mono mt-3 text-xs text-muted">{l.cols}</p>
            <p className="mono mt-1 text-xs text-him-teal">{l.rel}</p>
            {i < LINEAGE.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-3 top-1/2 hidden lg:block text-line"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <h3 className="mt-12 text-lg">
        도로 상황별 데이터 양 · 총 {DISPLAY_TOTAL.toLocaleString("en-US")}건
      </h3>
      <ul className="mt-4 space-y-2.5">
        {EVENTS.map((e) => (
          <li key={e.slug} className="flex items-center gap-3">
            <span className="w-24 text-sm">{e.label}</span>
            <span className="relative h-4 flex-1 rounded-full bg-surface2">
              <span
                className="absolute left-0 top-0 h-4 rounded-full"
                style={{ width: `${(e.count / max) * 100}%`, backgroundColor: e.color }}
              />
            </span>
            <span className="mono w-24 text-right">{e.count.toLocaleString("en-US")}</span>
            <span className="mono w-14 text-right text-muted">{e.pct}%</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" index="03" eyebrow={PRICING.eyebrow} title={PRICING.title}>
      <div className="grid gap-5 md:grid-cols-3">
        {PRICING.plans.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-lg border p-6 shadow-card ${
              p.highlight ? "border-navy bg-navy text-white" : "border-line bg-surface"
            }`}
          >
            <h3 className={p.highlight ? "text-lg text-white" : "text-lg"}>{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="mono text-3xl font-bold">{p.price}</span>
              {p.period && (
                <span className={p.highlight ? "text-sm text-white/70" : "text-sm text-muted"}>
                  {p.period}
                </span>
              )}
            </div>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-him-teal">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={p.href}
              className={`mt-6 inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium ${
                p.highlight ? "bg-white text-navy" : "bg-navy text-white"
              }`}
            >
              {p.cta}
            </a>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">{PRICING.note}</p>
    </Section>
  );
}
