import { NextResponse } from "next/server";
import { LlmError } from "@/lib/errors";
import { generateRawAnswer } from "@/lib/gemini";
import { retrieveFaqs } from "@/lib/knowledge";
import { createRateLimiter, getClientIp, type RateLimiter } from "@/lib/rate-limit";
import { chatRequestSchema, parsePositiveInt, parseModelOutput } from "@/lib/validation";
import { FALLBACK_ANSWER, type ChatApiError, type ChatApiResponse } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY_BYTES = 8 * 1024;

let limiter: RateLimiter | undefined;

function getLimiter(): RateLimiter {
  limiter ??= createRateLimiter({
    limit: parsePositiveInt(process.env.RATE_LIMIT_MAX, 20),
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  });
  return limiter;
}

function json<T extends ChatApiResponse | ChatApiError>(body: T, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function errorResponse(status: number, code: string, message: string, headers?: Record<string, string>) {
  return json<ChatApiError>({ error: { code, message } }, status, headers);
}

function fallbackResponse() {
  return json<ChatApiResponse>({ answer: FALLBACK_ANSWER, sources: [], fallback: true });
}

function llmFailureResponse(error: LlmError) {
  switch (error.kind) {
    case "config":
      return errorResponse(
        500,
        "server_misconfigured",
        "The assistant isn't configured yet. The server needs a valid GEMINI_API_KEY and GEMINI_MODEL.",
      );
    case "quota":
      return errorResponse(429, "assistant_busy", "The assistant is receiving too many requests right now. Please try again in a few minutes.");
    case "timeout":
      return errorResponse(504, "assistant_timeout", "The assistant took too long to respond. Please try again.");
    default:
      return errorResponse(502, "assistant_unavailable", "The assistant is temporarily unavailable. Please try again.");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const rate = getLimiter().check(getClientIp(request.headers));
  if (!rate.allowed) {
    return errorResponse(429, "rate_limited", "You're sending messages too quickly. Please wait a moment and try again.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return errorResponse(400, "invalid_request", "The request is too large.");
    }
    payload = JSON.parse(raw);
  } catch {
    return errorResponse(400, "invalid_request", "The request body must be valid JSON.");
  }

  const parsedRequest = chatRequestSchema.safeParse(payload);
  if (!parsedRequest.success) {
    return errorResponse(400, "invalid_request", parsedRequest.error.issues[0]?.message ?? "Invalid request.");
  }
  const { message } = parsedRequest.data;

  const retrieval = retrieveFaqs(message);
  if (retrieval.results.length === 0) {
    return fallbackResponse();
  }

  const retrievedFaqs = retrieval.results.map((item) => item.faq);

  let rawOutput: string;
  try {
    rawOutput = await generateRawAnswer(message, retrievedFaqs);
  } catch (error) {
    const llmError = error instanceof LlmError ? error : new LlmError("provider", "Unexpected failure while calling the model.");
    console.error("[api/chat] model call failed", { kind: llmError.kind, detail: llmError.message });
    return llmFailureResponse(llmError);
  }

  const output = parseModelOutput(rawOutput, retrievedFaqs.map((faq) => faq.id));
  if (!output.ok) {
    console.error("[api/chat] invalid model output", { reason: output.reason });
    return errorResponse(502, "invalid_model_output", "The assistant returned an unusable answer. Please try again.");
  }

  if (output.data.insufficientInformation) {
    return fallbackResponse();
  }

  const sources = output.data.sourceIds.flatMap((id) => {
    const faq = retrievedFaqs.find((candidate) => candidate.id === id);
    return faq ? [{ id: faq.id, question: faq.question }] : [];
  });

  return json<ChatApiResponse>({ answer: output.data.answer, sources, fallback: false });
}
