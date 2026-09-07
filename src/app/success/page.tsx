'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SuccessPage() {
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [appName, setAppName] = useState('My app');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, reference: reference || undefined, app_name: appName }),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setBusy(false);
    }
  }

  const apiKey = typeof result?.api_key === 'string' ? result.api_key : null;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Claim your API key</h1>
        <p className="text-neutral-400">
          Enter the email you paid with, plus the order reference from your receipt. Free tier: just
          the email.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-neutral-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-neutral-500">
            App name
          </label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-neutral-500">
            Order reference <span className="normal-case text-neutral-600">(paid plans)</span>
          </label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="from your Lemon Squeezy receipt"
            className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2.5 font-mono text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={claim}
          disabled={busy || !email}
          className="btn-primary w-full disabled:opacity-50"
        >
          {busy ? 'Claiming…' : 'Claim API key'}
        </button>
      </div>

      {apiKey && (
        <div className="card border-emerald-500/40 space-y-3">
          <p className="text-sm text-emerald-400">
            Copy this now — it is never shown again.
          </p>
          <pre className="code select-all">{apiKey}</pre>
          <p className="text-sm text-neutral-400">
            Next: put it in your payment webhook as{' '}
            <code className="font-mono">KEYFORGE_API_KEY</code> and follow the{' '}
            <Link href="/docs" className="text-emerald-400 hover:underline">
              two-endpoint guide
            </Link>
            .
          </p>
        </div>
      )}

      {result && !apiKey && <pre className="code">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
