import { fail } from '@/lib/http';
import { resolvePlan, siteUrl } from '@/lib/plans';

export const runtime = 'nodejs';

/**
 * GET /api/checkout?plan=solo — creates a Lemon Squeezy checkout and redirects.
 * With no Lemon Squeezy keys configured it redirects to a local mock checkout,
 * so the whole paid funnel is testable before any merchant account exists.
 */
export async function GET(req: Request) {
  const plan = resolvePlan(new URL(req.url).searchParams.get('plan'));

  if (plan.priceUsd === 0) {
    return Response.redirect(`${siteUrl()}/success?plan=free`, 303);
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = plan.variantEnv ? process.env[plan.variantEnv] : undefined;

  if (!apiKey || !storeId || !variantId) {
    return Response.redirect(`${siteUrl()}/checkout/mock?plan=${plan.id}`, 303);
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: { custom: { plan: plan.id } },
          product_options: { redirect_url: `${siteUrl()}/success?plan=${plan.id}` },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(storeId) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    return fail('Checkout provider error. Please try again shortly.', 502);
  }

  const payload = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = payload.data?.attributes?.url;
  if (!url) return fail('Checkout provider returned no URL.', 502);

  return Response.redirect(url, 303);
}
