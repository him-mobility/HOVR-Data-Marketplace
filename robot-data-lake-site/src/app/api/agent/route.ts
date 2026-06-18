import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { TOOL_DEFS, runTool } from "@/lib/agent-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-6";

// SYSTEM prompt — customer-hygiene paragraph included. Answers are shown to the
// customer verbatim, so no SQL / tool names / table·column names / synthetic /
// dev / infra talk may appear in the model's answer text.
const SYSTEM = `당신은 HIM의 로봇 데이터 마켓플레이스 "HOVR"의 데이터 분석 에이전트입니다.
데이터: 전국 주요 도시(광주·수도권·부산·대구·대전·울산·세종)에서 로봇이 수집한 약 98,043건. 4테이블(robot_position·observation·event·media).
이벤트 슬러그: illegal_parking pothole stopped_vehicle construction crowd flood accident.
프로젝트: aban, gwangju-loop, sangmu, pungam.
규칙:
- 자연어 질문을 도구 호출로 바꿔 데이터로 답하세요. 추측 금지, 도구 결과에 근거.
- 사용자가 특정 조건을 "보고/필터링"하려 하면 반드시 focus_dashboard로 대시보드를 동기화하세요.
- 단순 도구로 안 되면 run_readonly_sql(SELECT 전용)을 쓰세요.
- 최종 답변은 한국어로, 핵심 수치를 포함해 명확하게. 필요하면 여러 문장으로 충분히, 군더더기는 줄이고. 데이터가 풍부하면 분포·비교·추세를 짚어 줍니다.
- 답변은 고객 화면에 그대로 노출됩니다. SQL·도구명(search_records 등)·테이블/컬럼명 같은 내부 구현 용어나, 합성 데이터 여부·개발 과정·인프라 등 고객과 무관한 내용은 답변 본문에 절대 쓰지 마세요. 데이터가 보여주는 사실만 자연스러운 한국어로 전달하세요.`;

type Trace = { tool: string; input: unknown; summary: string };

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

  if (!rateLimit("agent:" + clientKey(req))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Client falls back to scripted scenarios.
    return NextResponse.json({ noKey: true });
  }

  try {
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: question },
    ];
    const trace: Trace[] = [];
    let applyFilter: unknown = undefined;
    let answer = "";

    for (let turn = 0; turn < 6; turn++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM,
        tools: TOOL_DEFS as unknown as Anthropic.Tool[],
        messages,
      });

      if (res.stop_reason === "tool_use") {
        // Echo the assistant turn (incl. tool_use blocks) before answering.
        messages.push({ role: "assistant", content: res.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of res.content) {
          if (block.type !== "tool_use") continue;
          const out = runTool(
            block.name,
            (block.input ?? {}) as Record<string, unknown>
          );
          trace.push({ tool: block.name, input: block.input, summary: out.summary });
          if (block.name === "focus_dashboard") {
            const data = out.data as { filter?: unknown };
            applyFilter = data?.filter;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(out.data).slice(0, 4000),
          });
        }
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // end_turn (or any non-tool stop): collect the answer text.
      answer = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      break;
    }

    return NextResponse.json({ answer, trace, applyFilter });
  } catch {
    // Never surface SQL / stack / internals to the client.
    return NextResponse.json({ error: "응답을 생성할 수 없습니다." }, { status: 500 });
  }
}
