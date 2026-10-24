import { z } from "zod";
import type { ChatMessage } from "@/types/chat";

/**
 * Tiny external store backing the conversation. It works with useSyncExternalStore so the
 * server render and first client render match, and localStorage is read only after hydration.
 */

const STORAGE_KEY = "supportmate-ai:conversation:v1";
const MAX_STORED_MESSAGES = 100;

const storedMessagesSchema = z.array(
  z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    createdAt: z.number(),
    sources: z.array(z.object({ id: z.string(), question: z.string() })).optional(),
    fallback: z.boolean().optional(),
  }),
);

const EMPTY: readonly ChatMessage[] = Object.freeze([]);
const listeners = new Set<() => void>();
let cache: readonly ChatMessage[] | null = null;

function readFromStorage(): readonly ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = storedMessagesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function getSnapshot(): readonly ChatMessage[] {
  cache ??= readFromStorage();
  return cache;
}

export function getServerSnapshot(): readonly ChatMessage[] {
  return EMPTY;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cache = readFromStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function persist(messages: readonly ChatMessage[]): void {
  try {
    if (messages.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  } catch {
    // Storage can be full or blocked (private mode). The conversation still works in memory.
  }
}

export function updateMessages(updater: (previous: readonly ChatMessage[]) => readonly ChatMessage[]): void {
  const next = updater(getSnapshot()).slice(-MAX_STORED_MESSAGES);
  cache = next;
  persist(next);
  emit();
}

export function clearMessages(): void {
  updateMessages(() => EMPTY);
}
