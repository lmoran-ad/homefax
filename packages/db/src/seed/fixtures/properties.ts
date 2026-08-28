import type { SystemKey, SystemStatus } from "@homefax/contracts";
import { showcaseProperty } from "./showcase.js";
import type { FixtureProperty } from "./types.js";

const SYSTEM_DEFS: [SystemKey, string][] = [
  ["roof", "Roof"],
  ["hvac", "HVAC"],
  ["waterHeater", "Water Heater"],
  ["electrical", "Electrical"],
  ["plumbing", "Plumbing"],
  ["foundation", "Foundation"],
  ["other", "Other"],
];

/** The reference "today" the seeded dataset is written against. */
export const SEED_TODAY = "2026-08-28";
const SEED_YEAR = 2026;

const money = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
const yearsAgo = (n: number): string => String(SEED_YEAR - n);

type LightInput = {
  tokenId: string;
  address: string;
  city: string;
  postalCode: string;
  parcelId: string;
  mlsNumber: string;
  estimatedValue: number;
  bedrooms: number;
  bathrooms: number;
  livingSqft: number;
  lotSqft: number;
  yearBuilt: number;
  /** Statuses in SYSTEM_DEFS order. */
  statuses: SystemStatus[];
};

/**
 * The nine supporting properties. They exist so search returns something
 * plausible and so the agent's book, saved list and claim flow have records to
 * operate on — their histories are deliberately thin. Only the showcase
 * property carries a full record.
 */
