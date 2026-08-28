import {
  __setProviders,
  getStorageProvider,
  hasStorageProvider,
  type StorageProvider,
} from "@homefax/providers";
import { DatabaseStorageProvider } from "./database-storage-provider";

export { DatabaseStorageProvider };

/**
 * Chooses the document store and registers it, so every later
 * `getStorageProvider()` — in a route, a service, the seeder — hands back the
 * same instance.
 *
 * `STORAGE_DRIVER=database` puts document bytes in PostgreSQL, which is what a
 * serverless deployment needs: there is no durable local disk there, so a file
 * written by one invocation is not present for the next. Anything else keeps
 * the filesystem driver, which is what local development wants.
 *
 * Call this from a composition root — the API's context, the seeder — and
 * nowhere else. A provider already installed by a test wins, so a harness can
 * still point storage at a throwaway directory.
 */
export function installStorageProvider(rootPath?: string): StorageProvider {
  if (process.env.STORAGE_DRIVER === "database" && !hasStorageProvider()) {
    const provider = new DatabaseStorageProvider();
    __setProviders({ storage: provider });
    return provider;
  }
  return getStorageProvider(rootPath);
}
