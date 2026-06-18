import Link from "next/link";
import HimWordmark from "@/components/brand/HimWordmark";
import GraphicMotive from "@/components/brand/GraphicMotive";
import { SITE } from "@/lib/content";

export default function SiteFooter() {
  return (
    <footer className="on-navy relative overflow-hidden bg-navy text-white/80">
      <GraphicMotive tone="light" className="pointer-events-none absolute right-0 top-0 h-full w-64 opacity-10" />
      <div className="container-x relative grid gap-8 py-12 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <HimWordmark height={24} className="text-white" />
            <span className="text-lg font-semibold text-white">HOVR</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">로봇이 도시를 주행하며 수집한 위치·관측·이벤트·미디어 데이터를 사고팔 수 있는 마켓플레이스. SQL 없이 자연어로 탐색하고 바로 받아보세요.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <Link href={SITE.demoUrl} className="text-white/80 transition-colors hover:text-white">대시보드 둘러보기</Link>
          <a href="/#pricing" className="text-white/80 transition-colors hover:text-white">요금 보기</a>
          <a href="mailto:sales@him-ai.com?subject=HOVR%20데이터%20구매%20문의" className="text-white/80 transition-colors hover:text-white">구매 문의</a>
          <p className="mt-4 text-white/50">{SITE.title} · by HIM</p>
        </div>
      </div>
    </footer>
  );
}
