"use client";

import { SendHorizontal, Trash2 } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_LENGTH } from "@/types/chat";

interface MessageComposerProps {
  /** Returns true when the message was accepted and the input should clear. */
  onSend: (text: string) => boolean;
  isBusy: boolean;
  hasMessages: boolean;
  onClear: () => void;
}

const MAX_HEIGHT_PX = 160;

export function MessageComposer({ onSend, isBusy, hasMessages, onClear }: MessageComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const countId = useId();

  const trimmedLength = value.trim().length;
  const canSend = trimmedLength > 0 && !isBusy;
  const remaining = MAX_MESSAGE_LENGTH - value.length;
  const nearLimit = remaining <= 100;

  function resize() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  function submit() {
    if (!canSend) return;
    if (onSend(value)) {
      setValue("");
      requestAnimationFrame(resize);
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
    resize();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 border-t border-white/10 bg-ink-900/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-3xl px-4 pb-2 pt-3 sm:px-6">
        <div
          className={`flex items-end gap-2 rounded-2xl border bg-ink-800 p-2 transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/30 ${
            isBusy ? "border-ink-600 opacity-80" : "border-ink-500"
          }`}
        >
          <label htmlFor="message-input" className="sr-only">
            Your question
          </label>
          <textarea
            id="message-input"
            ref={textareaRef}
            value={value}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            readOnly={isBusy}
            aria-describedby={`${hintId} ${countId}`}
            placeholder="Type your question..."
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-mist-50 placeholder:text-mist-400 focus:outline-none read-only:cursor-wait"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:from-ink-600 disabled:to-ink-600 disabled:text-mist-400 disabled:shadow-none"
          >
            <SendHorizontal aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-2 flex min-h-6 items-center justify-between gap-3 text-xs text-mist-400">
          <div className="flex min-w-0 items-center gap-3">
            <p id={hintId} className="truncate">
              <kbd className="font-sans font-medium text-mist-300">Enter</kbd> to send,{" "}
              <kbd className="font-sans font-medium text-mist-300">Shift + Enter</kbd> for a new line
            </p>
            {hasMessages && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-ink-700 hover:text-mist-50"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Clear conversation
              </button>
            )}
          </div>
          <p
            id={countId}
            className={`shrink-0 tabular-nums ${remaining <= 0 ? "font-medium text-rose-300" : nearLimit ? "text-amber-300" : ""}`}
          >
            {value.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>
      </div>
    </div>
  );
}
