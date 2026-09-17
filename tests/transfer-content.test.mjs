import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

test('Content transfer preserves destination accounts, verifies files and refuses different catalogs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'studio601-transfer-test-'));
  const source = join(directory, 'source');
  const target = join(directory, 'target');
  const bundle = join(directory, 'bundle');
  mkdirSync(join(source, 'uploads'), { recursive: true });
  mkdirSync(target);
  const sql = readFileSync('db/migrations/0001-local.sql', 'utf8');
  const sourceDb = new DatabaseSync(join(source, 'studio.sqlite'));
  const targetDb = new DatabaseSync(join(target, 'studio.sqlite'));
  const filename = '00000000-0000-0000-0000-000000000001.webp';
  const catalog = JSON.stringify({ modalities: [], professionals: [{ name: 'Preserved person', photo: '/api/media/' + filename }], sessions: [], contact: { address: 'Preserved address' } });
  const run = (mode, folder) => spawnSync(process.execPath, ['scripts/transfer-content.mjs', mode, bundle], { env: { ...process.env, STUDIO_DB_PATH: join(folder, 'studio.sqlite') }, encoding: 'utf8' });
  try {
    sourceDb.exec(sql); targetDb.exec(sql);
    sourceDb.prepare('INSERT INTO catalog VALUES (?,?,?)').run('studio', 25, catalog);
    targetDb.prepare('INSERT INTO administrators VALUES (?,?,?)').run('existing', 'vps-admin', 'preserved-hash');
    writeFileSync(join(source, 'uploads', filename), 'immutable-photo-bytes');
    assert.equal(run('export', source).status, 0);
    const photoPath = join(bundle, 'uploads', filename);
    writeFileSync(photoPath, 'corrupted');
    assert.equal(run('import', target).status, 1);
    assert.equal(targetDb.prepare('SELECT count(*) AS n FROM catalog').get().n, 0);
    writeFileSync(photoPath, 'immutable-photo-bytes');
    const imported = run('import', target);
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(targetDb.prepare('SELECT password_hash FROM administrators').get().password_hash, 'preserved-hash');
    assert.equal(targetDb.prepare('SELECT data FROM catalog').get().data, catalog);
    assert.equal(readFileSync(join(target, 'uploads', filename), 'utf8'), 'immutable-photo-bytes');
    assert.equal(run('import', target).status, 0);
    targetDb.prepare('UPDATE catalog SET data=?').run('{}');
    assert.equal(run('import', target).status, 1);
    assert.equal(targetDb.prepare('SELECT data FROM catalog').get().data, '{}');
  } finally {
    sourceDb.close(); targetDb.close();
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && directory.includes('studio601-transfer-test-'));
    rmSync(directory, { recursive: true, force: true });
  }
});
