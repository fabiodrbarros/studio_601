-- Modelo original D1 preservado; autenticação local independente.
CREATE TABLE IF NOT EXISTS catalog (id TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS administrators (id TEXT PRIMARY KEY NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  administrator_id TEXT NOT NULL REFERENCES administrators(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (bucket TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL);
