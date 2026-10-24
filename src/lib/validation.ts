import { z } from "zod";
import { MAX_MESSAGE_LENGTH } from "@/types/chat";
import { LlmError } from "./errors";

/* ---------- Request validation ---------- */

export const chatRequestSchema = z.object({
  message: z
    .string({ error: "A message is required." })
    .trim()
    .min(1, "Please enter a question.")
    .max(MAX_MESSAGE_LENGTH, `Questions are limited to ${MAX_MESSAGE_LENGTH} characters.`),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/* ---------- Model output validation ---------- */

export const modelOutputSchema = z.object({
  answer: z.string().trim().max(2000),
  insufficientInformation: z.boolean(),
  sourceIds: z.array(z.string().trim().min(1).max(100)).max(10),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;

/** JSON Schema sent to Gemini so it returns the same shape modelOutputSchema validates. */
export const MODEL_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "Concise answer for the customer, based only on the supplied FAQ context.",
    },
    insufficientInformation: {
      type: "boolean",
      description: "True when the FAQ context does not contain a reliable answer to the question.",
    },
    sourceIds: {
      type: "array",
      items: { type: "string" },
      description: "IDs of the FAQ entries the answer relies on. Empty when insufficientInformation is true.",
    },
  },
  required: ["answer", "insufficientInformation", "sourceIds"],
} as const;

export type ParsedModelOutput =
  | { ok: true; data: ModelOutput }
  | { ok: false; reason: string };

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

/**
 * Parses and validates raw model text. Source IDs must come from the entries that were
 * actually retrieved for this request; anything else is treated as an invalid answer.
 */
export function parseModelOutput(rawText: string, allowedSourceIds: readonly string[]): ParsedModelOutput {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(rawText));
  } catch {
    return { ok: false, reason: "Model output is not valid JSON." };
  }

  const parsed = modelOutputSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "Model output does not match the expected schema." };
  }

  const output = parsed.data;
  if (output.insufficientInformation) {
    return { ok: true, data: { answer: "", insufficientInformation: true, sourceIds: [] } };
  }

  if (output.answer.length === 0) {
    return { ok: false, reason: "Model returned an empty answer." };
  }

  const allowed = new Set(allowedSourceIds);
  const uniqueIds = [...new Set(output.sourceIds)];
  if (uniqueIds.length === 0) {
    return { ok: false, reason: "Model returned an answer without sources." };
  }
  if (uniqueIds.some((id) => !allowed.has(id))) {
    return { ok: false, reason: "Model cited a source that was not retrieved." };
  }

  return { ok: true, data: { ...output, sourceIds: uniqueIds } };
}

/* ---------- Server environment ---------- */

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1),
  GEMINI_MODEL: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Za-z0-9._/-]+$/),
});

export interface ServerEnv {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads required server variables. Throws an LlmError("config") naming what is missing. */
export function getServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse({
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    GEMINI_MODEL: env.GEMINI_MODEL,
  });

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new LlmError("config", `Missing or invalid server configuration: ${names.join(", ")}`);
  }

  return {
    apiKey: result.data.GEMINI_API_KEY,
    model: result.data.GEMINI_MODEL,
    timeoutMs: parsePositiveInt(env.REQUEST_TIMEOUT_MS, 20_000),
  };
}
