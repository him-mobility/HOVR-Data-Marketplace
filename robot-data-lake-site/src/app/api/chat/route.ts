import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { retrieve, answerFromGolden } from "@/lib/kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-6";

// Customer-hygiene system prompt. The model's answer is shown to the customer
// verbatim, so it must answer ONLY from the [근거] excerpts and never surface
// SQL / tool names / table·column names / synthetic-data facts / dev process /
// infra. Out-of-scope questions get the canned customer message.
function buildSystem(evidence: string): string {
  return `당신은 HOVR(HIM의 로봇 데이터 마켓플레이스) 안내 도우미입니다.
규칙:
- 아래 [근거] 발췌에 있는 내용으로만 답합니다. 추측하지 않습니다.
- 근거에 없으면 "제가 안내할 수 있는 범위 밖이라 확인되지 않습니다"라고 답하고 답할 수 있는 주제를 1~2개 제안합니다.
- SQL·도구명·테이블/컬럼명 등 내부 구현 용어나, 합성 데이터 여부·개발 과정·인프라처럼 고객과 무관한 내용은 답하지 않습니다.
- 한국어로 정확하게. 핵심을 먼저, 필요하면 근거를 충분히. 수치·고유명사는 근거 그대로 인용.

[근거]
${evidence}`;
}

export async function POST(req: Request) {
  let body: { question?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "질문을 입력하세요." }, { status: 400 });
  }

  if (!rateLimit("chat:" + clientKey(req))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429 }
    );
  }

  // Customer-scope retrieval — only CUSTOMER_CHUNKS are ever scanned.
  const chunks = retrieve(question, 3);
  const sources = chunks.map((c) => c.title);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key: answer from the customer golden corpus.
    const g = answerFromGolden(question);
    return NextResponse.json({ answer: g.answer, sources: g.sources, grounded: g.grounded });
  }

  try {
    const client = new Anthropic({ apiKey });
    const evidence = chunks.map((c) => `## ${c.title}\n${c.text}`).join("\n\n");
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystem(evidence),
      messages: [{ role: "user", content: question }],
    });
    const answer = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!answer) {
      const g = answerFromGolden(question);
      return NextResponse.json({
        answer: g.answer,
        sources: g.sources,
        grounded: g.grounded,
        note: "fallback",
      });
    }

    return NextResponse.json({ answer, sources, grounded: true });
  } catch {
    // Never surface internals on failure — fall back to the golden corpus.
    const g = answerFromGolden(question);
    return NextResponse.json({
      answer: g.answer,
      sources: g.sources,
      grounded: g.grounded,
      note: "fallback",
    });
  }
}
