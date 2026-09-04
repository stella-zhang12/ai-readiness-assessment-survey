import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-side Claude access (never imported by client code).
 * Model per PRD §7: Claude Opus 5. Structured outputs guarantee parseable
 * JSON; refusal stop reasons are surfaced as errors so callers can fall
 * back to deterministic content.
 */

export const MODEL = "claude-opus-5";
export const PROMPT_VERSION = "v1";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

type StructuredCall = {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
};

export async function callStructured<T>({
  system,
  user,
  schema,
  maxTokens,
  effort,
}: StructuredCall): Promise<T> {
  const base = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user" as const, content: user }],
    output_config: {
      ...(effort ? { effort } : {}),
      format: { type: "json_schema", schema },
    },
  };

  // Prefer the server-side refusal fallback (re-runs a safety decline on a
  // fallback model automatically); fall back to a plain call if the beta
  // isn't available to this account/SDK.
  let response;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response = await (client.beta.messages.create as any)({
      ...base,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch {
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
  return JSON.parse(text) as T;
}
