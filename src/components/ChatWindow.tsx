"use client";

import { useEffect, useRef } from "react";
import type { ChatErrorState, ChatMessage as ChatMessageModel } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { ErrorBanner } from "./ErrorBanner";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";

interface ChatWindowProps {
  messages: readonly ChatMessageModel[];
  isHydrated: boolean;
  isLoading: boolean;
  error: ChatErrorState | null;
  supportEmail: string;
  onSelectQuestion: (question: string) => void;
  onRetry: () => void;
  onDismissError: () => void;
}

export function ChatWindow({
  messages,
  isHydrated,
  isLoading,
  error,
  supportEmail,
  onSelectQuestion,
  onRetry,
  onDismissError,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "end" });
  }, [messages.length, isLoading, error]);

  const showWelcome = isHydrated && messages.length === 0;

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      aria-busy={!isHydrated}
      tabIndex={0}
      className="scroll-area min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        {showWelcome && <WelcomeScreen onSelectQuestion={onSelectQuestion} disabled={isLoading} />}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} supportEmail={supportEmail} />
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <ErrorBanner
            message={error.message}
            onRetry={error.retryText ? onRetry : undefined}
            onDismiss={onDismissError}
          />
        )}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
