export const MAX_MESSAGE_LENGTH = 1000;

export const FALLBACK_ANSWER =
  "I couldn't find a reliable answer in our knowledge base. Please contact our support team.";

export interface ChatSource {
  id: string;
  question: string;
}

/** Successful and fallback responses from POST /api/chat. */
export interface ChatApiResponse {
  answer: string;
  sources: ChatSource[];
  fallback: boolean;
}

export interface ChatApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  sources?: ChatSource[];
  fallback?: boolean;
}

export interface ChatErrorState {
  message: string;
  /** The question to resend when the user presses Retry. Absent when retrying cannot help. */
  retryText?: string;
}
