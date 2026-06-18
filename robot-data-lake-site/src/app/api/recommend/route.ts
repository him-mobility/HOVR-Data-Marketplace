import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSchemaContext,
  schemaContextToText,
  finalizeDataset,
  ruleBasedRecommend,
  type RecDataset,
} from "@/lib/recommend";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.RECOMMEND_MODEL || "claude-sonnet-4-6";

// Customer-hygiene system prompt: the model recommends customer-safe datasets
// only. filters use customer-facing keys (events slug / weather / projects /
// regions). No SQL, tool names, table/column names, synthetic/dev/infra facts.
const SYSTEM = `당신은 HOVR(HIM의 로봇 데이터 마켓플레이스) 데이터 추천 전문가입니다.
사용자의 직업·활용목적·관심지역·관심항목·세부내용을 보고, 보유 데이터에서 가장 잘 맞는 데이터셋을 추천합니다.
규칙:
- 아래 [데이터 현황]에 실제로 존재하는 값만 사용합니다. 0건이 나오는 조합은 추천하지 않습니다.
- 각 데이터셋의 filters는 다음 키만 씁니다: events(이벤트 슬러그 배열), weather(날씨 배열), projects(수집처 배열), regions(지역 배열).
- 2~4개의 데이터셋을 적합도가 높은 순서로 제시합니다.
- SQL·도구명·테이블/컬럼명 등 내부 구현이나, 합성 여부·개발 과정·인프라처럼 고객과 무관한 내용은 절대 언급하지 않습니다.
- 반드시 아래 JSON 형식만 출력합니다. 설명 문장이나 코드블록 표시 없이 JSON 객체 하나만 출력하세요.

출력 형식:
{"datasets":[{"name":"데이터셋 이름","description":"한 줄 설명","tags":["#태그"],"domain":"both","filters":{"events":["슬러그"],"weather":[],"projects":[],"regions":[]},"reason":"왜 이 사용자에게 맞는지"}]}`;

function userMessage(
  occupation: string,
  purposes: string[],
  details: string | undefined,
  region: string | undefined,
  projects: string[] | undefined,
  ctx: string
): string {
  return `[데이터 현황]
${ctx}

[사용자 정보]
- 직업: ${occupation}
- 활용 목적: ${purposes.join(", ") || "(미지정)"}
- 관심 지역: ${region ?? "전체"}${
    projects?.length
      ? ` (수집처 ${projects.join(", ")}로 한정 — 추천 데이터의 filters.projects에 반드시 이 수집처들을 포함)`
      : ""
  }
- 세부 내용: ${details?.trim() || "(없음)"}

위 정보에 가장 잘 맞는 데이터셋을 JSON으로만 추천하세요.`;
}

export async function POST(req: NextRequest) {
  let body: {
    occupation?: unknown;
    purposes?: unknown;
    details?: unknown;
    region?: unknown;
    projects?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const occupation = typeof body.occupation === "string" ? body.occupation.trim() : "";
  const purposes = Array.isArray(body.purposes)
    ? body.purposes.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  const details = typeof body.details === "string" ? body.details : undefined;

  if (!occupation && purposes.length === 0) {
    return NextResponse.json({ error: "INPUT_REQUIRED" }, { status: 400 });
  }

  if (!rateLimit("rec:" + clientKey(req))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429 }
    );
  }

  const region = (typeof body.region === "string" ? body.region.trim() : "") || undefined;
  const projects =
    Array.isArray(body.projects) && body.projects.length
      ? body.projects.filter((p): p is string => typeof p === "string")
      : undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // key-optional: deterministic rule-based fallback (region reflected).
    return NextResponse.json({
      datasets: ruleBasedRecommend({ occupation, purposes, details }, { projects, region }),
      aiPowered: false,
    });
  }

  try {
    const ctx = schemaContextToText(buildSchemaContext());
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: userMessage(occupation, purposes, details, region, projects, ctx),
        },
      ],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no json");
    const parsed = JSON.parse(jsonMatch[0]) as { datasets?: unknown };
    if (!Array.isArray(parsed.datasets) || parsed.datasets.length === 0) {
      throw new Error("empty datasets");
    }

    const datasets: RecDataset[] = parsed.datasets
      .slice(0, 4)
      .map((d) => {
        const raw = (d ?? {}) as Omit<RecDataset, "totalCount" | "demoQuery">;
        // 관심지역 지정 시 각 dataset의 filters.projects를 강제 주입.
        return finalizeDataset(
          projects?.length
            ? { ...raw, filters: { ...raw.filters, projects } }
            : raw
        );
      });

    return NextResponse.json({ datasets, aiPowered: true });
  } catch {
    return NextResponse.json({
      datasets: ruleBasedRecommend({ occupation, purposes, details }, { projects, region }),
      aiPowered: false,
    });
  }
}
