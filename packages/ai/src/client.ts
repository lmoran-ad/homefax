import Anthropic from "@anthropic-ai/sdk";

export type AiConfig = {
  apiKey: string | undefined;
  model: string;
};

export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

let client: Anthropic | null = null;

function getClient(apiKey: string): Anthropic {
  client ??= new Anthropic({ apiKey });
  return client;
}

export function isConfigured(config: AiConfig): boolean {
  return Boolean(config.apiKey && config.apiKey.trim());
}

/**
 * Extracts the first balanced JSON object from a model response. Models
 * sometimes wrap JSON in prose or a fenced block even when told not to; a
 * greedy `/\{[\s\S]*\}/` would then swallow trailing text and fail to parse,
 * so this walks the braces and respects string literals.
 */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(raw.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON object in response");
}

export type CompleteInput = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

/** One turn, text in and text out. Retries are the caller's decision. */
export async function complete(
  config: AiConfig,
  input: CompleteInput,
): Promise<string> {
  if (!isConfigured(config)) {
    throw new AiUnavailableError("ANTHROPIC_API_KEY is not configured");
  }
  try {
    const response = await getClient(config.apiKey!).messages.create({
      model: config.model,
      max_tokens: input.maxTokens ?? 1200,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    throw new AiUnavailableError("The assistant service is unavailable", {
      cause: error,
    });
  }
}

/** Test seam. */
export function __setClient(next: Anthropic | null): void {
  client = next;
}
