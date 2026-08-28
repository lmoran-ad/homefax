import { fetchJson, SourceError } from "./http";

type EsriResponse = {
  features?: { attributes: Record<string, unknown> }[];
  error?: { code?: number; message?: string; details?: string[] };
  fields?: { name: string; type: string }[];
};

/**
 * One ArcGIS FeatureServer layer.
 *
 * Shared by the parcel and permit providers because most jurisdictions publish
 * both the same way — an Esri hub with a layer per dataset — and the query
 * shape, the encoding and the way failure is reported are identical.
 */
export class ArcgisLayer {
  private readonly base: string;

  constructor(
    private readonly sourceId: string,
    url: string,
  ) {
    this.base = url.trim().replace(/\/+$/, "");
  }

  async query(where: string, limit: number): Promise<EsriResponse> {
    const url = this.urlFor(where, limit);

    const payload = await fetchJson<EsriResponse>({ source: this.sourceId, url });

    // ArcGIS answers a rejected query with HTTP 200 and an error object, so a
    // wrong column name looks like success until this check.
    if (payload.error) {
      throw new SourceError(
        this.sourceId,
        `${payload.error.message ?? "query rejected"}${
          payload.error.details?.length ? ` (${payload.error.details.join("; ")})` : ""
        }`,
        { url },
      );
    }
    return payload;
  }

  async queryOne(where: string): Promise<Record<string, unknown> | null> {
    const payload = await this.query(where, 1);
    return payload.features?.[0]?.attributes ?? null;
  }

  /** The layer's real column names plus one row, for diagnostics. */
  async sample(): Promise<{
    url: string;
    fields: string[];
    row: Record<string, unknown> | null;
  }> {
    const payload = await this.query("1=1", 1);
    const row = payload.features?.[0]?.attributes ?? null;
    return {
      url: this.urlFor("1=1", 1),
      fields: payload.fields?.map((x) => x.name) ?? (row ? Object.keys(row) : []),
      row,
    };
  }

  /**
   * Built with URLSearchParams rather than by hand: a `where` clause carries
   * spaces, quotes and percent signs, and a single unencoded one turns the
   * whole request into something the runtime will not parse.
   */
  urlFor(where: string, limit: number): string {
    const params = new URLSearchParams({
      where,
      outFields: "*",
      returnGeometry: "false",
      resultRecordCount: String(limit),
      f: "json",
    });
    return `${this.base}/query?${params.toString()}`;
  }
}

/**
 * The street portion, upper-cased, for a prefix match against a jurisdiction's
 * address column. Unit numbers and the city/state/zip tail are dropped — those
 * are stored separately, and including them matches nothing.
 */
export function normalizeAddress(address: string): string {
  const street = address.split(",")[0] ?? "";
  return street
    .toUpperCase()
    .replace(/\b(APT|UNIT|STE|SUITE|#)\s*[\w-]+/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes a value for a SQL `where` clause.
 *
 * Addresses reach these providers from a request body, and both ArcGIS and
 * Socrata take SQL — so a quote that survives to the endpoint is a query the
 * caller wrote. Doubling it is what keeps that from being interesting.
 */
export function sqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
