import { Mail } from "lucide-react";

export function Footer({ supportEmail }: { supportEmail: string }) {
  return (
    <footer className="shrink-0 bg-ink-900/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 pb-1 text-xs leading-relaxed text-mist-400 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <p>
          Responses are AI-generated from sample FAQs. Please verify important information with our support team.
        </p>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent("Support request")}`}
          className="inline-flex shrink-0 items-center gap-1.5 font-medium text-indigo-300 underline-offset-4 transition-colors hover:text-indigo-200 hover:underline"
        >
          <Mail aria-hidden="true" className="size-3.5" />
          Contact support
        </a>
      </div>
    </footer>
  );
}
