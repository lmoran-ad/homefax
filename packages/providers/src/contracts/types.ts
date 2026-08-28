import type { SystemStatus, VerificationLevel, Visibility } from "@homefax/contracts";

/**
 * Every external system this product will eventually read from sits behind one
 * of these interfaces. The seam is at the *provider* boundary, not the feature
 * boundary: claim verification calls MlsProvider, so the gating logic, the
 * error copy and the expiry rules are already production code — only the data
 * source is fixture-backed. Swapping in RESO later is one class change.
 *
 * Every stub is deterministic: same input, same output, no clocks and no
 * randomness beyond the explicitly seeded provisioning path.
 */

export type ParcelRecord = {
  tokenId: string;
  parcelId: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  propertyType: string;
  yearBuilt: number;
  bedrooms: number;
  bathrooms: number;
  livingSqft: number;
  lotSqft: number;
  estimatedValue: number;
};

export type ProvisionedParcel = ParcelRecord & {
  /** County-sourced events the new record starts life with. */
  events: {
    id: string;
    occurredAt: string;
    eventType: "PROPERTY_CREATED" | "TAX_ASSESSMENT";
    title: string;
    meta: string;
    description: string;
    verificationLevel: VerificationLevel;
    visibility: Visibility;
  }[];
  /** All UNKNOWN — a fresh parcel has no maintenance history. */
  systemStatus: SystemStatus;
};

export type AddressSuggestion = {
  /** Exactly as the source spells it, which is what a lookup has to match. */
  address: string;
  city: string;
  state: string;
  postalCode: string;
  parcelId: string;
};

export interface ParcelProvider {
  /** Real source later: county assessor and recorder bulk data. */
  findByAddress(address: string): Promise<ParcelRecord | null>;
  findByParcelId(parcelId: string): Promise<ParcelRecord | null>;
  provision(address: string): Promise<ProvisionedParcel>;
  /**
   * Addresses beginning with what has been typed so far.
   *
   * A county stores addresses in exactly one form — "6663 N CEYLON ST", with
   * the directional and the abbreviated street type — and a lookup is a prefix
   * match against that. Nobody types it that way from memory, so without this
   * the honest answer to most real addresses is "not found" for a house that
   * is plainly in the data.
   */
  suggestAddresses(prefix: string): Promise<AddressSuggestion[]>;
}

export type MlsListing = {
  mlsNumber: string;
  listingAgentId: string;
  parcelId: string;
};

export interface MlsProvider {
  /** Real source later: RESO Web API. */
  getListing(parcelId: string): Promise<MlsListing | null>;
  /**
   * True only when the MLS number belongs to this parcel. The mismatch path is
   * load-bearing — the claim flow's rejection state depends on it — so it must
   * stay reachable rather than being stubbed to always succeed.
   */
  verifyListingAgent(input: {
    parcelId: string;
    mlsNumber: string;
  }): Promise<{ ok: true; listing: MlsListing } | { ok: false; expected: string | null }>;
}

export type PermitRecord = {
  permitNumber: string;
  issuedAt: string;
  scope: string;
  status: "ISSUED" | "FINALED";
  /**
   * A permit names the licensed contractor who pulled it and the declared
   * value of the work. That is most of what makes a permit worth putting on a
   * timeline — it is a third party, on the record, saying who did what — so
   * neither is thrown away when the jurisdiction publishes it.
   */
  contractor?: string | null;
  valuation?: number | null;
  /** When the jurisdiction recorded the work as passing inspection. */
  finaledAt?: string | null;
};

export interface PermitProvider {
  /**
   * Live source: a jurisdiction's permit portal, where one is published.
   *
   * The address is optional because the fixture is keyed by parcel, but real
   * permit datasets are addressed and frequently carry no parcel identifier at
   * all — so a live provider needs the address to find anything.
   */
  getPermitHistory(input: {
    parcelId: string;
    address?: string;
  }): Promise<PermitRecord[]>;
}

export interface DeedProvider {
  /**
   * Real source later: county recorder deed records. Returns a name for
   * exactly one fixture parcel and null for everything else, so both the
   * auto-verified match and the proof-of-ownership review path stay reachable.
   */
  ownerOfRecord(parcelId: string): Promise<string | null>;
}

export type LicenseVerification = {
  verified: boolean;
  licenseNumber: string;
  trade: string;
  /** Why it failed, when it did. Shown to the contractor, not to homeowners. */
  reason: string | null;
};

export interface LicenseProvider {
  /** Real source later: state licensing boards. */
  verify(input: {
    licenseNumber: string;
    trade: string;
  }): Promise<LicenseVerification>;
}

export type StoredObject = { key: string; sha256: string; size: number };

export interface StorageProvider {
  put(input: {
    key: string;
    bytes: Buffer;
    contentType: string;
  }): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
