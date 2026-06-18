import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieve, answerFromGolden } from "@/lib/kb";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-6";

// Customer-hygiene system prompt (verbatim, spec 06 §B). {evidence} is the only
// grounding the model gets — assembled from CUSTOMER_CHUNKS, never internal ones.
function systemPrompt(evidence: string): string {
  return `당신은 HOVR(HIM의 로봇 데이터 마켓플레이스) 안내 도우미입니다.
규칙:
- 아래 [근거] 발췌에 있는 내용으로만 답합니다. 추측하지 않습니다.
- 근거에 없으면 "제가 안내할 수 있는 범위 밖이라 확인되지 않습니다"라고 답하고 답할 수 있는 주제를 1~2개 제안합니다.
- SQL·도구명·테이블/컬럼명 등 내부 구현 용어나, 합성 데이터 여부·개발 과정·인프라처럼 고객과 무관한 내용은 답하지 않습니다.
- 한국어로 정확하게. 핵심을 먼저, 필요하면 근거를 충분히. 수치·고유명사는 근거 그대로 인용.

[근거]
${evidence}`;
}

export async function POST(req: NextRequest) {
  let question: unknown;
  try {
    ({ question } = await req.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "질문을 입력하세요." }, { status: 400 });
  }

  if (!rateLimit("chat:" + clientKey(req))) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, { status: 429 });
  }

  const chunks = retrieve(question, 3); // customer scope
  const sources = chunks.map((c) => c.title);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // key-optional: deterministic golden fallback (customer scope).
    return NextResponse.json(answerFromGolden(question));
  }

  try {
    const client = new Anthropic({ apiKey });
    const evidence = chunks.map((c) => `## ${c.title}\n${c.text}`).join("\n\n");
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt(evidence),
      messages: [{ role: "user", content: question }],
    });
    const answer = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!answer) return NextResponse.json({ ...answerFromGolden(question), note: "fallback" });
    return NextResponse.json({ answer, sources, grounded: true });
  } catch {
    return NextResponse.json({ ...answerFromGolden(question), note: "fallback" });
  }
}
