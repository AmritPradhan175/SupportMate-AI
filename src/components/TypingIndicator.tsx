import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-700 text-violet-300 ring-1 ring-white/10"
      >
        <Sparkles className="size-4" />
      </span>
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-white/10 bg-ink-800/80 px-4 py-3.5">
        <span aria-hidden="true" className="flex items-center gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="typing-dot size-1.5 rounded-full bg-violet-300"
              style={{ animationDelay: `${dot * 0.15}s` }}
            />
          ))}
        </span>
        <span className="text-sm text-mist-300">Searching the knowledge base...</span>
      </div>
    </div>
  );
}
