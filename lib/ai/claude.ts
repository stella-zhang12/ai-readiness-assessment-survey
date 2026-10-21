import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-side Claude access (never imported by client code).
 * Model per PRD §7: Claude Opus 5. Structured outputs guarantee parseable
 * JSON; refusal stop reasons are surfaced as errors so callers can fall
 * back to deterministic content.
 */

export const MODEL = "claude-opus-5";
export const PROMPT_VERSION = "v1";

// Reads ANTHROPIC_API_KEY. Explicit per-attempt timeout and a single retry
// keep the worst case inside the serverless function's time budget instead
// of dying at the platform limit with nothing stored.
const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });

type StructuredCall = {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  /** Override the default model (e.g. Haiku for light, latency-sensitive tasks). */
  model?: string;
  /** Lower for repeatable judgments (e.g. completeness grading). */
  temperature?: number;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  /** Estimated charge for this call in USD, from the price table below. */
  cost_usd: number;
};

/** USD per million tokens (input, output). Update here if pricing changes. */
const PRICES: [prefix: string, inPerM: number, outPerM: number][] = [
  ["claude-haiku", 1, 5],
  ["claude-sonnet", 3, 15],
  ["claude-opus", 5, 25],
];

function estimateCost(model: string, inTok: number, outTok: number): number {
  const row = PRICES.find(([p]) => model.startsWith(p));
  if (!row) return 0;
  return Number(((inTok * row[1] + outTok * row[2]) / 1_000_000).toFixed(6));
}

export async function callStructured<T>({
  system,
  user,
  schema,
  maxTokens,
  effort,
  model,
  temperature,
}: StructuredCall): Promise<{ data: T; usage: Usage }> {
  const base = {
    model: model ?? MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user" as const, content: user }],
    ...(temperature !== undefined ? { temperature } : {}),
    output_config: {
      ...(effort ? { effort } : {}),
      format: { type: "json_schema", schema },
    },
  };

  // Prefer the server-side refusal fallback (re-runs a safety decline on a
  // fallback model automatically); fall back to a plain call ONLY when the
  // beta itself is rejected (400/404). Rate limits, overload, and timeouts
  // must propagate: retrying them as a second full call doubled latency past
  // the serverless time limit under concurrent pilot use.
  let response;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response = await (client.beta.messages.create as any)({
      ...base,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 400 && status !== 404) throw e;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response = await (client.messages.create as any)(base);
  }

  if (response.stop_reason === "refusal") {
    throw new Error("model_refusal");
  }
  const text = (response.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!text) throw new Error("empty_response");
  const inTok = response.usage?.input_tokens ?? 0;
  const outTok = response.usage?.output_tokens ?? 0;
  const usage: Usage = {
    input_tokens: inTok,
    output_tokens: outTok,
    cost_usd: estimateCost(model ?? MODEL, inTok, outTok),
  };
  return { data: JSON.parse(text) as T, usage };
}
