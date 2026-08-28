import type {
  SystemKey,
  SystemStatus,
  VerificationLevel,
  Visibility,
  EventType,
} from "@hometoken/contracts";

export type FixtureDocument = {
  name: string;
  kind: string;
  visibility: Visibility;
  /**
   * Document body. Written to the storage provider at seed time, which
   * computes its real SHA-256 — content addressing is a product guarantee,
   * not something the fixtures fake.
   */
  text: string;
};

export type FixtureEvent = {
  id: string;
  occurredAt: string;
  eventType: EventType;
  title: string;
  /** The display one-liner under the title; also the hashed `metadata.summary`. */
  meta: string;
  description: string;
  verificationLevel: VerificationLevel;
  visibility: Visibility;
  documents: FixtureDocument[];
};

export type FixtureSystem = {
  key: SystemKey;
  name: string;
  status: SystemStatus;
  verificationLevel: VerificationLevel;
  sourceEventId: string | null;
  hidden: boolean;
  rows: [string, string][];
};

export type FixtureOwnership = {
  sequenceNumber: number;
  label: string;
  rangeLabel: string;
  verificationLevel: VerificationLevel;
  isCurrent: boolean;
};

export type FixtureProperty = {
  tokenId: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  parcelId: string;
  propertyType: string;
  yearBuilt: number;
  bedrooms: number;
  bathrooms: number;
  livingSqft: number;
  lotSqft: number;
  estimatedValue: number;
  isShowcase: boolean;
  /** The parcel's MLS number of record, used by MlsProvider. */
  mlsNumber: string;
  /** Owner of record per the county deed, or null. Used by DeedProvider. */
  ownerOfRecord: string | null;
  events: FixtureEvent[];
  systems: FixtureSystem[];
  ownership: FixtureOwnership[];
};

export type FixtureContractor = {
  id: string;
  name: string;
  initials: string;
  trade: string;
  license: string;
  verified: boolean;
  since: string;
  area: string;
  zips: string;
  jobCount: number;
  phone: string;
  blurb: string;
};

export type FixtureAccount = {
  email: string;
  password: string;
  name: string;
  initials: string;
  role: "agent" | "homeowner" | "contractor";
  roleLabel: string;
  avatarBg: string;
  badge: string;
  badgeBg: string;
  badgeFg: string;
  kicker: string;
  blurb: string;
  phone: string;
  brokerage: string | null;
  landingRoute: string;
  homeTokenId: string | null;
  contractorId: string | null;
};

export type FixtureDemoDocument = {
  key: string;
  title: string;
  hint: string;
  name: string;
  text: string;
  /** Which trade's submission form offers this document. */
  trade: string | null;
};
