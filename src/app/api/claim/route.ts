import { store } from '@/lib/db';
import { fail, json, readJson, str } from '@/lib/http';
import { PLANS, resolvePlan } from '@/lib/plans';
import { generateApiKey } from '@/lib/keys';

export const runtime = 'nodejs';

/**
 * POST /api/claim — exchanges proof of purchase for an API key, exactly once.
 * Proof is the email + the order/subscription reference from the Lemon Squeezy
 * receipt (which they email automatically), so no mail provider is needed at $0.
 * Free tier can claim without a reference, but only if no account exists yet.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  const email = str(body.email)?.toLowerCase();
  const reference = str(body.reference);
  const appName = str(body.app_name) ?? 'My app';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail('A valid email is required');
  }

  const sub = await store.getSubscriptionByEmail(email);
  const paid = sub?.status === 'active';

  if (paid && !reference) {
    return fail('Enter the order reference from your receipt email to claim your key.', 403, {
      needs_reference: true,
    });
  }
  if (paid && reference && reference.toLowerCase() !== String(sub?.provider_id).toLowerCase()) {
    return fail('That reference does not match our record for this email.', 403);
  }

  const plan = paid ? resolvePlan(sub?.plan) : PLANS.free;
  const existing = await store.getAppByOwnerEmail(email);
  const { apiKey, hash } = generateApiKey();

  if (existing) {
    if (!paid) {
      return fail(
        'An account already exists for this email. Upgrade, or include your purchase reference to reissue a key.',
        409,
      );
    }
    await store.rotateAppApiKey(existing.id, hash, plan.id, plan.keyQuota);
    return json({
      ok: true,
      rotated: true,
      plan: plan.id,
      key_quota: plan.keyQuota,
      api_key: apiKey,
      note: 'Your previous API key was revoked. Store this one now — it is shown once.',
    });
  }

  const app = await store.createApp({
    name: appName,
    owner_email: email,
    api_key_hash: hash,
    plan: plan.id,
    key_quota: plan.keyQuota,
  });

  return json(
    {
      ok: true,
      rotated: false,
      app_id: app.id,
      plan: plan.id,
      key_quota: plan.keyQuota,
      api_key: apiKey,
      note: 'Store this API key now — it is shown once.',
    },
    201,
  );
}
