import { fixtureProperties } from "@homefax/fixtures";
import type { PermitProvider, PermitRecord } from "../contracts/types";

const PERMIT_NUMBER = /\b([A-Z]\d{2}-\d{4,5})\b/;

export class FixturePermitProvider implements PermitProvider {
  /**
   * Reads the permit events already attached to a seeded property. Returns an
   * empty array for a provisioned parcel — a record created this morning from
   * assessor data genuinely has no permit history to report.
   */
  async getPermitHistory(input: { parcelId: string }): Promise<PermitRecord[]> {
    const property = fixtureProperties.find((p) => p.parcelId === input.parcelId);
    if (!property) return [];
    return property.events
      .filter((e) => e.eventType.startsWith("PERMIT"))
      .map((e) => {
        const number = PERMIT_NUMBER.exec(`${e.meta} ${e.title}`)?.[1] ?? "";
        return {
          permitNumber: number,
          issuedAt: e.occurredAt,
          scope: e.description || e.title,
          status: e.eventType === "PERMIT_FINALIZED" ? ("FINALED" as const) : ("ISSUED" as const),
        };
      });
  }
}
