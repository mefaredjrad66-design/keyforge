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

/**
 * Resolves the public origin. Defensive on purpose: an env var that is set but empty
 * (or missing its scheme) used to crash `next build` with ERR_INVALID_URL while
 * prerendering /_not-found, because `??` only catches null/undefined.
 */
const LOCAL_FALLBACK = 'http://localhost:3000';

function toOrigin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

export function siteUrl(): string {
  return (
    toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    toOrigin(process.env.NEXT_PUBLIC_VERCEL_URL) ??
    toOrigin(process.env.VERCEL_URL) ??
    LOCAL_FALLBACK
  );
}
