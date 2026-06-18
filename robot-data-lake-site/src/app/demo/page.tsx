import type { Metadata } from "next";
import DemoApp from "@/components/demo/DemoApp";

export const metadata: Metadata = {
  title: "HOVR Explorer — 데이터 대시보드",
};

export default function DemoPage() {
  return <DemoApp />;
}
