/**
 * Where the live data comes from, and what its columns are called.
 *
 * This is deliberately data rather than code. Every jurisdiction publishes the
 * same facts under different column names — SITUS_ADDRESS, SITE_ADDR,
 * situs_addr — and the only way to learn the real ones is to look at a live
 * response. Keeping the mapping here means adding a county is a new entry, and
 * correcting a wrong guess is one line.
 *
 * Both the endpoint and the field map can also be overridden by environment
 * variable, so a mapping can be fixed against a running deployment without
 * waiting for a build. `GET /api/admin/sources` returns a live sample row with
 * its real column names, which is how you find out what to put here.
 */

export type ParcelFieldMap = {
  address: string;
  parcelId: string;
  city?: string;
  postalCode?: string;
  yearBuilt?: string;
  livingSqft?: string;
  lotSqft?: string;
  bedrooms?: string;
  bathrooms?: string;
  propertyType?: string;
  assessedValue?: string;
};

export type ParcelSource = {
  id: string;
  label: string;
  /** An ArcGIS FeatureServer layer, ending in /FeatureServer/<n>. */
  url: string;
  fields: ParcelFieldMap;
  defaults: { city: string; state: string; postalCode: string };
};

export type PermitFieldMap = {
  permitNumber: string;
  issuedAt: string;
  address: string;
  scope?: string;
  status?: string;
  parcelId?: string;
  finaledAt?: string;
};

/**
 * Permits come from one of two shapes of endpoint, and which one a
 * jurisdiction uses is not knowable without looking: some publish an
 * open-data portal, others an Esri layer beside their parcels. Whichever is
 * filled in decides the provider; `arcgisUrl` wins when both are.
 */
export type PermitSource = {
  id: string;
  label: string;
  /** An ArcGIS FeatureServer layer, ending in /FeatureServer/<n>. */
  arcgisUrl?: string;
  /** A Socrata host, e.g. data.somewhere.gov — no scheme. */
  domain?: string;
  /** The dataset's four-by-four identifier, e.g. abcd-1234. */
  dataset?: string;
  fields: PermitFieldMap;
};

/**
 * Denver's assessor parcels and building permits.
 *
 * These column names are a starting guess, not verified truth — confirm them
 * against `GET /api/admin/sources` before trusting anything they produce. The
 * providers treat every optional field as genuinely optional, so a wrong name
 * costs an attribute rather than the whole lookup.
 */
export const DENVER_PARCELS: ParcelSource = {
  id: "denver-parcels",
  label: "Denver County Assessor · parcels",
  url: "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/ArcGIS/rest/services/ODC_PROP_PARCELS_A/FeatureServer/0",
  fields: {
    address: "SITUS_ADDRESS_LINE1",
    parcelId: "SCHEDNUM",
    city: "SITUS_ADDRESS_CITY",
    postalCode: "SITUS_ADDRESS_ZIP",
    yearBuilt: "CCYRBLT",
    livingSqft: "TOTAL_BUILDING_SQFT",
    lotSqft: "LAND_SQFT",
    bedrooms: "BED_ROOMS",
    bathrooms: "FULL_BATHS",
    propertyType: "PROPERTY_CLASS",
    assessedValue: "TOTAL_VALUE",
  },
  defaults: { city: "Denver", state: "CO", postalCode: "80202" },
};

export const DENVER_PERMITS: PermitSource = {
  id: "denver-permits",
  label: "Denver Community Planning & Development · building permits",
  domain: "data.colorado.gov",
  dataset: "j5wq-v6hp",
  fields: {
    permitNumber: "permit_number",
    issuedAt: "issued_date",
    address: "address_line1",
    scope: "permit_description",
    status: "status",
    parcelId: "parcel_id",
  },
};

/**
 * Applies environment overrides on top of a descriptor.
 *
 * `<PREFIX>_URL` (or `_DOMAIN`/`_DATASET`) replaces the endpoint;
 * `<PREFIX>_FIELDS` is a JSON object merged over the field map. A malformed
 * override is ignored rather than thrown — a typo in a dashboard should not
 * take a deployment down, and the reason lands in the source diagnostics.
 */
export function withOverrides<T extends ParcelSource | PermitSource>(
  source: T,
  prefix: string,
  env: NodeJS.ProcessEnv = process.env,
): { source: T; problems: string[] } {
  const problems: string[] = [];
  const next = { ...source, fields: { ...source.fields } } as T;

  const url = env[`${prefix}_URL`];
  if (url) {
    if ("url" in next) (next as ParcelSource).url = url;
    // Pointing a permit source at a FeatureServer switches it to ArcGIS, so a
    // jurisdiction that turns out to publish permits as an Esri layer can be
    // corrected from a dashboard rather than in code.
    else (next as PermitSource).arcgisUrl = url;
  }

  const domain = env[`${prefix}_DOMAIN`];
  if (domain && !("url" in next)) {
    (next as PermitSource).domain = domain;
    (next as PermitSource).arcgisUrl = undefined;
  }

  const dataset = env[`${prefix}_DATASET`];
  if (dataset && !("url" in next)) (next as PermitSource).dataset = dataset;

  const fields = env[`${prefix}_FIELDS`];
  if (fields) {
    try {
      const parsed: unknown = JSON.parse(fields);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(next.fields, parsed);
      } else {
        problems.push(`${prefix}_FIELDS must be a JSON object`);
      }
    } catch {
      problems.push(`${prefix}_FIELDS is not valid JSON and was ignored`);
    }
  }

  return { source: next, problems };
}
