import Link from "next/link";
import HimWordmark from "@/components/brand/HimWordmark";
import { NAV, SITE } from "@/lib/content";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${SITE.brand} 홈`} className="flex items-center gap-3">
          <HimWordmark height={22} className="text-navy" />
          <span className="hidden text-sm font-medium text-muted sm:inline">
            <span className="font-semibold text-navy">HOVR</span> <span className="text-muted">Data Marketplace</span>
          </span>
        </Link>
        <nav aria-label="섹션" className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) =>
            n.href === "/search" ? (
              <a key={n.href} href={n.href} className="inline-flex items-center gap-1 rounded-full bg-him-teal px-3.5 py-1.5 text-sm font-semibold text-navy shadow-sm ring-1 ring-him-teal/30 transition-all hover:bg-him-teal/90 hover:shadow-md">
                <span aria-hidden>✨</span>{n.label}
              </a>
            ) : (
              <a key={n.href} href={n.href} className="text-sm text-ink/80 transition-colors hover:text-navy">{n.label}</a>
            )
          )}
        </nav>
        <Link href={SITE.demoUrl} className="inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-700">표본 데이터 둘러보기 →</Link>
      </div>
    </header>
  );
}
