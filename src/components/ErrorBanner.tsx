import { AlertTriangle, RefreshCw, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-300" />
      <div className="min-w-0 flex-1">
        <p className="leading-relaxed">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-400/15 px-3 py-1.5 text-sm font-medium text-rose-50 ring-1 ring-rose-300/40 transition-colors hover:bg-rose-400/25"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Retry
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="-m-1 rounded-md p-1 text-rose-200 transition-colors hover:bg-rose-400/15"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
