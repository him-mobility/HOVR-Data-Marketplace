"use client";

import { useRef, useState } from "react";
import { SUGGESTED } from "@/lib/kb";

// Floating bottom-right HOVR Q&A widget. Answers are grounded in customer-scope
// knowledge only (the /api/chat route filters out internal chunks), so source
// chips here can only ever show customer-facing titles.

type Msg = { role: "user"; text: string } | { role: "bot"; text: string; sources?: string[] };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async function ask(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setText("");
    setPending(true);
    scrollToEnd();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await res.json().catch(() => ({}));
      const answer =
        typeof d.answer === "string" && d.answer.trim()
          ? d.answer
          : "지금은 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.";
      const sources = Array.isArray(d.sources) ? (d.sources as string[]) : [];
      setMsgs((m) => [...m, { role: "bot", text: answer, sources }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "bot", text: "지금은 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요." },
      ]);
    } finally {
      setPending(false);
      scrollToEnd();
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "HOVR Q&A 닫기" : "HOVR Q&A 열기"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105"
      >
        <span className="text-xl" aria-hidden>
          {open ? "✕" : "💬"}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          {/* header */}
          <div className="flex items-center gap-2 bg-navy px-4 py-3 text-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-him-teal opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-him-teal" />
            </span>
            <span className="text-sm font-semibold">HOVR Q&amp;A</span>
            <span className="ml-auto text-xs text-white/60">근거 기반 답변</span>
          </div>

          {/* conversation */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {msgs.length === 0 && !pending && (
              <p className="px-2 py-6 text-center text-sm leading-relaxed text-muted">
                HOVR와 수집 데이터에 대해 물어보세요. 답변은 자료에 근거하며 출처 섹션을 함께 표시합니다.
              </p>
            )}

            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3 py-2 text-sm text-white">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start gap-1.5">
                  <div className="max-w-[92%] whitespace-pre-line rounded-2xl rounded-bl-sm border border-line bg-surface2 px-3 py-2 text-sm leading-relaxed text-ink">
                    {m.text}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {m.sources.map((s, j) => (
                        <span
                          key={j}
                          className="mono rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-navy"
                        >
                          출처: {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {pending && <p className="px-1 text-sm text-muted">답변 작성 중…</p>}
          </div>

          {/* suggested + composer */}
          <div className="border-t border-line px-3 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={pending}
                  className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-xs text-ink/80 transition-colors hover:bg-line/60 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(text);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="질문을 입력하세요…"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-navy/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={pending || !text.trim()}
                className="shrink-0 rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
