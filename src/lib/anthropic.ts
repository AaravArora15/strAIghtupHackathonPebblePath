import Anthropic from "@anthropic-ai/sdk";
import { ZodError, ZodType } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export interface CallOpts {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class LlmSchemaError extends Error {
  constructor(message: string, public raw: string, public zodError?: ZodError) {
    super(message);
    this.name = "LlmSchemaError";
  }
}

function extractText(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  throw new Error("Anthropic response contained no text block");
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseJson<T>(raw: string, schema: ZodType<T>): T {
  const cleaned = stripJsonFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new LlmSchemaError(
      `LLM returned invalid JSON: ${(err as Error).message}`,
      cleaned,
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new LlmSchemaError(
      `LLM JSON failed schema validation`,
      cleaned,
      result.error,
    );
  }
  return result.data;
}

// Single LLM call (no validation).
async function rawCall(opts: CallOpts): Promise<string> {
  const response = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  return extractText(response);
}

// Call + validate + one retry with error feedback on schema failure.
export async function callStructured<T>(
  opts: CallOpts,
  schema: ZodType<T>,
): Promise<T> {
  let lastError: LlmSchemaError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt =
      attempt === 0
        ? opts.user
        : `${opts.user}\n\n---\nYour previous response was rejected: ${lastError?.message}\n${lastError?.zodError ? JSON.stringify(lastError.zodError.flatten()) : ""}\nReturn corrected JSON only. No prose, no markdown fences.`;

    const raw = await rawCall({ ...opts, user: userPrompt });
    try {
      return parseJson(raw, schema);
    } catch (err) {
      if (err instanceof LlmSchemaError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("LLM call failed with no captured error");
}
