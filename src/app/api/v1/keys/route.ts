import { store } from '@/lib/db';
import { fail, int, isApp, json, readJson, requireApp, str } from '@/lib/http';
import { generateKey } from '@/lib/keys';

export const runtime = 'nodejs';

/** POST /api/v1/keys — mint a license key. Call this from your checkout webhook. */
export async function POST(req: Request) {
  const app = await requireApp(req);
  if (!isApp(app)) return app;

  const used = await store.countKeys(app.id);
  if (used >= app.key_quota) {
    return fail(`Key quota reached (${app.key_quota}). Upgrade your plan.`, 402, {
      used,
      quota: app.key_quota,
    });
  }

  const body = await readJson(req);
  const { key, hash, prefix } = generateKey();
  const days = body.expires_in_days ? int(body.expires_in_days, 0) : 0;

  const record = await store.createKey({
    app_id: app.id,
    key_hash: hash,
    key_prefix: prefix,
    email: str(body.email),
    sku: str(body.sku) ?? 'default',
    seat_limit: int(body.seat_limit, 1),
    order_ref: str(body.order_ref),
    expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
  });

  return json(
    {
      ok: true,
      license_key: key,
      id: record.id,
      sku: record.sku,
      seat_limit: record.seat_limit,
      expires_at: record.expires_at,
    },
    201,
  );
}

/** GET /api/v1/keys — list recent keys (hashes only, never the plaintext key). */
export async function GET(req: Request) {
  const app = await requireApp(req);
  if (!isApp(app)) return app;

  const keys = await store.listKeys(app.id, 100);
  return json({
    ok: true,
    count: keys.length,
    quota: app.key_quota,
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.key_prefix,
      email: k.email,
      sku: k.sku,
      seat_limit: k.seat_limit,
      status: k.status,
      expires_at: k.expires_at,
      created_at: k.created_at,
    })),
  });
}
