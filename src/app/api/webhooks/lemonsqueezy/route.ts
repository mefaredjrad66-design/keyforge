import { createHmac, timingSafeEqual } from 'crypto';

import { store } from '@/lib/db';
import { fail, json } from '@/lib/http';
import { planFromVariant, resolvePlan, siteUrl } from '@/lib/plans';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/lemonsqueezy
 * Signature-verified in production. When no webhook secret is configured the route
 * accepts a locally-generated mock event (dev only) so the funnel can be tested for $0.
 */

const ACTIVE = new Set(['active', 'on_trial', 'paid']);

function verify(raw: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;
  const digest = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'), 'utf8');
  const given = Buffer.from(signature.trim(), 'utf8');
  return digest.length === given.length && timingSafeEqual(digest, given);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-signature');
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const isMockEvent = req.headers.get('x-keyforge-mock') === '1';

  if (secret) {
    if (!verify(raw, signature)) return fail('Invalid signature', 401);
  } else if (!(isMockEvent && process.env.NODE_ENV !== 'production')) {
    // No secret configured: only unsigned mock events in local dev are allowed through.
    return fail('Webhook secret not configured', 401);
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('Malformed JSON body');
  }

  const event = String(body?.meta?.event_name ?? '');
  const attrs = body?.data?.attributes ?? {};
  const providerId = String(body?.data?.id ?? attrs.order_id ?? `mock-${Date.now()}`);
  const email = String(attrs.user_email ?? attrs.customer_email ?? '').toLowerCase();

  if (!email) return fail('Event contained no customer email');

  const variantId = attrs.variant_id ?? attrs.first_order_item?.variant_id;
  const plan =
    body?.meta?.custom_data?.plan != null
      ? resolvePlan(body.meta.custom_data.plan)
      : planFromVariant(variantId);

  const rawStatus = String(attrs.status ?? 'active').toLowerCase();
  const cancelling = /cancel|expire|refund|unpaid|past_due/.test(event + rawStatus);
  const status = cancelling ? 'cancelled' : ACTIVE.has(rawStatus) ? 'active' : rawStatus;

  await store.upsertSubscription({
    provider: 'lemonsqueezy',
    provider_id: providerId,
    customer_email: email,
    plan: plan.id,
    status,
  });

  return json({
    ok: true,
    event,
    plan: plan.id,
    status,
    reference: providerId,
    claim_url: `${siteUrl()}/success?plan=${plan.id}`,
  });
}
