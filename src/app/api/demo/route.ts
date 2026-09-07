import { store } from '@/lib/db';
import { fail, json } from '@/lib/http';
import { generateApiKey, generateKey } from '@/lib/keys';

export const runtime = 'nodejs';

/**
 * POST /api/demo — mints a throwaway key against a shared sandbox app so visitors
 * can feel the product before signing up. Keys expire in 1 day, 2 seats.
 */

const g = globalThis as typeof globalThis & { __keyforgeSandboxApp?: string };
const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 5;
const WINDOW = 60 * 60 * 1000;

function rateLimited(req: Request): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'local';
  const rec = hits.get(ip);
  const now = Date.now();
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + WINDOW });
    return false;
  }
  rec.n += 1;
  return rec.n > LIMIT;
}

async function sandbox(): Promise<string> {
  if (g.__keyforgeSandboxApp) return g.__keyforgeSandboxApp;
  const { hash } = generateApiKey();
  const app = await store.createApp({
    name: 'KeyForge Playground',
    owner_email: 'playground@keyforge.local',
    api_key_hash: hash,
    plan: 'demo',
    key_quota: 100_000,
  });
  g.__keyforgeSandboxApp = app.id;
  return app.id;
}

export async function POST(req: Request) {
  if (rateLimited(req)) return fail('Demo limit reached. Grab a free account instead.', 429);

  const appId = await sandbox();
  const { key, hash, prefix } = generateKey();
  const record = await store.createKey({
    app_id: appId,
    key_hash: hash,
    key_prefix: prefix,
    sku: 'playground',
    seat_limit: 2,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });

  return json({
    ok: true,
    license_key: key,
    seat_limit: record.seat_limit,
    expires_at: record.expires_at,
  });
}
