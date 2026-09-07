import { resolvePlan } from '@/lib/plans';
import MockForm from './mock-form';

export const metadata = { title: 'Mock checkout — KeyForge' };

export default function MockCheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = resolvePlan(searchParams.plan);
  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-300">
        Mock checkout. No Lemon Squeezy keys are configured, so no money moves. This simulates the
        real webhook so you can test the full purchase → claim → API key flow locally.
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {plan.label} — ${plan.priceUsd}/mo
      </h1>
      <MockForm planId={plan.id} />
    </div>
  );
}
