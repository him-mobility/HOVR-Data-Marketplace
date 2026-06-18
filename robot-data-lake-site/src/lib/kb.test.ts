// kb.test.ts — customer-scope regression for the Q&A knowledge base.
import { describe, it, expect } from "vitest";
import { CUSTOMER_GOLDEN, retrieve, answerFromGolden } from "./kb";

describe("kb customer scope", () => {
  it("1) customer golden routing — each q routes to an answer containing a keyword", () => {
    let routed = 0;
    for (const g of CUSTOMER_GOLDEN) {
      const { answer } = answerFromGolden(g.q);
      if (g.keywords.some((k) => answer.includes(k))) routed++;
    }
    expect(routed).toBe(CUSTOMER_GOLDEN.length);
  });

  it("2) retrieve surfaces the golden's sources (>= sources-1)", () => {
    for (const g of CUSTOMER_GOLDEN) {
      const titles = retrieve(g.q, 3).map((c) => c.title);
      const hit = g.sources.filter((s) => titles.includes(s)).length;
      expect(hit).toBeGreaterThanOrEqual(g.sources.length - 1);
    }
  });

  it("3) internal sources never appear in any CUSTOMER_GOLDEN sources", () => {
    const INTERNAL = [
      "최대 교훈 — PRNG 정밀도 버그",
      "협업 6원칙",
      "AI Agent 설계",
      "배포",
      "데이터 정직성",
    ];
    const customerSources = new Set(CUSTOMER_GOLDEN.flatMap((g) => g.sources));
    for (const s of INTERNAL) {
      expect(customerSources.has(s)).toBe(false);
    }
  });

  it("4) out-of-corpus queries return out-of-scope (grounded:false + 범위 밖)", () => {
    const queries = ["HIM 매출은 얼마야?", "오늘 날씨 어때?", "대표 전화번호 알려줘"];
    for (const q of queries) {
      const r = answerFromGolden(q);
      expect(r.grounded).toBe(false);
      expect(r.answer).toContain("범위 밖");
    }
  });
});
