import type { Visibility } from "@homefax/contracts";
import { LocalStorageProvider } from "@homefax/providers";
import {
  propertyDocuments,
  type PropertyDocumentRow,
  type PropertyRow,
} from "@homefax/db";
import { and, eq } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { AppError, notFound } from "../lib/errors.js";
import { canReadDocumentBody, type Viewer } from "./property-service.js";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["text/plain", "application/pdf", "image/png", "image/jpeg"]);

export async function findDocument(
  ctx: AppContext,
  propertyId: string,
  documentId: string,
): Promise<PropertyDocumentRow> {
  const [row] = await ctx.db
    .select()
    .from(propertyDocuments)
    .where(
      and(
        eq(propertyDocuments.id, documentId),
        eq(propertyDocuments.propertyId, propertyId),
      ),
    )
    .limit(1);
  if (!row) throw notFound("That document is not part of this HomeFax");
  return row;
}

/**
 * Serves a document body, enforcing visibility server-side.
 *
 * The UI also styles restricted documents as unopenable, but that is a
 * courtesy — this check is the one that matters. A RESTRICTED document is
 * refused here even for the record's own steward.
 */
export async function readDocumentBody(
  ctx: AppContext,
  property: PropertyRow,
  documentId: string,
  viewer: Viewer,
): Promise<{ name: string; sha256: string; text: string }> {
  const document = await findDocument(ctx, property.id, documentId);
  const visibility = document.visibility as Visibility;

  if (!canReadDocumentBody(visibility, viewer)) {
    throw new AppError(
      "FORBIDDEN",
      visibility === "RESTRICTED"
        ? "This document is restricted and is not available in the demo viewer."
        : "Sign in to open this document.",
    );
  }

  const bytes = await ctx.storage.get(document.storagePath);
  return {
    name: document.fileName,
    sha256: document.sha256,
    text: bytes.toString("utf8"),
  };
}

export type StoreDocumentInput = {
  fileName: string;
  text: string;
  documentType: string;
  visibility: Visibility;
  uploadedBy: string;
};

/**
 * Writes a document and records its real SHA-256. The hash is of the stored
 * bytes, not of anything derived — that is what lets a future reader confirm
 * the document behind an event is the one that was approved.
 */
export async function storeDocument(
  ctx: AppContext,
  property: PropertyRow,
  input: StoreDocumentInput,
): Promise<PropertyDocumentRow> {
  const bytes = Buffer.from(input.text, "utf8");
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new AppError("UNSUPPORTED_DOCUMENT", "That document is larger than 5 MB");
  }
  if (!ALLOWED_MIME.has("text/plain")) {
    throw new AppError("UNSUPPORTED_DOCUMENT", "Unsupported document type");
  }

  const key = LocalStorageProvider.keyFor(property.tokenId, input.fileName);
  const stored = await ctx.storage.put({
    key,
    bytes,
    contentType: "text/plain",
  });

  const [row] = await ctx.db
    .insert(propertyDocuments)
    .values({
      propertyId: property.id,
      fileName: input.fileName,
      storagePath: stored.key,
      mimeType: "text/plain",
      fileSize: stored.size,
      documentType: input.documentType,
      visibility: input.visibility,
      sha256: stored.sha256,
      uploadedBy: input.uploadedBy,
    })
    .returning();
  if (!row) throw new AppError("UPLOAD_FAILED", "Could not store the document");
  return row;
}

export { MAX_DOCUMENT_BYTES, ALLOWED_MIME };
