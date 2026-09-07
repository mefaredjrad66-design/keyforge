import { store } from '@/lib/db';
import { fail, isAdmin, json, readJson, str } from '@/lib/http';
import { generateApiKey } from '@/lib/keys';

export const runtime = 'nodejs';

/** POST /api/v1/apps — register an app and receive its secret API key (shown once). */
export async function POST(req: Request) {
  if (!isAdmin(req)) return fail('Admin token required', 401);

  const body = await readJson(req);
  const name = str(body.name);
  const email = str(body.owner_email);
  if (!name || !email) return fail('name and owner_email are required');

  const { apiKey, hash } = generateApiKey();
  const app = await store.createApp({ name, owner_email: email, api_key_hash: hash });

  return json(
    {
      ok: true,
      app: { id: app.id, name: app.name, plan: app.plan, key_quota: app.key_quota },
      api_key: apiKey,
      note: 'Store this api_key now — it is never shown again.',
    },
    201,
  );
}
