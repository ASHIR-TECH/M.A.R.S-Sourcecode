import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  provider       TEXT NOT NULL,
  provider_sub   TEXT NOT NULL,
  email          TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  name           TEXT,
  picture        TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (provider, provider_sub)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  revoked_at    TEXT,
  revoked_reason TEXT,
  replaced_by   TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id);
`;

function nowIso() {
  return new Date().toISOString();
}

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    providerSub: row.provider_sub,
    email: row.email ?? null,
    emailVerified: Boolean(row.email_verified),
    name: row.name ?? null,
    picture: row.picture ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Persistence for users and refresh tokens.
 *
 * Refresh tokens are stored as SHA-256 hashes only: a database leak therefore
 * does not hand out usable sessions. Tokens rotate on every refresh, and a
 * previously revoked token being presented again is treated as theft and
 * revokes the whole family for that user.
 */
export function openDatabase(databasePath) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const statements = {
    selectUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
    selectUserByProvider: db.prepare('SELECT * FROM users WHERE provider = ? AND provider_sub = ?'),
    insertUser: db.prepare(`
      INSERT INTO users (id, provider, provider_sub, email, email_verified, name, picture, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateUser: db.prepare(`
      UPDATE users SET
        email = COALESCE(?, email),
        email_verified = CASE WHEN ? IS NULL THEN email_verified ELSE ? END,
        name = COALESCE(?, name),
        picture = COALESCE(?, picture),
        updated_at = ?
      WHERE id = ?
    `),
    insertRefreshToken: db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    selectRefreshByHash: db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?'),
    revokeRefreshToken: db.prepare(
      'UPDATE refresh_tokens SET revoked_at = ?, revoked_reason = ?, replaced_by = ? WHERE id = ?'
    ),
    revokeAllForUser: db.prepare(
      'UPDATE refresh_tokens SET revoked_at = ?, revoked_reason = ?, replaced_by = NULL WHERE user_id = ? AND revoked_at IS NULL'
    ),
    deleteExpiredRefreshTokens: db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?'),
  };

  return {
    /** Insert the provider identity on first login, refresh the profile after. */
    upsertUser({ id, provider, providerSub, email, emailVerified, name, picture }) {
      const timestamp = nowIso();
      const emailValue = email ?? null;
      const verified = emailVerified ? 1 : 0;
      const nameValue = name ?? null;
      const pictureValue = picture ?? null;

      const existing = statements.selectUserByProvider.get(provider, providerSub);
      if (!existing) {
        statements.insertUser.run(id, provider, providerSub, emailValue, verified, nameValue, pictureValue, timestamp, timestamp);
        return toUser(statements.selectUserByProvider.get(provider, providerSub));
      }

      statements.updateUser.run(emailValue, emailValue, verified, nameValue, pictureValue, timestamp, existing.id);
      return toUser(statements.selectUserById.get(existing.id));
    },

    getUserById(id) {
      return toUser(statements.selectUserById.get(id));
    },

    createRefreshToken({ id, userId, tokenHash, expiresAt }) {
      statements.insertRefreshToken.run(id, userId, tokenHash, expiresAt, nowIso());
    },

    getRefreshTokenByHash(tokenHash) {
      const row = statements.selectRefreshByHash.get(tokenHash);
      if (!row) return null;
      return {
        id: row.id,
        userId: row.user_id,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        revokedAt: row.revoked_at ?? null,
        revokedReason: row.revoked_reason ?? null,
        replacedBy: row.replaced_by ?? null,
      };
    },

    /** reason: 'rotated' | 'logout' | 'expired' | 'reuse' */
    revokeRefreshToken(id, reason, replacedBy = null) {
      statements.revokeRefreshToken.run(nowIso(), reason, replacedBy, id);
    },

    revokeAllRefreshTokensForUser(userId, reason = 'logout') {
      statements.revokeAllForUser.run(nowIso(), reason, userId);
    },

    pruneExpiredRefreshTokens() {
      statements.deleteExpiredRefreshTokens.run(nowIso());
    },

    close() {
      db.close();
    },
  };
}
