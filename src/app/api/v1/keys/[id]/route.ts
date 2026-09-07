import { store } from '@/lib/db';
import { fail, isApp, json, requireApp } from '@/lib/http';

export const runtime = 'nodejs';

/** DELETE /api/v1/keys/:id — revoke a key (refunds, chargebacks, piracy). */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const app = await requireApp(req);
  if (!isApp(app)) return app;

  const keys = await store.listKeys(app.id, 1000);
  const target = keys.find((k) => k.id === params.id);
  if (!target) return fail('Key not found for this app', 404);

  await store.setKeyStatus(target.id, 'revoked');
  return json({ ok: true, id: target.id, status: 'revoked' });
}
