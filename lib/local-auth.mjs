import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from './local-db.mjs';

const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = 'studio601_admin';
export const SESSION_SECONDS = 8 * 60 * 60;
const WINDOW_MS = 15 * 60 * 1000;
/** @param {string} value */
const digest = value => createHash('sha256').update(value).digest('hex');
/** @param {string} value */
export const normalizeUsername = value => value.trim().toLowerCase();

/** @param {string} password */
export async function hashPassword(password) {
  if (password.length < 12 || password.length > 1024) throw new Error('A password deve ter entre 12 e 1024 caracteres.');
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

/** @param {string} password @param {string} encoded */
async function verifyPassword(password, encoded) {
  const [algorithm, salt, hash] = encoded.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const actual = await scrypt(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

/** @param {string} username @param {string} password @param {boolean} reset */
export async function setAdministrator(username, password, reset = false) {
  username = normalizeUsername(username);
  if (!/^[a-z0-9][a-z0-9@._+-]{2,99}$/.test(username)) throw new Error('Usa um identificador de 3 a 100 caracteres (letras sem acentos, números, @ . _ + -).');
  const db = database();
  const existing = db.prepare('SELECT id FROM administrators WHERE username=?').get(username);
  if (reset && !existing) throw new Error('Conta inexistente.');
  if (!reset && existing) throw new Error('A conta já existe. Usa pnpm admin:password.');
  const hash = await hashPassword(password);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (reset) {
      db.prepare('UPDATE administrators SET password_hash=? WHERE username=?').run(hash, username);
      db.prepare('DELETE FROM admin_sessions WHERE administrator_id=?').run(existing.id);
    } else {
      db.prepare('INSERT INTO administrators (id,username,password_hash) VALUES (?,?,?)').run(randomUUID(), username, hash);
    }
    db.prepare('DELETE FROM login_attempts WHERE bucket=?').run(digest(username));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** @param {string} username @param {string} password */
export async function login(username, password) {
  const db = database(), now = Date.now();
  username = normalizeUsername(username);
  const bucket = digest(username);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM login_attempts WHERE resets_at<=?').run(now);
    for (const [key, limit] of [[bucket, 5], ['global', 30]]) {
      const row = db.prepare('SELECT attempts FROM login_attempts WHERE bucket=?').get(key);
      if (row && Number(row.attempts) >= Number(limit)) {
        db.exec('COMMIT');
        return { status: 'limited' };
      }
    }
    for (const key of [bucket, 'global']) db.prepare('INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1').run(key, now + WINDOW_MS);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  const user = db.prepare('SELECT id,password_hash FROM administrators WHERE username=?').get(username);
  // Mesmo custo para contas inexistentes. Este hash não permite login.
  const dummy = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
  const valid = await verifyPassword(password, user ? String(user.password_hash) : dummy);
  if (!user || !valid) return { status: 'invalid' };
  db.prepare('DELETE FROM login_attempts WHERE bucket=?').run(bucket);
  db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').run(now);
  const token = randomBytes(32).toString('base64url');
  // Uma alteração de password durante a verificação invalida este login também.
  const created = db.prepare('INSERT INTO admin_sessions (token_hash,administrator_id,expires_at) SELECT ?,id,? FROM administrators WHERE id=? AND password_hash=?')
    .run(digest(token), Date.now() + SESSION_SECONDS * 1000, user.id, user.password_hash);
  if (!created.changes) return { status: 'invalid' };
  return { status: 'ok', token };
}

/** @param {string | undefined} token */
export function sessionAdministrator(token) {
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  return database().prepare('SELECT a.id,a.username FROM admin_sessions s JOIN administrators a ON a.id=s.administrator_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token), Date.now()) || null;
}

/** @param {string | undefined} token */
export function logout(token) {
  if (token) database().prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(digest(token));
}
