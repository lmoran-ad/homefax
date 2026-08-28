import { HomeAnswerSchema, type HomeAnswer } from "@homefax/contracts";
import { complete, extractJson, type AiConfig } from "./client.js";
import { ASK_HOME_SYSTEM_PROMPT } from "./prompts.js";

export type AskInput = {
  /** The compact record context. Only this property's data may be in here. */
  context: string;
  question: string;
};

/**
 * Asks the model and validates the response against the contract. One retry
 * on a schema violation, because a single malformed response is usually
 * transient; a second failure hands control back to the caller's fallback
 * rather than rendering a half-parsed answer.
 */
export async function askHome(
  config: AiConfig,
  input: AskInput,
): Promise<HomeAnswer> {
  const prompt = `HOMEFAX RECORD\n\n${input.context}\n\nQUESTION\n${input.question}\n\nReturn only the JSON object.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await complete(config, {
      system: ASK_HOME_SYSTEM_PROMPT,
      prompt,
      maxTokens: 1200,
    });
    try {
      return HomeAnswerSchema.parse(extractJson(raw));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `Assistant returned output that did not match the schema: ${String(lastError)}`,
  );
}
