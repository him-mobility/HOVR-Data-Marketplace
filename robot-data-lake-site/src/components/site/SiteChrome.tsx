"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import ChatWidget from "./ChatWidget";

const BARE = ["/demo"];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const bare = BARE.includes(path) || path.startsWith("/demo/");
  if (bare) {
    return <main id="main">{children}</main>;
  }
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
