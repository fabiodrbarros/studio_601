import { DatabaseSync, backup } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const [mode, directoryArgument] = process.argv.slice(2);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const references = data => [...new Set([...JSON.stringify(data).matchAll(/\/api\/media\/([a-f0-9-]{36}\.webp)/g)].map(match => match[1]))].sort();
const dbPath = resolve(process.env.STUDIO_DB_PATH || './data/studio601.sqlite');
let db;
try {
  process.umask(0o077);
  if (!['export', 'import'].includes(mode) || !directoryArgument) throw Error('Uso: node scripts/transfer-content.mjs export|import DIRETORIO');
  const directory = resolve(directoryArgument);
  if (!existsSync(dbPath)) throw Error('Base de dados inexistente: não foi criado nem substituído nada.');
  db = new DatabaseSync(dbPath, { readOnly: mode === 'export' });
  db.exec('PRAGMA busy_timeout=5000');
  if (mode === 'export') {
    const row = db.prepare('SELECT version,data FROM catalog WHERE id=?').get('studio');
    if (!row) throw Error('Não há catálogo para exportar.');
    // A single SQLite read captures one committed catalog version. Uploads are immutable.
    const data = JSON.parse(row.data);
    const names = references(data);
    const photos = names.map(name => ({ name, bytes: readFileSync(join(dirname(dbPath), 'uploads', name)) }));
    mkdirSync(directory); // Refuse to overwrite an existing export.
    mkdirSync(join(directory, 'uploads'));
    const files = {};
    for (const { name, bytes } of photos) {
      writeFileSync(join(directory, 'uploads', name), bytes, { flag: 'wx' });
      files[name] = digest(bytes);
    }
    const catalog = JSON.stringify(data);
    writeFileSync(join(directory, 'catalog.json'), catalog, { flag: 'wx' });
    writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ format: 'studio601-content-v1', version: Number(row.version), catalogSha256: digest(catalog), files }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ exported: directory, version: Number(row.version), modalities: data.modalities.length, professionals: data.professionals.length, sessions: data.sessions.length, photos: names.length, credentialsIncluded: false }));
  } else {
    const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
    const catalog = readFileSync(join(directory, 'catalog.json'), 'utf8');
    if (manifest.format !== 'studio601-content-v1' || digest(catalog) !== manifest.catalogSha256) throw Error('Formato ou integridade do catálogo inválido.');
    const data = JSON.parse(catalog);
    if (!Array.isArray(data.modalities) || !Array.isArray(data.professionals) || !Array.isArray(data.sessions) || !data.contact || typeof data.contact !== 'object') throw Error('Estrutura de catálogo inválida.');
    const names = references(data);
    const photos = names.map(name => {
      const bytes = readFileSync(join(directory, 'uploads', name));
      if (digest(bytes) !== manifest.files?.[name]) throw Error('Fotografia ausente ou alterada: ' + name);
      return { name, bytes };
    });
    const previous = db.prepare('SELECT version,data FROM catalog WHERE id=?').get('studio');
    if (previous && previous.data !== catalog) throw Error('A VPS já tem um catálogo diferente. Importação recusada para preservar edições.');
    const uploads = join(dirname(dbPath), 'uploads');
    for (const { name, bytes } of photos) {
      const target = join(uploads, name);
      if (existsSync(target) && digest(readFileSync(target)) !== digest(bytes)) throw Error('Já existe uma fotografia diferente com o mesmo nome.');
    }
    const backups = join(dirname(dbPath), 'backups');
    mkdirSync(backups, { recursive: true });
    const backupPath = join(backups, 'before-content-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
    await backup(db, backupPath);
    mkdirSync(uploads, { recursive: true });
    for (const { name, bytes } of photos) {
      const target = join(uploads, name);
      if (!existsSync(target)) writeFileSync(target, bytes, { flag: 'wx' });
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = db.prepare('SELECT version,data FROM catalog WHERE id=?').get('studio');
      if (current && current.data !== catalog) throw Error('O catálogo foi editado durante a importação. Não foi substituído.');
      if (!current) db.prepare('INSERT INTO catalog (id,version,data) VALUES (?,?,?)').run('studio', 1, catalog);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    console.log(JSON.stringify({ imported: true, photos: names.length, backup: backupPath, administratorsPreserved: true }));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { db?.close(); }
