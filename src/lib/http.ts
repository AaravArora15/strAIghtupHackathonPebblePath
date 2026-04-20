import type { NextApiRequest, NextApiResponse } from "next";
import { ZodError } from "zod";
import { LlmSchemaError } from "./anthropic";

export function methodGuard(
  req: NextApiRequest,
  res: NextApiResponse,
  method: "POST",
): boolean {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  if (req.method !== method) {
    res.setHeader("Allow", method);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
}

// Some clients (including certain curl/shell combos and Momen HTTP actions)
// send a JSON-encoded string rather than a parsed object. Unwrap it.
export function getJsonBody(req: NextApiRequest): unknown {
  const body = req.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export function handleError(err: unknown, res: NextApiResponse) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request body",
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof LlmSchemaError) {
    res.status(502).json({
      error: "LLM returned malformed output after retry",
      details: err.message,
      raw: err.raw.slice(0, 2000),
    });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: "Internal error", details: message });
}
