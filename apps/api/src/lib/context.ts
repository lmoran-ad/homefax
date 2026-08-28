import { loadServerEnv, type ServerEnv } from "@hometoken/config";
import { getDb, type Database } from "@hometoken/db";
import {
  getDeedProvider,
  getLicenseProvider,
  getMlsProvider,
  getParcelProvider,
  getPermitProvider,
  getStorageProvider,
  type DeedProvider,
  type LicenseProvider,
  type MlsProvider,
  type ParcelProvider,
  type PermitProvider,
  type StorageProvider,
} from "@hometoken/providers";

/**
 * Everything a service needs, resolved once. Services take this rather than
 * reaching for singletons, which keeps them straightforward to test with
 * doubles.
 */
export type AppContext = {
  env: ServerEnv;
  db: Database;
  parcels: ParcelProvider;
  mls: MlsProvider;
  permits: PermitProvider;
  deeds: DeedProvider;
  licenses: LicenseProvider;
  storage: StorageProvider;
};

export function createContext(env: ServerEnv = loadServerEnv()): AppContext {
  return {
    env,
    db: getDb(env.DATABASE_URL),
    parcels: getParcelProvider(),
    mls: getMlsProvider(),
    permits: getPermitProvider(),
    deeds: getDeedProvider(),
    licenses: getLicenseProvider(),
    storage: getStorageProvider(env.LOCAL_STORAGE_PATH),
  };
}
