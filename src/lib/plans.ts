export type PlanId = 'free' | 'solo' | 'studio';

export interface Plan {
  id: PlanId;
  label: string;
  priceUsd: number;
  keyQuota: number;
  variantEnv?: 'LEMONSQUEEZY_VARIANT_ID_SOLO' | 'LEMONSQUEEZY_VARIANT_ID_STUDIO';
}

export const PLANS: Record<PlanId, Plan> = {
  free: { id: 'free', label: 'Free', priceUsd: 0, keyQuota: 50 },
  solo: {
    id: 'solo',
    label: 'Solo',
    priceUsd: 12,
    keyQuota: 500,
    variantEnv: 'LEMONSQUEEZY_VARIANT_ID_SOLO',
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    priceUsd: 29,
    keyQuota: 10_000,
    variantEnv: 'LEMONSQUEEZY_VARIANT_ID_STUDIO',
  },
};

export function resolvePlan(value: unknown): Plan {
  const id = String(value ?? '').toLowerCase();
  return (PLANS as Record<string, Plan>)[id] ?? PLANS.free;
}

/** Maps a Lemon Squeezy variant ID back to a plan so webhooks stay declarative. */
export function planFromVariant(variantId: unknown): Plan {
  const id = String(variantId ?? '');
  for (const plan of Object.values(PLANS)) {
    if (plan.variantEnv && process.env[plan.variantEnv] === id) return plan;
  }
  return PLANS.solo;
}

export const siteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
