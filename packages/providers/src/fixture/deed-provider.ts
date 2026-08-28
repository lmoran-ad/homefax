import { fixtureProperties } from "@homefax/db/fixtures";
import type { DeedProvider } from "../contracts/types.js";

export class FixtureDeedProvider implements DeedProvider {
  /**
   * Exactly one parcel has a name on file. Everything else returns null, which
   * routes the homeowner to the proof-of-ownership path instead of the
   * auto-verified one — both branches have to be reachable for the demo to
   * mean anything.
   */
  async ownerOfRecord(parcelId: string): Promise<string | null> {
    const property = fixtureProperties.find((p) => p.parcelId === parcelId);
    return property?.ownerOfRecord ?? null;
  }
}
