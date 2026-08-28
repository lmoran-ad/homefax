import {
  ExtractedPropertyEventSchema,
  type ExtractedPropertyEvent,
} from "@hometoken/contracts";
import { complete, extractJson, type AiConfig } from "./client.js";
import { EXTRACTION_SYSTEM_PROMPT } from "./prompts.js";

export async function extractDocument(
  config: AiConfig,
  documentText: string,
): Promise<ExtractedPropertyEvent> {
  const raw = await complete(config, {
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: `DOCUMENT\n\n${documentText}\n\nReturn only the JSON object.`,
    maxTokens: 1200,
  });
  return ExtractedPropertyEventSchema.parse(extractJson(raw));
}

/**
 * What Add Record shows when extraction is unavailable or unusable: an empty
 * proposal at LOW confidence with no evidence, which the review form then
 * presents as manual entry. Guessing values here would be worse than useless —
 * it would put unverified claims in front of someone about to approve them.
 */
export function manualProposal(fileName: string): ExtractedPropertyEvent {
  return {
    suggestedEventType: "DOCUMENT_ADDED",
    title: fileName.replace(/\.[A-Za-z0-9]+$/, "").replace(/[-_]/g, " "),
    description: "",
    occurredAt: null,
    contractor: null,
    amount: null,
    currency: "USD",
    category: null,
    materials: [],
    warrantyYears: null,
    permitNumber: null,
    systemType: null,
    confidence: "LOW",
    evidence: [],
  };
}
