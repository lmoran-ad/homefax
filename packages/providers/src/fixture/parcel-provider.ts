import { fixtureProperties } from "@homefax/db/fixtures";
import type {
  ParcelProvider,
  ParcelRecord,
  ProvisionedParcel,
} from "../contracts/types.js";

const toRecord = (p: (typeof fixtureProperties)[number]): ParcelRecord => ({
  tokenId: p.tokenId,
  parcelId: p.parcelId,
  address: p.address,
  city: p.city,
  state: p.state,
  postalCode: p.postalCode,
  propertyType: p.propertyType,
  yearBuilt: p.yearBuilt,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  livingSqft: p.livingSqft,
  lotSqft: p.lotSqft,
  estimatedValue: p.estimatedValue,
});

const money = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * A tiny deterministic hash over the address. Provisioning must produce the
 * same token ID for the same address every time — a random one would make the
 * flow untestable and would mint duplicate records on a retry.
 */
function addressSeed(address: string): number {
  let h = 2166136261;
  for (let i = 0; i < address.length; i += 1) {
    h ^= address.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export class FixtureParcelProvider implements ParcelProvider {
  async findByAddress(address: string): Promise<ParcelRecord | null> {
    const needle = address.trim().toLowerCase();
    if (!needle) return null;
    const match = fixtureProperties.find((p) => {
      const full = `${p.address}, ${p.city} ${p.state} ${p.postalCode}`.toLowerCase();
      return (
        full.startsWith(needle) ||
        p.address.toLowerCase().startsWith(needle) ||
        full.includes(needle)
      );
    });
    return match ? toRecord(match) : null;
  }

  async findByParcelId(parcelId: string): Promise<ParcelRecord | null> {
    const match = fixtureProperties.find(
      (p) => p.parcelId.toLowerCase() === parcelId.trim().toLowerCase(),
    );
    return match ? toRecord(match) : null;
  }

  /**
   * Synthesizes a record for a parcel outside the pre-provisioned markets.
   * The result is deliberately thin: two county events, every system UNKNOWN,
   * and therefore low Home Health confidence. That is the honest starting
   * state — an agent claiming it is claiming authorization over a record that
   * already exists, not creating history.
   */
  async provision(rawAddress: string): Promise<ProvisionedParcel> {
    const parts = rawAddress.split(",").map((s) => s.trim());
    const address = parts[0] || rawAddress.trim();
    const city = parts[1] || "Denver";
    const postalCode = (parts[2] ?? "").replace(/[^0-9]/g, "") || "80206";

    const seed = addressSeed(`${address}|${city}|${postalCode}`);
    const num = 6000 + (seed % 3000);
    const cityCode = city.slice(0, 3).toUpperCase().padEnd(3, "X");
    const tokenId = `HF-US-CO-${cityCode}-${String(num).padStart(8, "0")}`;
    const streetNumber = /\d+/.exec(address)?.[0] ?? "0000";
    const parcelId = `${cityCode}-${streetNumber}-${String(num).slice(0, 3)}-${String(num).slice(1, 3)}`;
    const yearBuilt = 1900 + (seed % 100);
    const estimatedValue = 420000 + (seed % 480000);

    return {
      tokenId,
      parcelId,
      address,
      city,
      state: "CO",
      postalCode,
      propertyType: "Single family, detached",
      yearBuilt,
      bedrooms: 3,
      bathrooms: 2,
      livingSqft: 1600 + (seed % 1400),
      lotSqft: 5000 + (seed % 4000),
      estimatedValue,
      systemStatus: "UNKNOWN",
      events: [
        {
          id: `${tokenId}-P1`,
          occurredAt: "2026-08-28",
          eventType: "PROPERTY_CREATED",
          title: "HomeFax provisioned from county records",
          meta: `${city} County Assessor · parcel ${parcelId}`,
          description:
            "Record created from public assessor and recorder data. No maintenance, permit or inspection history has been contributed yet.",
          verificationLevel: "SOURCE_VERIFIED",
          visibility: "PUBLIC",
        },
        {
          id: `${tokenId}-P2`,
          occurredAt: "2026-08-01",
          eventType: "TAX_ASSESSMENT",
          title: "Tax assessment · 2026",
          meta: `Assessed ${money(estimatedValue * 0.9)} · Tax ${money(estimatedValue * 0.008)}`,
          description: "",
          verificationLevel: "SOURCE_VERIFIED",
          visibility: "PUBLIC",
        },
      ],
    };
  }
}
