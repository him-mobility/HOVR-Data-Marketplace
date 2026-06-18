import { describe, it, expect } from "vitest";
import { CUSTOMER_GOLDEN, retrieve, answerFromGolden } from "./kb";

describe("kb customer scope", () => {
  it("1. each customer golden question routes to an answer containing one of its keywords", () => {
    let hits = 0;
    for (const g of CUSTOMER_GOLDEN) {
      const { answer } = answerFromGolden(g.q);
      if (g.keywords.some((k) => answer.includes(k))) hits++;
    }
    expect(hits).toBe(CUSTOMER_GOLDEN.length);
  });

  it("2. retrieve surfaces at least one of the golden sources", () => {
    let hits = 0;
    for (const g of CUSTOMER_GOLDEN) {
      const titles = retrieve(g.q, 3).map((c) => c.title);
      if (g.sources.some((s) => titles.includes(s))) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(CUSTOMER_GOLDEN.length - 1);
  });

  it("3. internal sources never appear in CUSTOMER_GOLDEN", () => {
    const internalTitles = [
      "최대 교훈 — PRNG 정밀도 버그",
      "협업 6원칙",
      "AI Agent 설계",
      "배포",
      "데이터 정직성",
    ];
    const customerSources = new Set(CUSTOMER_GOLDEN.flatMap((g) => g.sources));
    for (const t of internalTitles) expect(customerSources.has(t)).toBe(false);
  });

  it("4. out-of-corpus questions are not grounded and say 범위 밖", () => {
    for (const q of ["HIM 매출은 얼마야?", "오늘 날씨 어때?", "대표 전화번호 알려줘"]) {
      const r = answerFromGolden(q);
      expect(r.grounded).toBe(false);
      expect(r.answer).toContain("범위 밖");
    }
  });
});
