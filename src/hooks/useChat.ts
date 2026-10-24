"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { clearMessages, getServerSnapshot, getSnapshot, subscribe, updateMessages } from "@/lib/chat-storage";
import { MAX_MESSAGE_LENGTH, type ChatErrorState, type ChatMessage } from "@/types/chat";

const CLIENT_TIMEOUT_MS = 35_000;

const apiResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({ id: z.string(), question: z.string() })),
  fallback: z.boolean(),
});

const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const noopSubscribe = () => () => undefined;

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface UseChat {
  messages: readonly ChatMessage[];
  isHydrated: boolean;
  isLoading: boolean;
  error: ChatErrorState | null;
  /** Returns true when the message was accepted (so the composer can clear itself). */
  sendMessage: (text: string) => boolean;
  retry: () => void;
  dismissError: () => void;
  newChat: () => void;
}

export function useChat(): UseChat {
  const messages = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<ChatErrorState | null>(null);

  const inFlightRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  // A question that was saved but never answered (for example the tab closed mid-request).
  const lastMessage = messages.at(-1);
  const unanswered: ChatErrorState | null =
    isHydrated && !isLoading && lastMessage?.role === "user"
      ? { message: "This question didn't get an answer.", retryText: lastMessage.content }
      : null;
  const error = requestError ?? unanswered;

  const requestAnswer = useCallback(async (text: string): Promise<void> => {
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    const isCurrent = () => activeRequestRef.current === controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!isCurrent()) return;

      if (!response.ok) {
        const parsedError = apiErrorSchema.safeParse(body);
        setRequestError({
          message: parsedError.success ? parsedError.data.error.message : "Something went wrong. Please try again.",
          // A 400 means the text itself was rejected, so resending the same text cannot help.
          retryText: response.status === 400 ? undefined : text,
        });
        return;
      }

      const parsed = apiResponseSchema.safeParse(body);
      if (!parsed.success) {
        setRequestError({ message: "The server sent an unexpected response. Please try again.", retryText: text });
        return;
      }

      updateMessages((previous) => [
        ...previous,
        {
          id: createId(),
          role: "assistant",
          content: parsed.data.answer,
          createdAt: Date.now(),
          sources: parsed.data.sources,
          fallback: parsed.data.fallback,
        },
      ]);
    } catch (caught) {
      if (!isCurrent()) return;
      const timedOut = caught instanceof DOMException && caught.name === "AbortError";
      setRequestError({
        message: timedOut
          ? "The request took too long. Please try again."
          : "Couldn't reach the server. Check your connection and try again.",
        retryText: text,
      });
    } finally {
      window.clearTimeout(timeout);
      if (isCurrent()) {
        activeRequestRef.current = null;
        inFlightRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  const sendMessage = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || inFlightRef.current) return false;

      inFlightRef.current = true;
      setIsLoading(true);
      setRequestError(null);
      updateMessages((previous) => [
        ...previous,
        { id: createId(), role: "user", content: trimmed, createdAt: Date.now() },
      ]);
      void requestAnswer(trimmed);
      return true;
    },
    [requestAnswer],
  );

  const retry = useCallback(() => {
    const retryText = error?.retryText;
    if (!retryText || inFlightRef.current) return;

    inFlightRef.current = true;
    setIsLoading(true);
    setRequestError(null);
    void requestAnswer(retryText);
  }, [error, requestAnswer]);

  const dismissError = useCallback(() => setRequestError(null), []);

  const newChat = useCallback(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    inFlightRef.current = false;
    setIsLoading(false);
    setRequestError(null);
    clearMessages();
  }, []);

  return { messages, isHydrated, isLoading, error, sendMessage, retry, dismissError, newChat };
}
