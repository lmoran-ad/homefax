import type { PermitProvider, PermitRecord } from "../contracts/types";
import { normalizeAddress, sqlLiteral } from "./arcgis";
import { fetchJson, isoDate, text } from "./http";
import type { PermitSource } from "./sources";

/**
 * Reads building permits from a Socrata open-data portal.
 *
 * Permits are the closest thing in public data to what this product claims to
 * be: dated work on a specific address, attested by somebody other than the
 * owner. Putting real ones on a timeline next to contributed records is the
 * shortest route to a record that looks like the real thing.
 *
 * Permit datasets are addressed, not parcelled — the parcel identifier is
 * often absent — so this looks up by address and falls back to the parcel
 * identifier only when the descriptor says the column exists.
 */
export class SocrataPermitProvider implements PermitProvider {
  constructor(
    private readonly source: PermitSource & { domain: string; dataset: string },
    private readonly fallback: PermitProvider,
  ) {}

  async getPermitHistory(input: {
    parcelId: string;
    address?: string;
  }): Promise<PermitRecord[]> {
    const f = this.source.fields;
    const clauses: string[] = [];

    if (input.address) {
      const street = normalizeAddress(input.address);
      if (street) {
        clauses.push(`starts_with(upper(${f.address}), '${sqlLiteral(street)}')`);
      }
    }
    if (f.parcelId && input.parcelId) {
      clauses.push(`${f.parcelId} = '${sqlLiteral(input.parcelId)}'`);
    }
    if (clauses.length === 0) return this.fallback.getPermitHistory(input);

    try {
      const rows = await this.query(clauses.join(" OR "), 50);
      const permits = rows
        .map((row) => this.toRecord(row))
        .filter((permit): permit is PermitRecord => permit !== null)
        .sort((a, b) => (a.issuedAt < b.issuedAt ? -1 : 1));
      // An address with no permits is a real answer, not a failure — plenty of
      // houses have never had one pulled. Only fall back when the source could
      // not be read at all.
      return permits;
    } catch {
      return this.fallback.getPermitHistory(input);
    }
  }

  /** The dataset's real column names and a sample row, for diagnostics. */
  async sample(): Promise<{
    url: string;
    fields: string[];
    row: Record<string, unknown> | null;
  }> {
    const rows = await this.query("", 1);
    const row = rows[0] ?? null;
    return {
      url: this.urlFor("", 1),
      fields: row ? Object.keys(row) : [],
      row,
    };
  }

  private urlFor(where: string, limit: number): string {
    const params = new URLSearchParams({ $limit: String(limit) });
    if (where) params.set("$where", where);
    return `https://${this.source.domain}/resource/${this.source.dataset}.json?${params.toString()}`;
  }

  private async query(
    where: string,
    limit: number,
  ): Promise<Record<string, unknown>[]> {
    const token = appToken();
    const payload = await fetchJson<Record<string, unknown>[]>({
      source: this.source.id,
      url: this.urlFor(where, limit),
      headers: token ? { "X-App-Token": token } : {},
    });
    return Array.isArray(payload) ? payload : [];
  }

  private toRecord(row: Record<string, unknown>): PermitRecord | null {
    const f = this.source.fields;
    const issuedAt = isoDate(row[f.issuedAt]);
    const permitNumber = text(row[f.permitNumber]);
    // Without a date and a number it is not something that can sit on a
    // timeline and be pointed at, so it is dropped rather than shown as blank.
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

/**
 * Socrata serves anonymous requests on a shared, throttled pool. A token is
 * free and lifts that; without one this still works, just with less headroom.
 */
function appToken(): string | undefined {
  const token = process.env.SOCRATA_APP_TOKEN;
  return token && token.trim() ? token.trim() : undefined;
}
