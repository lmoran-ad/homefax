import type { PermitProvider, PermitRecord } from "../contracts/types";
import { ArcgisLayer, normalizeAddress, sqlLiteral } from "./arcgis";
import { isoDate, text } from "./http";
import type { PermitSource } from "./sources";

/**
 * Reads building permits from an ArcGIS FeatureServer.
 *
 * The Socrata sibling exists because some cities publish permits on an
 * open-data portal; plenty of others publish the same dataset as an Esri layer
 * alongside their parcels, and there is no way to know which without looking.
 * Both produce the same PermitRecord, so which one a jurisdiction uses is a
 * descriptor detail rather than a difference anything downstream can see.
 */
export class ArcgisPermitProvider implements PermitProvider {
  private readonly layer: ArcgisLayer;

  constructor(
    private readonly source: PermitSource & { arcgisUrl: string },
    private readonly fallback: PermitProvider,
  ) {
    this.layer = new ArcgisLayer(source.id, source.arcgisUrl);
  }

  async getPermitHistory(input: {
    parcelId: string;
    address?: string;
  }): Promise<PermitRecord[]> {
    const f = this.source.fields;
    const clauses: string[] = [];

    if (input.address) {
      const street = normalizeAddress(input.address);
      if (street) {
        clauses.push(`UPPER(${f.address}) LIKE '${sqlLiteral(street)}%'`);
      }
    }
    if (f.parcelId && input.parcelId) {
      clauses.push(`${f.parcelId} = '${sqlLiteral(input.parcelId)}'`);
    }
    if (clauses.length === 0) return this.fallback.getPermitHistory(input);

    try {
      const payload = await this.layer.query(clauses.join(" OR "), 50);
      return (payload.features ?? [])
        .map((feature) => this.toRecord(feature.attributes))
        .filter((permit): permit is PermitRecord => permit !== null)
        .sort((a, b) => (a.issuedAt < b.issuedAt ? -1 : 1));
    } catch {
      return this.fallback.getPermitHistory(input);
    }
  }

  sample(): ReturnType<ArcgisLayer["sample"]> {
    return this.layer.sample();
  }

  private toRecord(row: Record<string, unknown>): PermitRecord | null {
    const f = this.source.fields;
    // Esri encodes dates as epoch milliseconds; isoDate handles both that and
    // the ISO strings a portal might return instead.
    const issuedAt = isoDate(row[f.issuedAt]);
    const permitNumber = text(row[f.permitNumber]);
    // Without a date and a number it is not something that can sit on a
    // timeline and be pointed at, so it is dropped rather than shown blank.
    if (!issuedAt || !permitNumber) return null;

    const finaled = f.finaledAt ? isoDate(row[f.finaledAt]) : null;
    const status = f.status ? text(row[f.status]).toUpperCase() : "";

    return {
      permitNumber,
      issuedAt,
      scope: (f.scope ? text(row[f.scope]) : "") || "Permit issued",
      status:
        finaled || status.includes("FINAL") || status.includes("COMPLETE")
          ? "FINALED"
          : "ISSUED",
    };
  }
}
