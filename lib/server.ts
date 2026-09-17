import { currentAdministrator } from './auth';
import { readStoredCatalog, writeStoredCatalog } from './local-db.mjs';
import { empty, type Catalog } from './catalog';
export async function isAdmin() { return !!await currentAdministrator(); }
export async function readCatalog(): Promise<{version: number; data: Catalog}> {
  const row = readStoredCatalog();
  return row ? { version: Number(row.version), data: JSON.parse(String(row.data)) as Catalog }
    : { version: 0, data: structuredClone(empty) };
}
export function saveCatalog(version: number, data: Catalog) { return writeStoredCatalog(version, JSON.stringify(data)); }
