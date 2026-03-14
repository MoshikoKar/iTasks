/**
 * Unit tests for auth helpers (verifyPassword).
 * Core business logic for password verification without DB/cookies.
 */
import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

vi.mock('./db', () => ({ db: {} }));

import { verifyPassword } from './auth';

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

function buildStoredHash(password: string, salt?: string): string {
  const s = salt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, s, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return `${s}:${hash}`;
}

describe('verifyPassword', () => {
  it('returns true when candidate matches stored hash', () => {
    const password = 'correct-password';
    const storedHash = buildStoredHash(password);
    expect(verifyPassword(storedHash, password)).toBe(true);
  });

  it('returns false when candidate does not match', () => {
    const storedHash = buildStoredHash('actual-password');
    expect(verifyPassword(storedHash, 'wrong-password')).toBe(false);
  });

  it('returns false for malformed storedHash missing colon', () => {
    expect(verifyPassword('nosaltorhash', 'any')).toBe(false);
  });

  it('returns false when salt is empty', () => {
    const hash = crypto
      .pbkdf2Sync('p', 'x', PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString('hex');
    expect(verifyPassword(`:${hash}`, 'p')).toBe(false);
  });

  it('returns false when hash part is empty', () => {
    expect(verifyPassword('somesalt:', 'p')).toBe(false);
  });

  it('returns false for empty candidate when stored hash is valid', () => {
    const storedHash = buildStoredHash('nonempty');
    expect(verifyPassword(storedHash, '')).toBe(false);
  });
});
