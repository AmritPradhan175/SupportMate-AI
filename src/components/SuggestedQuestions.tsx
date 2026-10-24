import { CreditCard, PackageSearch, RotateCcw, Truck, type LucideIcon } from "lucide-react";

interface Suggestion {
  question: string;
  topic: string;
  icon: LucideIcon;
}

const SUGGESTIONS: readonly Suggestion[] = [
  { question: "How long does shipping take?", topic: "Shipping & delivery", icon: Truck },
  { question: "What is your return policy?", topic: "Returns & refunds", icon: RotateCcw },
  { question: "Which payment methods do you accept?", topic: "Payments", icon: CreditCard },
  { question: "How can I track my order?", topic: "Orders", icon: PackageSearch },
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelect, disabled = false }: SuggestedQuestionsProps) {
  return (
    <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Suggested questions">
      {SUGGESTIONS.map(({ question, topic, icon: Icon }) => (
        <li key={question}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="group flex h-full w-full items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-left transition-colors hover:border-violet-400/50 hover:bg-ink-700/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25 transition-colors group-hover:bg-violet-500/20 group-hover:text-violet-200"
            >
              <Icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-mist-50">{question}</span>
              <span className="mt-0.5 block text-xs text-mist-400">{topic}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
