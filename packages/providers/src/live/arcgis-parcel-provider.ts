import type {
  ParcelProvider,
  ParcelRecord,
  ProvisionedParcel,
} from "../contracts/types";
import { fetchJson, isoDate, num, text, SourceError } from "./http";
import type { ParcelSource } from "./sources";

type EsriResponse = {
  features?: { attributes: Record<string, unknown> }[];
  error?: { code?: number; message?: string; details?: string[] };
  fields?: { name: string; type: string }[];
};

/**
 * Reads parcels from a county's ArcGIS FeatureServer.
 *
 * Most US counties publish assessor parcels this way, which makes this one
 * class the difference between a demo record and a record about a house
 * somebody can go and stand in front of.
 *
 * Every failure — the portal being down, a column named something other than
 * what the descriptor says, an address the county has never heard of — falls
 * through to the fallback provider. A public data portal is not something this
 * product controls, and a county outage must not be able to break a
 * demonstration.
 */
export class ArcgisParcelProvider implements ParcelProvider {
  constructor(
    private readonly source: ParcelSource,
    private readonly fallback: ParcelProvider,
  ) {}

  async findByAddress(address: string): Promise<ParcelRecord | null> {
    const needle = normalizeAddress(address);
    if (!needle) return null;
    try {
      const row = await this.queryOne(
        `UPPER(${this.source.fields.address}) LIKE '${sqlLiteral(needle)}%'`,
      );
      return row ? this.toRecord(row) : this.fallback.findByAddress(address);
    } catch {
      return this.fallback.findByAddress(address);
    }
  }

  async findByParcelId(parcelId: string): Promise<ParcelRecord | null> {
    const id = parcelId.trim();
    if (!id) return null;
    try {
      const row = await this.queryOne(
        `${this.source.fields.parcelId} = '${sqlLiteral(id)}'`,
      );
      return row ? this.toRecord(row) : this.fallback.findByParcelId(parcelId);
    } catch {
      return this.fallback.findByParcelId(parcelId);
    }
  }

  /**
   * Builds a record from what the county actually publishes.
   *
   * Attributes the county does not publish stay zero rather than being filled
   * with something plausible. A HomeFax that invents a bedroom count is worth
   * less than one that admits it does not know, and the provisioning event
   * names exactly which fields came from the assessor.
   */
  async provision(address: string): Promise<ProvisionedParcel> {
    let row: Record<string, unknown> | null = null;
    try {
      const needle = normalizeAddress(address);
      row = needle
        ? await this.queryOne(
            `UPPER(${this.source.fields.address}) LIKE '${sqlLiteral(needle)}%'`,
          )
        : null;
    } catch {
      row = null;
    }
    if (!row) return this.fallback.provision(address);

    const record = this.toRecord(row);
    const f = this.source.fields;
    const published = (
      [
        ["year built", f.yearBuilt, record.yearBuilt],
        ["living area", f.livingSqft, record.livingSqft],
        ["lot size", f.lotSqft, record.lotSqft],
        ["bedrooms", f.bedrooms, record.bedrooms],
        ["bathrooms", f.bathrooms, record.bathrooms],
        ["assessed value", f.assessedValue, record.estimatedValue],
      ] as const
    )
      .filter(([, field, value]) => field && value > 0)
      .map(([label]) => label);

    const events: ProvisionedParcel["events"] = [
      {
        id: `${record.tokenId}-P1`,
        occurredAt: new Date().toISOString().slice(0, 10),
        eventType: "PROPERTY_CREATED",
        title: "HomeFax provisioned from county records",
        meta: `${this.source.label} · parcel ${record.parcelId}`,
        description: published.length
          ? `Created from the county's published parcel record. The assessor supplied ${published.join(", ")}. Anything absent is unknown rather than assumed, and no maintenance, permit or inspection history has been contributed yet.`
          : "Created from the county's published parcel record, which carried the address and parcel identifier only. Every other attribute is unknown rather than assumed.",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
      },
    ];

    if (record.estimatedValue > 0) {
      events.push({
        id: `${record.tokenId}-P2`,
        occurredAt: new Date().toISOString().slice(0, 10),
        eventType: "TAX_ASSESSMENT",
        title: "Assessed value on file",
        meta: `${money(record.estimatedValue)} · ${this.source.label}`,
        description: "",
        verificationLevel: "SOURCE_VERIFIED",
        visibility: "PUBLIC",
      });
    }

    return { ...record, systemStatus: "UNKNOWN", events };
  }

