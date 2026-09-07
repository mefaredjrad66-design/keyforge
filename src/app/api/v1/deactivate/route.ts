import { store } from '@/lib/db';
import { json, readJson, str } from '@/lib/http';
import { hasValidChecksum, hashKey } from '@/lib/keys';

export const runtime = 'nodejs';

/** POST /api/v1/deactivate — frees a seat so the user can move to a new machine. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const licenseKey = str(body.license_key) ?? str(body.key);
  const deviceId = str(body.device_id);
  if (!licenseKey || !deviceId) {
    return json({ ok: false, error: 'license_key and device_id are required' }, 400);
  }
  if (!hasValidChecksum(licenseKey)) {
    return json({ ok: false, error: 'Key failed checksum' }, 400);
  }

  const record = await store.getKeyByHash(hashKey(licenseKey));
  if (!record) return json({ ok: false, error: 'Unknown license key' }, 404);

  await store.removeActivation(record.id, deviceId);
  return json({ ok: true, seats_used: await store.countActivations(record.id) });
}
