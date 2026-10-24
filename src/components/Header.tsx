import { Database, Headset, SquarePen } from "lucide-react";

interface HeaderProps {
  appName: string;
  faqCount: number;
  canReset: boolean;
  onNewChat: () => void;
}

export function Header({ appName, faqCount, canReset, onNewChat }: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-ink-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/60 ring-1 ring-white/20"
          >
            <Headset className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight text-mist-50">{appName}</p>
            <p className="flex items-center gap-2 text-xs text-mist-400">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-mint-400 shadow-[0_0_8px_rgb(52_211_153/0.8)]" />
                Ready to help
              </span>
              <span aria-hidden="true" className="hidden text-ink-500 sm:inline">|</span>
              <span className="hidden items-center gap-1 sm:flex" title="Sample FAQs used for this demo">
                <Database aria-hidden="true" className="size-3" />
                Demo knowledge base, {faqCount} FAQs
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          disabled={!canReset}
          title="Clear this conversation and start over"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2 text-sm font-medium text-mist-50 transition-colors hover:border-violet-400/60 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-500 disabled:hover:bg-ink-800"
        >
          <SquarePen aria-hidden="true" className="size-4" />
          New chat
        </button>
      </div>
    </header>
  );
}
