import {
  extractDocument,
  isConfigured,
  manualProposal,
  type AiConfig,
} from "@homefax/ai";
import type { ExtractionResponse } from "@homefax/contracts";
import { aiExtractionJobs, type PropertyRow } from "@homefax/db";
import { allDemoDocuments } from "@homefax/db/fixtures";
import { eq } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { badRequest } from "../lib/errors.js";
import { storeDocument } from "./document-service.js";

export function findDemoDocument(key: string) {
  return allDemoDocuments.find((d) => d.key === key) ?? null;
}

export type ExtractInput = {
  demoDocumentKey?: string | undefined;
  fileName?: string | undefined;
  text?: string | undefined;
};

/**
 * Stores the document, then proposes an event from it.
 *
 * The document is stored first and unconditionally: the upload is real work
 * the user did, and it should survive the model being unavailable. Extraction
 * failing downgrades the result to a manual-entry proposal rather than losing
 * the file.
 *
 * Whatever comes back is a proposal. It is written to the extraction job as
 * READY_FOR_REVIEW and reaches the record only when a person approves it.
 */
export async function extract(
  ctx: AppContext,
  property: PropertyRow,
  input: ExtractInput,
  userId: string,
): Promise<ExtractionResponse> {
  const demo = input.demoDocumentKey ? findDemoDocument(input.demoDocumentKey) : null;
  const fileName = demo?.name ?? input.fileName?.trim();
  const text = demo?.text ?? input.text;

  if (!fileName || !text) {
    throw badRequest("Choose a document or provide its text");
  }

  const document = await storeDocument(ctx, property, {
    fileName,
    text,
    documentType: "Uploaded document",
    visibility: "AUTHENTICATED",
    uploadedBy: userId,
  });

  const config: AiConfig = {
    apiKey: ctx.env.ANTHROPIC_API_KEY,
    model: ctx.env.ANTHROPIC_MODEL,
  };

  let proposal = manualProposal(fileName);
  let manual = true;
  let errorMessage: string | null = "AI extraction is not configured";

  if (isConfigured(config)) {
    try {
      proposal = await extractDocument(config, text);
      manual = false;
      errorMessage = null;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  await ctx.db.insert(aiExtractionJobs).values({
    propertyId: property.id,
    documentId: document.id,
    status: manual ? "FAILED" : "READY_FOR_REVIEW",
    extractedJson: manual ? null : (proposal as unknown as Record<string, unknown>),
    model: manual ? null : ctx.env.ANTHROPIC_MODEL,
    errorMessage,
    createdBy: userId,
  });

  return {
    documentId: document.id,
    documentName: fileName,
    sha256: document.sha256,
    preview: text.slice(0, 4000),
    proposal,
    manual,
  };
}

/** Marks the extraction behind a document approved, once a person confirms it. */
export async function markApproved(
  ctx: AppContext,
  documentId: string,
): Promise<void> {
  await ctx.db
    .update(aiExtractionJobs)
    .set({ status: "APPROVED", reviewedAt: new Date() })
    .where(eq(aiExtractionJobs.documentId, documentId));
}

export async function markRejected(
  ctx: AppContext,
  documentId: string,
): Promise<void> {
  await ctx.db
    .update(aiExtractionJobs)
    .set({ status: "REJECTED", reviewedAt: new Date() })
    .where(eq(aiExtractionJobs.documentId, documentId));
}
