import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** @returns {DatabaseSync} */
export function database() {
  const path = resolve(process.env.STUDIO_DB_PATH || './data/studio601.sqlite');
  const databases = globalThis[Symbol.for('studio601.databases')] ||= new Map();
  if (!databases.has(path)) {
    mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    db.exec(readFileSync(resolve('db/migrations/0001-local.sql'), 'utf8'));
    databases.set(path, db);
  }
  return databases.get(path);
}

export function readStoredCatalog() {
  return database().prepare('SELECT version, data FROM catalog WHERE id = ?').get('studio');
}

/** @param {number} version @param {string} json */
export function writeStoredCatalog(version, json) {
  const db = database();
  const result = version === 0
    ? db.prepare('INSERT OR IGNORE INTO catalog (id,version,data) VALUES (?,1,?)').run('studio', json)
    : db.prepare('UPDATE catalog SET data=?,version=version+1 WHERE id=? AND version=?').run(json, 'studio', version);
  return Number(result.changes) === 1;
}
