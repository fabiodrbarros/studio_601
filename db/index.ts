import { database } from '@/lib/local-db.mjs';

export function getDb() {
  return database();
}
