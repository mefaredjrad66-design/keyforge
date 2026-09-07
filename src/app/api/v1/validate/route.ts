import { store } from '@/lib/db';
import { json, readJson, str } from '@/lib/http';
import { hasValidChecksum, hashKey } from '@/lib/keys';

export const runtime = 'nodejs';

/**
 * POST /api/v1/validate — the endpoint your shipped app calls.
 * Public on purpose (no API key): it runs inside end-user machines.
 * Safety comes from the checksum pre-filter + hash-only lookups + seat limits.
 * Body: { license_key, device_id?, hostname? }
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  const licenseKey = str(body.license_key) ?? str(body.key);
  if (!licenseKey) return deny('missing_key', 'license_key is required');

  // Stateless integrity gate: junk keys never reach the database.
  if (!hasValidChecksum(licenseKey)) return deny('malformed', 'Key failed checksum');

  const record = await store.getKeyByHash(hashKey(licenseKey));
  if (!record) return deny('not_found', 'Unknown license key');
  if (record.status === 'revoked') return deny('revoked', 'License was revoked');

  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    if (record.status !== 'expired') await store.setKeyStatus(record.id, 'expired');
    return deny('expired', 'License expired', { expires_at: record.expires_at });
  }

  const deviceId = str(body.device_id);
  let seatsUsed = await store.countActivations(record.id);

  if (deviceId) {
    const existing = await store.getActivation(record.id, deviceId);
    if (existing) {
      await store.touchActivation(record.id, deviceId);
    } else if (seatsUsed >= record.seat_limit) {
      return deny('seat_limit', `Seat limit reached (${record.seat_limit})`, {
        seats_used: seatsUsed,
        seat_limit: record.seat_limit,
      });
    } else {
      await store.addActivation(record.id, deviceId, str(body.hostname));
      seatsUsed += 1;
    }
  }

  return json({
    ok: true,
    valid: true,
    sku: record.sku,
    email: record.email,
    seat_limit: record.seat_limit,
    seats_used: seatsUsed,
    expires_at: record.expires_at,
  });
}

function deny(reason: string, message: string, extra?: Record<string, unknown>) {
  // Always 200 so offline-tolerant clients can distinguish "invalid" from "server down".
  return json({ ok: true, valid: false, reason, message, ...extra });
}
