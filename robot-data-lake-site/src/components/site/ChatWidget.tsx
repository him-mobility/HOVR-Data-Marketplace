"use client";

// Floating "HOVR Q&A" widget — on every non-/demo page. Answers come from the
// customer-scoped knowledge base via /api/chat. Customer hygiene: only the
// customer-scoped sources (customer chunk titles) ever appear as 출처 chips.
import { useEffect, useRef, useState } from "react";
import { SUGGESTED } from "@/lib/kb";

type Msg =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; sources?: string[] };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pending, open]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setPending(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await r.json().catch(() => ({}));
      const text =
        typeof d?.answer === "string" && d.answer
          ? d.answer
          : "지금은 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.";
      const sources = Array.isArray(d?.sources) ? (d.sources as string[]) : [];
      setMsgs((m) => [...m, { role: "bot", text, sources }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "bot", text: "지금은 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.", sources: [] },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {/* Toggle */}
      <button
        type="button"
        aria-label={open ? "채팅 닫기" : "채팅 열기"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-2xl text-white shadow-lg transition-transform hover:scale-105"
      >
        <span aria-hidden>{open ? "✕" : "💬"}</span>
      </button>

      {/* Dialog */}
      {open && (
        <div
          role="dialog"
          aria-label="HOVR Q&A"
          className="fixed bottom-24 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 bg-navy px-4 py-3 text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-him-teal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-him-teal" />
            </span>
            <span className="text-sm font-semibold">HOVR Q&A</span>
            <span className="ml-auto text-xs text-white/60">근거 기반 답변</span>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
            {msgs.length === 0 && !pending && (
              <p className="px-1 py-2 text-[13px] leading-relaxed text-muted">
                HOVR와 수집 데이터에 대해 물어보세요. 답변은 자료에 근거하며 출처 섹션을 함께
                표시합니다.
              </p>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm bg-navy px-3 py-2 text-[13px] text-white">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="max-w-[90%] rounded-xl rounded-bl-sm border border-line bg-surface2 px-3 py-2 text-[13px] leading-relaxed text-ink">
                    {m.text}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.map((s, j) => (
                        <span
                          key={j}
                          className="mono inline-flex items-center rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-navy"
                        >
                          출처: {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
            {pending && (
              <div className="flex items-center gap-2 px-1 py-1 text-muted">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-him-teal [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-him-teal [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-him-teal" />
                </span>
                <span className="text-xs">답변 작성 중…</span>
              </div>
            )}
          </div>

          {/* Suggested + input */}
          <div className="border-t border-line p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={pending}
                  className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-[11px] text-ink/80 transition-colors hover:border-navy/30 hover:text-navy disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="질문을 입력하세요…"
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-navy/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="shrink-0 rounded-md bg-navy px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
