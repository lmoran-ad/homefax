import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "@homefax/ledger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getDeedProvider,
  getLicenseProvider,
  getMlsProvider,
  getParcelProvider,
  getPermitProvider,
  LocalStorageProvider,
} from "./index.js";

const SHOWCASE_PARCEL = "DEN-1234-567-89";

describe("FixtureParcelProvider", () => {
  const provider = getParcelProvider();

  it("finds the showcase property by a partial address", async () => {
    await expect(provider.findByAddress("123 Main")).resolves.toMatchObject({
      tokenId: "HF-US-CO-DEN-00001234",
      parcelId: SHOWCASE_PARCEL,
    });
  });

  it("finds a property by parcel id", async () => {
    await expect(provider.findByParcelId(SHOWCASE_PARCEL)).resolves.toMatchObject({
      address: "123 Main Street",
    });
  });

  it("returns null for an address outside the seeded markets", async () => {
    await expect(provider.findByAddress("77 Nowhere Lane")).resolves.toBeNull();
    await expect(provider.findByAddress("   ")).resolves.toBeNull();
  });

  it("provisions deterministically — the same address yields the same token", async () => {
    const a = await provider.provision("77 Nowhere Lane, Golden, 80401");
    const b = await provider.provision("77 Nowhere Lane, Golden, 80401");
    expect(a.tokenId).toBe(b.tokenId);
    expect(a.parcelId).toBe(b.parcelId);
    expect(a.estimatedValue).toBe(b.estimatedValue);
  });

  it("provisions a thin record: two county events and no known systems", async () => {
    const parcel = await provider.provision("77 Nowhere Lane, Golden, 80401");
    expect(parcel.events).toHaveLength(2);
    expect(parcel.events.map((e) => e.eventType).sort()).toEqual([
      "PROPERTY_CREATED",
      "TAX_ASSESSMENT",
    ]);
    expect(parcel.systemStatus).toBe("UNKNOWN");
  });

  it("produces a well-formed token id", async () => {
    const parcel = await provider.provision("900 Elm Street, Denver, 80205");
    expect(parcel.tokenId).toMatch(/^HF-US-CO-[A-Z]{3}-\d{8}$/);
  });
});

describe("FixtureMlsProvider", () => {
  const provider = getMlsProvider();

  it("returns the listing of record for a seeded parcel", async () => {
    await expect(provider.getListing(SHOWCASE_PARCEL)).resolves.toMatchObject({
      mlsNumber: "9182446",
    });
  });

  it("accepts the matching MLS number", async () => {
    const result = await provider.verifyListingAgent({
      parcelId: SHOWCASE_PARCEL,
      mlsNumber: "9182446",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a mismatched MLS number and names the expected one", async () => {
    // This rejection path is what the claim screen's error state depends on.
    const result = await provider.verifyListingAgent({
      parcelId: SHOWCASE_PARCEL,
      mlsNumber: "0000000",
    });
    expect(result).toEqual({ ok: false, expected: "9182446" });
  });

  it("rejects an unknown parcel", async () => {
    const result = await provider.verifyListingAgent({
      parcelId: "NOPE-0000-000-00",
      mlsNumber: "9182446",
    });
    expect(result).toEqual({ ok: false, expected: null });
  });
});

describe("FixtureDeedProvider", () => {
  const provider = getDeedProvider();

  it("names the owner of record for the one parcel that has one", async () => {
    await expect(provider.ownerOfRecord(SHOWCASE_PARCEL)).resolves.toBe(
      "Dana Whitfield",
    );
  });

  it("returns null elsewhere, so the proof path stays reachable", async () => {
    await expect(provider.ownerOfRecord("DEN-4820-112-04")).resolves.toBeNull();
    await expect(provider.ownerOfRecord("NOPE-0000-000-00")).resolves.toBeNull();
  });
});

describe("FixtureLicenseProvider", () => {
  const provider = getLicenseProvider();

  it("verifies a license on file", async () => {
    await expect(
      provider.verify({ licenseNumber: "CO-MC-31188", trade: "HVAC" }),
    ).resolves.toMatchObject({ verified: true, reason: null });
  });

  it("refuses the unverified contractor, keeping the downgrade path testable", async () => {
    const result = await provider.verify({
      licenseNumber: "Not on file",
      trade: "Landscape & Drainage",
    });
    expect(result.verified).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("refuses an unknown license number", async () => {
    await expect(
      provider.verify({ licenseNumber: "CO-XX-00000", trade: "HVAC" }),
    ).resolves.toMatchObject({ verified: false });
  });
});

describe("FixturePermitProvider", () => {
  const provider = getPermitProvider();

  it("returns the permit events attached to the showcase record", async () => {
    // Two events carry a PERMIT_* type: the 2016 basement issue and the 2023
    // roof finalization. Other permit numbers on this property (E21-04477,
    // R23-18432 at issue) live as documents on improvement and repair events,
    // which this provider deliberately does not reinterpret as permit records.
    const permits = await provider.getPermitHistory({ parcelId: SHOWCASE_PARCEL });
    expect(permits).toHaveLength(2);
    expect(permits.map((p) => p.permitNumber).sort()).toEqual([
      "B16-09921",
      "R23-18432",
    ]);
    expect(permits.filter((p) => p.status === "FINALED")).toHaveLength(1);
  });

  it("returns nothing for a parcel it has no records for", async () => {
    await expect(
      provider.getPermitHistory({ parcelId: "NOPE-0000-000-00" }),
    ).resolves.toEqual([]);
  });
});

describe("LocalStorageProvider", () => {
  let root: string;
  let storage: LocalStorageProvider;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "ht-storage-"));
    storage = new LocalStorageProvider(root);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns the real SHA-256 of the stored bytes", async () => {
    const bytes = Buffer.from("INVOICE 26-3390\nTotal: $9,860.00\n");
    const result = await storage.put({
      key: "HF-US-CO-DEN-00001234/invoice.txt",
      bytes,
      contentType: "text/plain",
    });
    expect(result.sha256).toBe(sha256(bytes));
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.size).toBe(bytes.byteLength);
  });

  it("round-trips the exact bytes", async () => {
    const bytes = Buffer.from("round trip");
    await storage.put({ key: "a/b.txt", bytes, contentType: "text/plain" });
    await expect(storage.get("a/b.txt")).resolves.toEqual(bytes);
    await expect(readFile(join(root, "a/b.txt"))).resolves.toEqual(bytes);
  });

  it("reports existence and deletes", async () => {
    await storage.put({
      key: "gone.txt",
      bytes: Buffer.from("x"),
      contentType: "text/plain",
    });
    await expect(storage.exists("gone.txt")).resolves.toBe(true);
    await storage.delete("gone.txt");
    await expect(storage.exists("gone.txt")).resolves.toBe(false);
  });

  it("refuses a key that escapes the storage root", async () => {
    // Keys arrive from request payloads, so traversal has to be rejected.
    await expect(storage.get("../../etc/passwd")).rejects.toThrow(/escapes/);
    await expect(storage.exists("/etc/passwd")).rejects.toThrow(/Invalid/);
    await expect(
      storage.put({ key: "", bytes: Buffer.from(""), contentType: "text/plain" }),
    ).rejects.toThrow(/Invalid/);
  });

  it("builds keys that do not leak the original file name verbatim", () => {
    const key = LocalStorageProvider.keyFor("HF-US-CO-DEN-00001234", "in voice/../x.txt");
    expect(key).not.toContain("..");
    expect(key.startsWith("HF-US-CO-DEN-00001234/")).toBe(true);
  });
});
