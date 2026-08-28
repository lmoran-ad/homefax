import { FixtureDeedProvider } from "./fixture/deed-provider.js";
import { FixtureLicenseProvider } from "./fixture/license-provider.js";
import { FixtureMlsProvider } from "./fixture/mls-provider.js";
import { FixtureParcelProvider } from "./fixture/parcel-provider.js";
import { FixturePermitProvider } from "./fixture/permit-provider.js";
import { LocalStorageProvider } from "./storage/local-storage-provider.js";
import type {
  DeedProvider,
  LicenseProvider,
  MlsProvider,
  ParcelProvider,
  PermitProvider,
  StorageProvider,
} from "./contracts/types.js";

export * from "./contracts/types.js";
export { LocalStorageProvider };

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

export function getParcelProvider(): ParcelProvider {
  parcel ??= new FixtureParcelProvider();
  return parcel;
}

export function getMlsProvider(): MlsProvider {
  mls ??= new FixtureMlsProvider();
  return mls;
}

export function getPermitProvider(): PermitProvider {
  permit ??= new FixturePermitProvider();
  return permit;
}

export function getDeedProvider(): DeedProvider {
  deed ??= new FixtureDeedProvider();
  return deed;
}

export function getLicenseProvider(): LicenseProvider {
  license ??= new FixtureLicenseProvider();
  return license;
}

export function getStorageProvider(rootPath?: string): StorageProvider {
  storage ??= new LocalStorageProvider(
    rootPath ?? process.env.LOCAL_STORAGE_PATH ?? "./storage/demo-uploads",
  );
  return storage;
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
