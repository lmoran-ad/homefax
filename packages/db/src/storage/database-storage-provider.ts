import { sha256 } from "@homefax/ledger";
import type { StorageProvider, StoredObject } from "@homefax/providers";
import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { documentBlobs } from "../schema/index";

/**
 * Stores document bytes in PostgreSQL.
 *
 * This exists because serverless platforms give you a read-only filesystem and
 * no durable local disk — a document written by one invocation is simply not
 * there for the next. Putting the bytes in the database the app already has is
 * the smallest change that makes documents work there.
 *
 * It is not what a production system should do at volume: object storage with
 * an S3 provider is. That swap is one class, because every caller only ever
 * sees StorageProvider.
 *
 * It lives here rather than beside the other providers because it needs the
 * connection and the schema, and importing those from `@homefax/providers`
 * would make the two packages depend on each other. Only the interface travels
 * the other way.
 *
 * The hashing is identical to the local provider's — a real SHA-256 over the
 * stored bytes — so a document is byte-identical and hash-identical whichever
 * provider wrote it.
 */
export class DatabaseStorageProvider implements StorageProvider {
  private readonly db = getDb();

  async put(input: {
    key: string;
    bytes: Buffer;
    contentType: string;
  }): Promise<StoredObject> {
    if (!input.key || input.key.includes("\0")) {
      throw new Error(`Invalid storage key: ${JSON.stringify(input.key)}`);
    }
    const digest = sha256(input.bytes);
    await this.db
      .insert(documentBlobs)
      .values({
        storageKey: input.key,
        contentType: input.contentType,
        bytes: input.bytes,
        sha256: digest,
      })
      .onConflictDoUpdate({
        target: documentBlobs.storageKey,
        set: { bytes: input.bytes, sha256: digest, contentType: input.contentType },
      });

    return { key: input.key, sha256: digest, size: input.bytes.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    const [row] = await this.db
      .select()
      .from(documentBlobs)
      .where(eq(documentBlobs.storageKey, key))
      .limit(1);
    if (!row) throw new Error(`No stored object for key ${key}`);
    return Buffer.from(row.bytes);
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(documentBlobs).where(eq(documentBlobs.storageKey, key));
  }

  async exists(key: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: documentBlobs.id })
      .from(documentBlobs)
      .where(eq(documentBlobs.storageKey, key))
      .limit(1);
    return Boolean(row);
  }
}