  /** The raw first row plus the layer's real column names, for diagnostics. */
  async sample(): Promise<{ fields: string[]; row: Record<string, unknown> | null }> {
    const payload = await this.query("1=1", 1);
    const row = payload.features?.[0]?.attributes ?? null;
    return {
      fields: payload.fields?.map((x) => x.name) ?? (row ? Object.keys(row) : []),
      row,
    };
  }

  private async queryOne(where: string): Promise<Record<string, unknown> | null> {
    const payload = await this.query(where, 1);
    return payload.features?.[0]?.attributes ?? null;
  }

  private async query(where: string, limit: number): Promise<EsriResponse> {
    const url = `${this.source.url.replace(/\/$/, "")}/query?${new URLSearchParams({
      where,
      outFields: "*",
      returnGeometry: "false",
      resultRecordCount: String(limit),
      f: "json",
    }).toString()}`;

    const payload = await fetchJson<EsriResponse>({ source: this.source.id, url });

    // ArcGIS answers a rejected query with HTTP 200 and an error object, so a
    // bad column name looks like success until this check.
    if (payload.error) {
      throw new SourceError(
        this.source.id,
        payload.error.message ?? "query rejected",
      );
    }
    return payload;
  }

  private toRecord(row: Record<string, unknown>): ParcelRecord {
    const f = this.source.fields;
    const pick = (field: string | undefined): unknown =>
      field ? row[field] : undefined;

    const address = text(pick(f.address));
    const parcelId = text(pick(f.parcelId)) || deriveParcelId(address);
    const postalCode = text(pick(f.postalCode)).slice(0, 5);
    const city = text(pick(f.city)) || this.source.defaults.city;

    return {
      tokenId: tokenIdFor(this.source.defaults.state, city, parcelId || address),
      parcelId,
      address,
      city,
      state: this.source.defaults.state,
      postalCode: postalCode || this.source.defaults.postalCode,
      propertyType: text(pick(f.propertyType)) || "Not published by the county",
      yearBuilt: num(pick(f.yearBuilt)) ?? 0,
      bedrooms: num(pick(f.bedrooms)) ?? 0,
      bathrooms: num(pick(f.bathrooms)) ?? 0,
      livingSqft: num(pick(f.livingSqft)) ?? 0,
      lotSqft: num(pick(f.lotSqft)) ?? 0,
      estimatedValue: num(pick(f.assessedValue)) ?? 0,
    };
  }
}

const money = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * The street portion, upper-cased, for a prefix match against the county's
 * address column. Unit numbers and the city/state/zip tail are dropped: the
 * county stores them separately, and including them matches nothing.
 */
function normalizeAddress(address: string): string {
  const street = address.split(",")[0] ?? "";
  return street
    .toUpperCase()
    .replace(/\b(APT|UNIT|STE|SUITE|#)\s*[\w-]+/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes a value for an ArcGIS `where` clause.
 *
 * The address reaches this from a request body. ArcGIS takes SQL, so a quote
 * that survives here is a query the caller wrote, and the layer is readable by
 * anyone — doubling the quote is what keeps that from being interesting.
 */
function sqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function deriveParcelId(address: string): string {
  return address.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase().slice(0, 32);
}

/** Deterministic: the same parcel must never mint two records. */
function tokenIdFor(state: string, city: string, seedSource: string): string {
  let h = 2166136261;
  for (let i = 0; i < seedSource.length; i += 1) {
    h ^= seedSource.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const num = Math.abs(h) % 100_000_000;
  const cityCode = city.slice(0, 3).toUpperCase().padEnd(3, "X");
  return `HF-US-${state}-${cityCode}-${String(num).padStart(8, "0")}`;
}
