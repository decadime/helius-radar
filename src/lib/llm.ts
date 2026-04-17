// LLM client for OpenRouter (OpenAI-compatible).
//
// Defaults to Kimi K2 via OpenRouter for cheap, structured-output-friendly
// generation. The design intent is "enrich, never replace" — every caller
// must keep a rule-based fallback. When this module returns null the caller
// treats it as "no enrichment available" and ships the deterministic row.

import OpenAI from "openai";
import type { ZodType } from "zod";

const DEFAULT_MODEL = "moonshotai/kimi-k2";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

// ─── Public types ─────────────────────────────────────────────────────────────

export type CallLLMInput<T> = {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  /** Upper bound on total attempts (initial + retries). Default: 2. */
  maxAttempts?: number;
  /** Overrides. Defaults come from env. */
  model?: string;
  temperature?: number;
};

// ─── OpenRouter client (lazy singleton) ──────────────────────────────────────

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is required when USE_LLM=true. " +
        "Set it in .env or unset USE_LLM to use deterministic rules only."
    );
  }
  client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL,
    defaultHeaders: {
      // OpenRouter attribution — optional but documented as recommended.
      "HTTP-Referer": "https://github.com/helius-radar",
      "X-Title": "Helius Radar",
    },
  });
  return client;
}

// ─── Concrete caller ──────────────────────────────────────────────────────────

/**
 * Call the configured LLM, parse JSON, validate against the schema.
 * Returns `null` on any failure (network, parse, schema) after retries —
 * the caller is expected to fall back to deterministic logic.
 */
export async function callLLM<T>(input: CallLLMInput<T>): Promise<T | null> {
  const model = input.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const temperature = input.temperature ?? 0.3;

  return runWithRetry({
    fetcher: async () => {
      const res = await getClient().chat.completions.create({
        model,
        temperature,
        // "json_object" mode — the model must produce valid JSON. We still
        // zod-validate the result in case the model produces valid-JSON-but-
        // wrong-shape.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    },
    schema: input.schema,
    maxAttempts: input.maxAttempts ?? 2,
  });
}

// ─── Pure core (testable without network / SDK) ───────────────────────────────

export type RunWithRetryInput<T> = {
  /** Returns the raw string the LLM produced. Called up to `maxAttempts` times. */
  fetcher: () => Promise<string>;
  schema: ZodType<T>;
  maxAttempts: number;
};

/**
 * Parse-and-validate loop. Separated from SDK wiring so unit tests can
 * inject a deterministic fetcher and verify the retry / fallback logic
 * without touching the network.
 */
export async function runWithRetry<T>({
  fetcher,
  schema,
  maxAttempts,
}: RunWithRetryInput<T>): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await fetcher();
      const json = JSON.parse(raw);
      const result = schema.safeParse(json);
      if (result.success) return result.data;
      // Schema drift — treat as a parse failure and retry.
    } catch {
      // Network or JSON error; fall through to retry.
    }
  }
  return null;
}

export function isLLMEnabled(): boolean {
  return process.env.USE_LLM === "true";
}

/**
 * Call once at application or script startup when LLM is enabled.
 * Throws a clear error if misconfigured — better than silently returning
 * rule-based output and leaving the operator wondering why.
 */
export function assertLLMConfigured() {
  if (!isLLMEnabled()) return;
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "USE_LLM=true but OPENROUTER_API_KEY is not set. " +
        "Set both, or unset USE_LLM to disable LLM enrichment."
    );
  }
}
