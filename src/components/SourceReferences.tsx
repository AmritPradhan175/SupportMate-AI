import { BookOpen } from "lucide-react";
import type { ChatSource } from "@/types/chat";

export function SourceReferences({ sources }: { sources: readonly ChatSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="mb-2 text-xs font-medium text-mist-400">
        {sources.length === 1 ? "Answer based on this FAQ" : "Answer based on these FAQs"}
      </p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <li
            key={source.id}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-aqua-400/30 bg-aqua-400/10 px-3 py-1 text-xs text-aqua-300"
          >
            <BookOpen aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{source.question}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
