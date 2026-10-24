import { Sparkles } from "lucide-react";
import { SuggestedQuestions } from "./SuggestedQuestions";

interface WelcomeScreenProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export function WelcomeScreen({ onSelectQuestion, disabled }: WelcomeScreenProps) {
  return (
    <section className="flex flex-col items-center px-1 pb-4 pt-6 text-center sm:pt-12" aria-labelledby="welcome-heading">
      <span
        aria-hidden="true"
        className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 text-white shadow-[0_0_44px_rgb(124_58_237/0.5)] ring-1 ring-white/25"
      >
        <Sparkles className="size-7" />
      </span>
      <h2 id="welcome-heading" className="text-balance text-3xl font-semibold tracking-tight text-mist-50 sm:text-4xl">
        How can we help you today?
      </h2>
      <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-mist-300">
        Ask about shipping, returns, refunds, payments, or your order. I answer from our FAQ and tell you straight away
        when I can&apos;t find a reliable answer.
      </p>
      <div className="mt-8 w-full text-left">
        <SuggestedQuestions onSelect={onSelectQuestion} disabled={disabled} />
      </div>
    </section>
  );
}
