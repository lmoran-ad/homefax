import type { PermitProvider, PermitRecord } from "../contracts/types";
import { ArcgisLayer, normalizeAddress, sqlLiteral } from "./arcgis";
import { isoDate, num, text } from "./http";
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

  /**
   * Runs each half of the lookup on its own and reports both.
   *
   * A combined query returning nothing cannot say whether the address failed
   * to match, the parcel identifier failed to match, or the house simply has
   * no permits — and those call for three different fixes. Running them
   * separately, and handing back the request that was made, turns the next
   * question into one somebody can answer by opening a URL.
   */
  async explainLookup(input: { parcelId: string; address?: string }): Promise<{
    byAddress: { where: string; url: string; found: number; error?: string };
    byParcelId: { where: string; url: string; found: number; error?: string } | null;
  }> {
    const f = this.source.fields;

    const run = async (where: string) => {
      const url = this.layer.urlFor(where, 50);
      try {
        const payload = await this.layer.query(where, 50);
        return { where, url, found: payload.features?.length ?? 0 };
      } catch (error) {
        return {
          where,
          url,
          found: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };

    const street = normalizeAddress(input.address ?? "");
    const byAddress = await run(
      `UPPER(${f.address}) LIKE '${sqlLiteral(street)}%'`,
    );
    const byParcelId =
      f.parcelId && input.parcelId
        ? await run(`${f.parcelId} = '${sqlLiteral(input.parcelId)}'`)
        : null;

    return { byAddress, byParcelId };
  }

  /**
   * Addresses with the most permits on file, most recent first.
   *
   * A provisioned record is only as interesting as the history behind it, and
   * most houses have never had a permit pulled — so demonstrating this on an
   * address picked from memory usually shows an empty timeline and proves
   * nothing. This finds the addresses where there is something to see.
   */
  async busiestAddresses(
    limit = 10,
  ): Promise<
    { address: string; parcelId: string; permits: number; latest: string; work: string[] }[]
  > {
    const f = this.source.fields;
    const columns = [f.address, f.issuedAt, f.scope, f.parcelId].filter(
      (name): name is string => Boolean(name),
    );

    const payload = await this.layer.query("1=1", 600, {
      outFields: columns.join(","),
      orderBy: `${f.issuedAt} DESC`,
    });

    const byAddress = new Map<
      string,
      { address: string; parcelId: string; permits: number; latest: string; work: Set<string> }
    >();

    for (const feature of payload.features ?? []) {
      const address = text(feature.attributes[f.address]);
      const issuedAt = isoDate(feature.attributes[f.issuedAt]);
      if (!address || !issuedAt) continue;

      const entry = byAddress.get(address) ?? {
        address,
        parcelId: f.parcelId ? text(feature.attributes[f.parcelId]) : "",
        permits: 0,
        latest: issuedAt,
        work: new Set<string>(),
      };
      entry.permits += 1;
      if (issuedAt > entry.latest) entry.latest = issuedAt;
      const scope = f.scope ? text(feature.attributes[f.scope]) : "";
      if (scope) entry.work.add(scope);
      byAddress.set(address, entry);
    }

    return [...byAddress.values()]
      .sort((a, b) => b.permits - a.permits || (a.latest < b.latest ? 1 : -1))
      .slice(0, limit)
      .map(({ work, ...rest }) => ({ ...rest, work: [...work].slice(0, 4) }));
  }

  serviceLayers(): ReturnType<ArcgisLayer["serviceLayers"]> {
    return this.layer.serviceLayers();
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

    const finaledAt = f.finaledAt ? isoDate(row[f.finaledAt]) : null;
    const status = f.status ? text(row[f.status]).toUpperCase() : "";

    return {
      permitNumber,
      issuedAt,
      scope: (f.scope ? text(row[f.scope]) : "") || "Permit issued",
      status:
        finaledAt || status.includes("FINAL") || status.includes("COMPLETE")
          ? "FINALED"
          : "ISSUED",
      contractor: (f.contractor ? text(row[f.contractor]) : "") || null,
      valuation: f.valuation ? num(row[f.valuation]) : null,
      finaledAt,
    };
  }
}