function light(input: LightInput): FixtureProperty {
  const {
    tokenId,
    address,
    city,
    postalCode,
    parcelId,
    mlsNumber,
    estimatedValue: value,
    bedrooms,
    bathrooms,
    livingSqft,
    lotSqft,
    yearBuilt,
    statuses,
  } = input;

  const systems = SYSTEM_DEFS.map(([key, name], i) => ({
    key,
    name,
    status: statuses[i] ?? ("UNKNOWN" as SystemStatus),
    verificationLevel: "SOURCE_VERIFIED" as const,
    sourceEventId: null,
    hidden: key === "other",
    rows: [
      ["Status source", "County & owner records"],
      ["Last updated", "Aug 2026"],
    ] as [string, string][],
  }));

  const permitPrefix = parcelId.slice(0, 3);

  return {
    tokenId,
    address,
    city,
    state: "CO",
    postalCode,
    parcelId,
    propertyType: "Single family, detached",
    yearBuilt,
    bedrooms,
    bathrooms,
    livingSqft,
    lotSqft,
    estimatedValue: value,
    isShowcase: false,
    mlsNumber,
    ownerOfRecord: null,
    systems,
    ownership: [
      {
        sequenceNumber: 2,
        label: "Current ownership period",
        rangeLabel: `Jun 14, ${yearsAgo(9)} – present`,
        verificationLevel: "SOURCE_VERIFIED",
        isCurrent: true,
      },
      {
        sequenceNumber: 1,
        label: "Ownership period #1",
        rangeLabel: `May 20, ${yearBuilt} – Jun 14, ${yearsAgo(9)}`,
        verificationLevel: "UNVERIFIED",
        isCurrent: false,
      },
    ],
    events: [
      {
        id: `${tokenId}-1`,
        occurredAt: `${yearBuilt}-05-20`,
        eventType: "PROPERTY_CREATED",
        title: "Property record created",
        meta: `County assessor · parcel ${parcelId}`,
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
      {
        id: `${tokenId}-2`,
        occurredAt: `${yearsAgo(9)}-06-14`,
        eventType: "SALE",
        title: `Sale · ${money(value * 0.62)}`,
        meta: "Arms-length transaction",
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
      {
        id: `${tokenId}-3`,
        occurredAt: `${yearsAgo(9)}-06-14`,
        eventType: "OWNERSHIP_PERIOD_STARTED",
        title: "Ownership period #2 begins",
        meta: "Current ownership period",
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
      {
        id: `${tokenId}-4`,
        occurredAt: `${yearsAgo(5)}-09-02`,
        eventType: "PERMIT_ISSUED",
        title: "Kitchen remodel permit issued",
        meta: `Permit ${permitPrefix}-${yearsAgo(5).slice(2)}-2210`,
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
      {
        id: `${tokenId}-5`,
        occurredAt: `${yearsAgo(4)}-04-11`,
        eventType: "IMPROVEMENT",
        title: "Kitchen remodel completed",
        meta: "Demo Contracting · $32,500",
        description: "",
        verificationLevel: "PROFESSIONAL_VERIFIED",
        visibility: "AUTHENTICATED",
        documents: [],
      },
      {
        id: `${tokenId}-6`,
        occurredAt: `${yearsAgo(3)}-07-19`,
        eventType: "SYSTEM_SERVICE",
        title: "HVAC service",
        meta: "Summit Mechanical · $198",
        description: "",
        verificationLevel: "PROFESSIONAL_VERIFIED",
        visibility: "AUTHENTICATED",
        documents: [],
      },
      {
        id: `${tokenId}-7`,
        occurredAt: "2024-09-01",
        eventType: "TAX_ASSESSMENT",
        title: "Tax assessment · 2024",
        meta: `Assessed ${money(value * 0.86)}`,
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
      {
        id: `${tokenId}-8`,
        occurredAt: "2025-09-01",
        eventType: "TAX_ASSESSMENT",
        title: "Tax assessment · 2025",
        meta: `Assessed ${money(value * 0.88)}`,
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
      {
        id: `${tokenId}-9`,
        occurredAt: "2026-08-01",
        eventType: "TAX_ASSESSMENT",
        title: "Tax assessment · 2026",
        meta: `Assessed ${money(value * 0.9)}`,
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
        documents: [],
      },
    ],
  };
}

const E: SystemStatus = "EXCELLENT";
const G: SystemStatus = "GOOD";
const W: SystemStatus = "WATCH";
const A: SystemStatus = "ATTENTION";
const U: SystemStatus = "UNKNOWN";

export const fixtureProperties: FixtureProperty[] = [
  showcaseProperty,
  light({
    tokenId: "HF-US-CO-DEN-00002187",
    address: "4820 Tennyson Street",
    city: "Denver",
    postalCode: "80212",
    parcelId: "DEN-4820-112-04",
    mlsNumber: "9184021",
    estimatedValue: 742000,
    bedrooms: 3,
    bathrooms: 2,
    livingSqft: 2140,
    lotSqft: 4700,
    yearBuilt: 1926,
    statuses: [E, G, E, G, G, E, G],
  }),
  light({
    tokenId: "HF-US-CO-DEN-00003042",
    address: "1155 Cherry Creek Dr S",
    city: "Denver",
    postalCode: "80246",
    parcelId: "DEN-1155-330-71",
    mlsNumber: "9179884",
    estimatedValue: 529500,
    bedrooms: 2,
    bathrooms: 2,
    livingSqft: 1480,
    lotSqft: 0,
    yearBuilt: 1978,
    statuses: [G, W, G, G, W, G, U],
  }),
  light({
    tokenId: "HF-US-CO-DEN-00002914",
    address: "2701 Yates Street",
    city: "Denver",
    postalCode: "80212",
    parcelId: "DEN-2701-118-22",
    mlsNumber: "9186310",
    estimatedValue: 611000,
    bedrooms: 3,
    bathrooms: 2,
    livingSqft: 1820,
    lotSqft: 5200,
    yearBuilt: 1948,
    statuses: [G, G, E, G, G, G, G],
  }),
  light({
    tokenId: "HF-US-CO-DEN-00004501",
    address: "6390 E 17th Avenue Pkwy",
    city: "Denver",
    postalCode: "80220",
    parcelId: "DEN-6390-207-15",
    mlsNumber: "9181077",
    estimatedValue: 968000,
    bedrooms: 5,
    bathrooms: 4,
    livingSqft: 3640,
    lotSqft: 9800,
    yearBuilt: 1936,
    statuses: [E, E, G, E, G, E, G],
  }),
  light({
    tokenId: "HF-US-CO-BLD-00000377",
    address: "890 Pearl Street",
    city: "Boulder",
    postalCode: "80302",
    parcelId: "BLD-0890-044-09",
    mlsNumber: "9188245",
    estimatedValue: 1240000,
    bedrooms: 4,
    bathrooms: 3,
    livingSqft: 2960,
    lotSqft: 8100,
    yearBuilt: 1902,
    statuses: [W, W, G, G, A, G, U],
  }),
  light({
    tokenId: "HF-US-CO-DEN-00005120",
    address: "3344 Osage Street",
    city: "Denver",
    postalCode: "80211",
    parcelId: "DEN-3344-091-33",
    mlsNumber: "9183966",
    estimatedValue: 588000,
    bedrooms: 3,
    bathrooms: 2,
    livingSqft: 1690,
    lotSqft: 3900,
    yearBuilt: 1954,
    statuses: [G, E, E, G, G, G, G],
  }),
  light({
    tokenId: "HF-US-CO-DEN-00005388",
    address: "1780 S Gilpin Street",
    city: "Denver",
    postalCode: "80210",
    parcelId: "DEN-1780-155-08",
    mlsNumber: "9187102",
    estimatedValue: 815000,
    bedrooms: 4,
    bathrooms: 3,
    livingSqft: 2410,
    lotSqft: 6300,
    yearBuilt: 1962,
    statuses: [E, G, G, E, G, E, G],
  }),
  light({
    tokenId: "HF-US-CO-LTN-00000912",
    address: "215 Lakeview Court",
    city: "Littleton",
    postalCode: "80120",
    parcelId: "LTN-0215-076-41",
    mlsNumber: "9180533",
    estimatedValue: 634000,
    bedrooms: 4,
    bathrooms: 3,
    livingSqft: 2280,
    lotSqft: 7100,
    yearBuilt: 1988,
    statuses: [G, G, E, G, E, E, G],
  }),
  light({
    tokenId: "HF-US-CO-AUR-00001604",
    address: "9042 E Yale Avenue",
    city: "Aurora",
    postalCode: "80231",
    parcelId: "AUR-9042-311-27",
    mlsNumber: "9185719",
    estimatedValue: 472000,
    bedrooms: 3,
    bathrooms: 2,
    livingSqft: 1560,
    lotSqft: 5600,
    yearBuilt: 1975,
    statuses: [W, G, G, W, G, G, U],
  }),
];

export const SHOWCASE_TOKEN_ID = showcaseProperty.tokenId;
export { SYSTEM_DEFS };
