import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * KeyForge key format:  KF1-XXXX-XXXX-XXXX-XXXX-CCCC
 *   - 16 chars of Crockford base32 randomness (80 bits of entropy)
 *   - CCCC = HMAC checksum, so obviously-fake keys are rejected with zero DB reads
 * Only the SHA-256 hash of a key is ever stored, so a DB leak cannot be replayed.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: no I, L, O, U
const PREFIX = 'KF1';

let devSecret: string | null = null;

function signingSecret(): string {
  const fromEnv = process.env.KEYFORGE_SIGNING_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('KEYFORGE_SIGNING_SECRET is required in production');
  }
  // Dev fallback, kept on globalThis so every route (and hot reload) signs with
  // the same secret. Keys still reset when you restart the server.
  const g = globalThis as typeof globalThis & { __keyforgeDevSecret?: string };
  if (!devSecret) devSecret = g.__keyforgeDevSecret ??= randomBytes(32).toString('hex');
  return devSecret;
}

function base32(bytes: Buffer, chars: number): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out.slice(0, chars);
}

function group(s: string, size = 4): string {
  return (s.match(new RegExp(`.{1,${size}}`, 'g')) ?? []).join('-');
}

function checksum(body: string): string {
  const mac = createHmac('sha256', signingSecret()).update(body).digest();
  return base32(mac, 4);
}

/** Normalizes user-pasted keys: trims, uppercases, collapses separators. */
export function normalizeKey(input: string): string {
  return String(input || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/^KF1/, '');
}

export function hashKey(key: string): string {
  return createHash('sha256').update(normalizeKey(key)).digest('hex');
}

export function generateKey(): { key: string; hash: string; prefix: string } {
  const body = base32(randomBytes(10), 16);
  const key = `${PREFIX}-${group(body)}-${checksum(body)}`;
  return { key, hash: hashKey(key), prefix: `${PREFIX}-${body.slice(0, 4)}` };
}

/** Stateless integrity check. Cheap shield against brute-force traffic. */
export function hasValidChecksum(input: string): boolean {
  const raw = normalizeKey(input);
  if (raw.length !== 20) return false;
  const body = raw.slice(0, 16);
  const given = Buffer.from(raw.slice(16), 'utf8');
  const want = Buffer.from(checksum(body), 'utf8');
  return given.length === want.length && timingSafeEqual(given, want);
}

/** API keys handed to app owners (used to mint license keys server-to-server). */
export function generateApiKey(): { apiKey: string; hash: string } {
  const apiKey = `kf_live_${randomBytes(24).toString('hex')}`;
  return { apiKey, hash: createHash('sha256').update(apiKey).digest('hex') };
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(String(apiKey || '').trim()).digest('hex');
}
