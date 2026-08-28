import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { sha256 } from "@homefax/ledger";
import type { StorageProvider, StoredObject } from "../contracts/types";

/**
 * Filesystem storage for the demo. The S3 implementation replaces this class
 * and nothing else — every caller sees only the StorageProvider interface.
 *
 * The hashing here is deliberately *not* stubbed. Content-addressed documents
 * are a product guarantee, not an integration detail: a document's sha256 is
 * what lets someone confirm the bytes behind an event never changed.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = resolve(rootPath);
  }

  /**
   * Resolves a caller-supplied key inside the storage root and refuses
   * anything that escapes it. Keys reach this from request payloads, so
   * `../../etc/passwd` has to be rejected rather than normalized away
   * silently. Absolute paths are refused for the same reason.
   */
  private resolveKey(key: string): string {
    if (!key || key.includes("\0") || isAbsolute(key)) {
      throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
    }
    const full = resolve(this.root, normalize(key));
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error(`Storage key escapes the storage root: ${key}`);
    }
    return full;
  }

  async put(input: {
    key: string;
    bytes: Buffer;
    contentType: string;
  }): Promise<StoredObject> {
    const path = this.resolveKey(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.bytes);
    return {
      key: input.key,
      sha256: sha256(input.bytes),
      size: input.bytes.byteLength,
    };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    // Resolve outside the try: a missing file is a legitimate false, but an
    // invalid or traversing key is a caller error and must not be swallowed
    // into the same answer.
    const path = this.resolveKey(key);
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /** Storage keys are opaque to callers; absolute paths never leave this class. */
  static keyFor(tokenId: string, fileName: string): string {
    const safeName = fileName
      // Drop directory components entirely — only the leaf name matters.
      .replace(/^.*[\\/]/, "")
      .replace(/[^A-Za-z0-9._-]/g, "_")
      // Collapse dot runs so no `..` segment can survive into the key.
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+/, "")
      .slice(0, 120);
    return join(tokenId, `${Date.now().toString(36)}-${safeName || "document"}`);
  }
}
