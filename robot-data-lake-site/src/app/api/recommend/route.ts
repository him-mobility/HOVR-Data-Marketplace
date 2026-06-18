import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import {
  buildSchemaContext,
  schemaContextToText,
  finalizeDataset,
  ruleBasedRecommend,
  type RecDataset,
} from "@/lib/recommend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.RECOMMEND_MODEL || "claude-haiku-4-5-20251001";

// SYSTEM prompt — HOVR recommend expert. Output is parsed into customer-facing
// cards, so the model must NOT surface SQL / tool names / table·column names /
// the synthetic nature of the data / PRNG / dev process / infra anywhere in the
// JSON (name·description·reason·tags). It only picks filters from the real,
// existing values listed in the user message and explains the fit in plain Korean.
const SYSTEM = `당신은 HIM의 로봇 데이터 마켓플레이스 "HOVR"의 데이터 추천 전문가입니다.
사용자의 직업·활용목적·관심사·관심지역을 보고, 보유 데이터 중에서 가장 잘 맞는 데이터셋 2~4개를 추천합니다.

출력 형식 — 아래 구조의 JSON만 출력하세요. 설명 문장, 코드펜스, 그 밖의 텍스트는 절대 붙이지 마세요.
{
  "datasets": [
    {
      "name": "데이터셋 이름(한국어, 짧고 구체적으로)",
      "description": "이 데이터가 무엇이고 어떻게 도움이 되는지 1~2문장(한국어)",
      "tags": ["#태그", "#태그"],
      "domain": "both",
      "filters": {
        "events": ["슬러그"],
        "weather": ["맑음" 또는 "비"/"눈"/"안개"],
        "projects": ["수집처"],
        "regions": ["지역"]
      },
      "reason": "이 사용자에게 왜 적합한지 1문장(한국어)"
    }
  ]
}

규칙:
- filters의 events는 반드시 제공된 이벤트 슬러그 중에서만 사용합니다. weather는 제공된 날씨 값 중에서만, projects는 제공된 수집처 중에서만, regions는 제공된 지역 중에서만 사용합니다.
- 실제 존재하는 값만 사용하고, 0건이 되는 조합은 추천하지 마세요.
- 데이터셋은 2~4개만 추천합니다.
- name·description·reason·tags에는 SQL, 도구명, 테이블/컬럼명 같은 내부 구현 용어나, 합성 데이터 여부·개발 과정·인프라처럼 고객과 무관한 내용을 절대 쓰지 마세요. 데이터가 보여주는 사실과 비즈니스 가치만 자연스러운 한국어로 전달하세요.
- 반드시 JSON만 출력하세요.`;

type Body = {
  occupation?: unknown;
  purposes?: unknown;
  details?: unknown;
  region?: unknown;
  projects?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const occupation = typeof body.occupation === "string" ? body.occupation.trim() : "";
  const purposes = Array.isArray(body.purposes)
    ? body.purposes.filter((p): p is string => typeof p === "string")
    : [];
  const details = typeof body.details === "string" ? body.details : undefined;

  if (!occupation || purposes.length === 0) {
    return NextResponse.json({ error: "INPUT_REQUIRED" }, { status: 400 });
  }

  if (!rateLimit("rec:" + clientKey(req))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429 }
    );
  }

  const region = typeof body.region === "string" && body.region.trim() ? body.region.trim() : undefined;
  const projects =
    Array.isArray(body.projects) && body.projects.length
      ? body.projects.filter((p): p is string => typeof p === "string")
      : undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key: rule-based fallback, still region/projects-aware.
    return NextResponse.json({
      datasets: ruleBasedRecommend({ occupation, purposes, details }, { projects, region }),
      aiPowered: false,
    });
  }

  try {
    const ctx = schemaContextToText(buildSchemaContext());
    const userMessage = [
      "다음 사용자에게 맞는 데이터셋을 추천하세요.",
      `- 직업: ${occupation}`,
      `- 활용 목적: ${purposes.join(", ")}`,
      details ? `- 세부 내용: ${details}` : "",
      `- 관심 지역: ${region ?? "전체"}${
        projects?.length
          ? ` (수집처 ${projects.join(", ")}로 한정 — 추천 데이터의 filters.projects에 반드시 이 수집처들을 포함)`
          : ""
      }`,
      "",
      "[보유 데이터 현황]",
      ctx,
    ]
      .filter(Boolean)
      .join("\n");

    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no json");
    const parsed = JSON.parse(m[0]) as { datasets?: Array<Omit<RecDataset, "totalCount" | "demoQuery">> };
    if (!Array.isArray(parsed.datasets) || parsed.datasets.length === 0) throw new Error("empty");

    const datasets = parsed.datasets
      .slice(0, 4)
      .map((d) =>
        finalizeDataset(
          projects?.length ? { ...d, filters: { ...d.filters, projects } } : d
        )
      );

    return NextResponse.json({ datasets, aiPowered: true });
  } catch {
    // Never surface internals on failure — fall back to the rule-based engine.
    return NextResponse.json({
      datasets: ruleBasedRecommend({ occupation, purposes, details }, { projects, region }),
      aiPowered: false,
    });
  }
}
