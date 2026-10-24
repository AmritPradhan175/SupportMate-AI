"use client";

import { Check, Copy, LifeBuoy, Mail, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageModel } from "@/types/chat";
import { MarkdownText } from "./MarkdownText";
import { SourceReferences } from "./SourceReferences";

interface ChatMessageProps {
  message: ChatMessageModel;
  supportEmail: string;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({ message, supportEmail }: ChatMessageProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const time = (
    <time dateTime={new Date(message.createdAt).toISOString()} className="text-xs text-mist-400">
      {formatTime(message.createdAt)}
    </time>
  );

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="sr-only">You said:</p>
        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-linear-to-br from-indigo-600 to-violet-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-lg shadow-indigo-950/50 sm:max-w-[80%]">
          {message.content}
        </div>
        {time}
      </div>
    );
  }

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 2000);
  }

  const isFallback = message.fallback === true;

  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-700 text-violet-300 ring-1 ring-white/10"
      >
        <Sparkles className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="sr-only">Assistant said:</p>
        <div
          className={`max-w-full rounded-2xl rounded-tl-md border px-4 py-3 text-mist-200 sm:max-w-[90%] ${
            isFallback ? "border-amber-300/25 bg-amber-300/[0.05]" : "border-white/10 bg-ink-800/80"
          }`}
        >
          {isFallback && (
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-200">
              <LifeBuoy aria-hidden="true" className="size-4" />
              No reliable answer found
            </p>
          )}
          <MarkdownText text={message.content} />

          {isFallback && (
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent("Support request")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-300/15 px-3 py-1.5 text-sm font-medium text-amber-100 ring-1 ring-amber-300/40 transition-colors hover:bg-amber-300/25"
            >
              <Mail aria-hidden="true" className="size-3.5" />
              Email support
            </a>
          )}

          {!isFallback && <SourceReferences sources={message.sources ?? []} />}
        </div>

        <div className="mt-1.5 flex items-center gap-3">
          {time}
          <button
            type="button"
            onClick={copyAnswer}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-mist-400 transition-colors hover:bg-ink-700 hover:text-mist-50"
          >
            {copyState === "copied" ? (
              <Check aria-hidden="true" className="size-3.5 text-mint-400" />
            ) : (
              <Copy aria-hidden="true" className="size-3.5" />
            )}
            <span aria-live="polite">
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Couldn't copy" : "Copy answer"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
