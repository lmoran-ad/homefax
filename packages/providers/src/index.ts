import { FixtureDeedProvider } from "./fixture/deed-provider";
import { FixtureLicenseProvider } from "./fixture/license-provider";
import { FixtureMlsProvider } from "./fixture/mls-provider";
import { FixtureParcelProvider } from "./fixture/parcel-provider";
import { FixturePermitProvider } from "./fixture/permit-provider";
import { ArcgisParcelProvider } from "./live/arcgis-parcel-provider";
import { SocrataPermitProvider } from "./live/socrata-permit-provider";
import {
  DENVER_PARCELS,
  DENVER_PERMITS,
  withOverrides,
  type ParcelSource,
  type PermitSource,
} from "./live/sources";
import { LocalStorageProvider } from "./storage/local-storage-provider";
import type {
  DeedProvider,
  LicenseProvider,
  MlsProvider,
  ParcelProvider,
  PermitProvider,
  StorageProvider,
} from "./contracts/types";

export * from "./contracts/types";
export { LocalStorageProvider, ArcgisParcelProvider, SocrataPermitProvider };
export { DENVER_PARCELS, DENVER_PERMITS, withOverrides } from "./live/sources";
export type { ParcelSource, PermitSource } from "./live/sources";
export { SourceError } from "./live/http";

/**
 * Factories are the only supported way to obtain a provider. UI and domain
 * code must never import a fixture implementation directly — that is what
 * keeps the swap to a live integration a one-line change here.
 */

let parcel: ParcelProvider | null = null;
let mls: MlsProvider | null = null;
let permit: PermitProvider | null = null;
let deed: DeedProvider | null = null;
let license: LicenseProvider | null = null;
let storage: StorageProvider | null = null;

/**
 * `PARCEL_SOURCE=denver` reads real parcels from the county's ArcGIS layer,
 * with the fixture behind it: a portal that is down, slow or renamed falls
 * through rather than taking a page with it. Unset — the default — is the
 * fixture alone, which is what keeps the seeded demo and the e2e suite
 * deterministic.
 */
export function getParcelProvider(): ParcelProvider {
  if (parcel) return parcel;
  const fixture = new FixtureParcelProvider();
  const live = liveParcelSource();
  parcel = live ? new ArcgisParcelProvider(live, fixture) : fixture;
  return parcel;
}

export function getMlsProvider(): MlsProvider {
  mls ??= new FixtureMlsProvider();
  return mls;
}

/** `PERMIT_SOURCE=denver`, same arrangement as parcels. */
export function getPermitProvider(): PermitProvider {
  if (permit) return permit;
  const fixture = new FixturePermitProvider();
  const live = livePermitSource();
  permit = live ? new SocrataPermitProvider(live, fixture) : fixture;
  return permit;
}

/**
 * What each seam is actually wired to, and anything wrong with how it was
 * configured. Read by the source diagnostics route — a live integration whose
 * configuration cannot be inspected from outside is one you debug by guessing.
 */
export function describeSources(): {
  parcels: { driver: string; source: string | null; problems: string[] };
  permits: { driver: string; source: string | null; problems: string[] };
} {
  const parcelSource = liveParcelSourceWithProblems();
  const permitSource = livePermitSourceWithProblems();
  return {
    parcels: {
      driver: parcelSource.source ? "arcgis" : "fixture",
      source: parcelSource.source?.url ?? null,
      problems: parcelSource.problems,
    },
    permits: {
      driver: permitSource.source ? "socrata" : "fixture",
      source: permitSource.source
        ? `https://${permitSource.source.domain}/resource/${permitSource.source.dataset}.json`
        : null,
      problems: permitSource.problems,
    },
  };
}

function liveParcelSourceWithProblems(): {
  source: ParcelSource | null;
  problems: string[];
} {
  if ((process.env.PARCEL_SOURCE ?? "").toLowerCase() !== "denver") {
    return { source: null, problems: [] };
  }
  const { source, problems } = withOverrides(DENVER_PARCELS, "PARCEL_SOURCE");
  return { source, problems };
}

function livePermitSourceWithProblems(): {
  source: PermitSource | null;
  problems: string[];
} {
  if ((process.env.PERMIT_SOURCE ?? "").toLowerCase() !== "denver") {
    return { source: null, problems: [] };
  }
  const { source, problems } = withOverrides(DENVER_PERMITS, "PERMIT_SOURCE");
  return { source, problems };
}

const liveParcelSource = (): ParcelSource | null =>
  liveParcelSourceWithProblems().source;
const livePermitSource = (): PermitSource | null =>
  livePermitSourceWithProblems().source;

export function getDeedProvider(): DeedProvider {
  deed ??= new FixtureDeedProvider();
  return deed;
}

export function getLicenseProvider(): LicenseProvider {
  license ??= new FixtureLicenseProvider();
  return license;
}

/**
 * The filesystem store, unless something has installed another one.
 *
 * The database-backed store lives in `@homefax/db` — it needs the connection
 * and the schema, and reaching for those from here would make the two packages
 * depend on each other. `installStorageProvider` there picks the driver and
 * registers it before anything asks for one.
 */
export function getStorageProvider(rootPath?: string): StorageProvider {
  storage ??= new LocalStorageProvider(
    rootPath ?? process.env.LOCAL_STORAGE_PATH ?? "./storage/demo-uploads",
  );
  return storage;
}

/** Whether a store has already been chosen, so installing one cannot clobber it. */
export function hasStorageProvider(): boolean {
  return storage !== null;
}

/** Test seam: swap any provider for a double. */
export function __setProviders(overrides: {
  parcel?: ParcelProvider;
  mls?: MlsProvider;
  permit?: PermitProvider;
  deed?: DeedProvider;
  license?: LicenseProvider;
  storage?: StorageProvider;
}): void {
  if (overrides.parcel) parcel = overrides.parcel;
  if (overrides.mls) mls = overrides.mls;
  if (overrides.permit) permit = overrides.permit;
  if (overrides.deed) deed = overrides.deed;
  if (overrides.license) license = overrides.license;
  if (overrides.storage) storage = overrides.storage;
}
