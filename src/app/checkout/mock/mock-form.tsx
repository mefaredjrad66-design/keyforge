'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function MockForm({ planId }: { planId: string }) {
  const [email, setEmail] = useState('dev@example.com');
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setOut(null);
    const reference = `mock_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const res = await fetch('/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-keyforge-mock': '1' },
        body: JSON.stringify({
          meta: { event_name: 'subscription_created', custom_data: { plan: planId } },
          data: { id: reference, attributes: { user_email: email, status: 'active' } },
        }),
      });
      setOut(await res.json());
    } catch (err) {
      setOut({ ok: false, error: String(err) });
    } finally {
      setBusy(false);
    }
  }

  const reference = typeof out?.reference === 'string' ? out.reference : null;

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-neutral-500">
            Buyer email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={pay}
          disabled={busy || !email}
          className="btn-primary w-full disabled:opacity-50"
        >
          {busy ? 'Processing…' : 'Simulate successful payment'}
        </button>
      </div>

      {reference && (
        <div className="card border-emerald-500/40 space-y-3">
          <p className="text-sm text-emerald-400">Subscription recorded.</p>
          <p className="text-sm text-neutral-400">
            Your order reference is <code className="font-mono text-neutral-200">{reference}</code> —
            in production Lemon Squeezy emails this on the receipt.
          </p>
          <Link href="/success" className="btn-ghost">
            Continue to claim your API key
          </Link>
        </div>
      )}

      {out && !reference && <pre className="code">{JSON.stringify(out, null, 2)}</pre>}
    </div>
  );
}
