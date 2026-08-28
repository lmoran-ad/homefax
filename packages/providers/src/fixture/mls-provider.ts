import { fixtureProperties } from "@homefax/db/fixtures";
import type { MlsListing, MlsProvider } from "../contracts/types.js";

/** The listing agent of record for every seeded listing, for the demo. */
const LISTING_AGENT_ID = "REMAX-CO-4471";

export class FixtureMlsProvider implements MlsProvider {
  async getListing(parcelId: string): Promise<MlsListing | null> {
    const property = fixtureProperties.find((p) => p.parcelId === parcelId);
    if (!property) return null;
    return {
      mlsNumber: property.mlsNumber,
      listingAgentId: LISTING_AGENT_ID,
      parcelId: property.parcelId,
    };
  }

  /**
   * Returns the expected MLS number on failure so the claim screen can name it
   * in the rejection: telling an agent only "that is wrong" is useless, and
   * naming the listing of record is what makes the constraint legible.
   */
  async verifyListingAgent(input: {
    parcelId: string;
    mlsNumber: string;
  }): Promise<
    { ok: true; listing: MlsListing } | { ok: false; expected: string | null }
  > {
    const listing = await this.getListing(input.parcelId);
    if (!listing) return { ok: false, expected: null };
    if (listing.mlsNumber !== input.mlsNumber.trim()) {
      return { ok: false, expected: listing.mlsNumber };
    }
    return { ok: true, listing };
  }
}
