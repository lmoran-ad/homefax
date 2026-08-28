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
  private readonly configured: string;
  /** Set once, if the configured layer index turned out to be wrong. */
  private repaired: string | null = null;
  private repairAttempted = false;

  constructor(
    private readonly sourceId: string,
    url: string,
  ) {
    this.configured = url.trim().replace(/\/+$/, "");
  }

  private get base(): string {
    return this.repaired ?? this.configured;
  }

  async query(
    where: string,
    limit: number,
    options: QueryOptions = {},
  ): Promise<EsriResponse> {
    try {
      return await this.queryAt(this.base, where, limit, options);
    } catch (error) {
      const base = await this.repairLayerIndex();
      if (!base) throw error;
      return this.queryAt(base, where, limit, options);
    }
  }

  async queryOne(where: string): Promise<Record<string, unknown> | null> {
    const payload = await this.query(where, 1);
    return payload.features?.[0]?.attributes ?? null;
  }

  /**
   * The layers the service publishes, with their indices.
   *
   * A FeatureServer holds many layers and the number on the end of the URL
   * picks one; getting it wrong fails exactly like a wrong column name or a
   * moved service. Asking the service what it contains turns three
   * indistinguishable failures into a list you can read.
   */
  async serviceLayers(): Promise<{ id: number; name: string }[]> {
    const root = this.base.replace(/\/\d+$/, "");
    const payload = await fetchJson<{
      layers?: { id: number; name: string }[];
      tables?: { id: number; name: string }[];
    }>({ source: this.sourceId, url: `${root}?f=json` });
    return [...(payload.layers ?? []), ...(payload.tables ?? [])].map((layer) => ({
      id: layer.id,
      name: layer.name,
    }));
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
      // Reported after the query, so it names the layer actually read rather
      // than the one that was configured.
      url: urlFor(this.base, "1=1", 1),
      fields: payload.fields?.map((x) => x.name) ?? (row ? Object.keys(row) : []),
      row,
    };
  }

  /** The request this layer would make, for reporting a failure. */
  urlFor(where: string, limit: number): string {
    return urlFor(this.base, where, limit);
  }

  /**
   * Counts on the server, grouped by a column.
   *
   * The alternative is to pull a page of rows and tally them here, which
   * answers a different question than the one being asked: a page is the most
   * recent N, so tallying it ranks by "busiest in the last few days" and every
   * result lands on the same small number. Aggregation is what makes an
   * all-time answer possible without downloading the layer.
   */
  async aggregate(input: {
    where: string;
    groupBy: readonly string[];
    statistics: readonly {
      type: "count" | "max" | "min" | "sum";
      field: string;
      as: string;
    }[];
    orderBy?: string;
    limit: number;
  }): Promise<Record<string, unknown>[]> {
    const params = new URLSearchParams({
      where: input.where,
      groupByFieldsForStatistics: input.groupBy.join(","),
      outStatistics: JSON.stringify(
        input.statistics.map((statistic) => ({
          statisticType: statistic.type,
          onStatisticField: statistic.field,
          outStatisticFieldName: statistic.as,
        })),
      ),
      returnGeometry: "false",
      resultRecordCount: String(input.limit),
      f: "json",
    });
    if (input.orderBy) params.set("orderByFields", input.orderBy);

    const url = `${this.base}/query?${params.toString()}`;
    const payload = await fetchJson<EsriResponse>({ source: this.sourceId, url });
    if (payload.error) {
      throw new SourceError(
        this.sourceId,
        payload.error.message ?? "aggregate query rejected",
        { url },
      );
    }
    return (payload.features ?? []).map((feature) => feature.attributes);
  }

  private async queryAt(
    base: string,
    where: string,
    limit: number,
    options: QueryOptions = {},
  ): Promise<EsriResponse> {
    const url = urlFor(base, where, limit, options);
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

  /**
   * Recovers from a layer index that has moved.
   *
   * Publishers renumber: these services carry a single layer at an index that
   * is neither zero nor stable, and asking for one that no longer exists does
   * not even fail as a 404 — ArcGIS answers with a redirect that fetch cannot
   * follow. Left alone, a renumber silently drops the integration back to
   * fixtures, and the record quietly stops being real.
   *
   * Only taken when the service publishes exactly one layer, because then
   * there is no question which was meant, and only once per instance.
   */
  private async repairLayerIndex(): Promise<string | null> {
    if (this.repairAttempted) return null;
    this.repairAttempted = true;

    const layers = await this.serviceLayers().catch(() => []);
    if (layers.length !== 1) return null;

    const root = this.configured.replace(/\/\d+$/, "");
    const only = `${root}/${layers[0]!.id}`;
    if (only === this.configured) return null;

    this.repaired = only;
    return only;
  }
}

export type QueryOptions = {
  /** Narrow the columns. A suggestion needs four, not seventy. */
  outFields?: string;
  /** Collapse repeats — one parcel per address rather than one per unit. */
  distinct?: boolean;
  orderBy?: string;
};

function urlFor(
  base: string,
  where: string,
  limit: number,
  options: QueryOptions = {},
): string {
  // Built with URLSearchParams rather than by hand: a `where` clause carries
  // spaces, quotes and percent signs, and a single unencoded one turns the
  // whole request into something the runtime will not parse.
  const params = new URLSearchParams({
    where,
    outFields: options.outFields ?? "*",
    returnGeometry: "false",
    resultRecordCount: String(limit),
    f: "json",
  });
  if (options.distinct) params.set("returnDistinctValues", "true");
  if (options.orderBy) params.set("orderByFields", options.orderBy);
  return `${base}/query?${params.toString()}`;
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
