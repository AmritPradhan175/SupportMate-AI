export type LlmErrorKind = "config" | "quota" | "timeout" | "provider" | "empty";

/** Raised by the Gemini wrapper. The message is safe to log but is never sent to clients. */
export class LlmError extends Error {
  readonly kind: LlmErrorKind;

  constructor(kind: LlmErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmError";
    this.kind = kind;
  }
}
