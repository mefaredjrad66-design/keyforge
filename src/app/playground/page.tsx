'use client';

import { useState } from 'react';

type Result = Record<string, unknown> | null;

export default function PlaygroundPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [deviceId, setDeviceId] = useState('device-a');
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState<'mint' | 'validate' | 'deactivate' | null>(null);

  async function call(
    kind: 'mint' | 'validate' | 'deactivate',
    url: string,
    body?: Record<string, unknown>,
  ) {
    setBusy(kind);
    setResult(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      setResult(data);
      if (kind === 'mint' && typeof data.license_key === 'string') setLicenseKey(data.license_key);
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setBusy(null);
    }
  }

  const valid = result && result.valid === true;
  const invalid = result && result.valid === false;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Playground</h1>
        <p className="max-w-2xl text-neutral-400">
          These buttons hit the same endpoints your app would. Mint a key, validate it twice with
          different device IDs, then try a third — you will get{' '}
          <code className="font-mono text-emerald-400">seat_limit</code> back, because the demo key
          allows 2 seats.
        </p>
      </div>

      <div className="card space-y-5">
        <button
          type="button"
          onClick={() => call('mint', '/api/demo')}
          disabled={busy !== null}
          className="btn-primary disabled:opacity-50"
        >
          {busy === 'mint' ? 'Minting…' : '1. Mint a demo license key'}
        </button>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-neutral-500">
            License key
          </label>
          <input
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="KF1-XXXX-XXXX-XXXX-XXXX-CCCC"
            className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2.5 font-mono text-sm text-emerald-300 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-neutral-500">
            Device ID
          </label>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-black/50 px-3 py-2.5 font-mono text-sm text-neutral-200 outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-neutral-500">
            Change this to <code className="font-mono">device-b</code>,{' '}
            <code className="font-mono">device-c</code>… to simulate new machines.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              call('validate', '/api/v1/validate', {
                license_key: licenseKey,
                device_id: deviceId,
              })
            }
            disabled={busy !== null || !licenseKey}
            className="btn-primary disabled:opacity-50"
          >
            {busy === 'validate' ? 'Checking…' : '2. Validate'}
          </button>
          <button
            type="button"
            onClick={() =>
              call('deactivate', '/api/v1/deactivate', {
                license_key: licenseKey,
                device_id: deviceId,
              })
            }
            disabled={busy !== null || !licenseKey}
            className="btn-ghost disabled:opacity-50"
          >
            3. Free this seat
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={
                valid
                  ? 'text-emerald-400'
                  : invalid
                    ? 'text-amber-400'
                    : result.ok === false
                      ? 'text-red-400'
                      : 'text-neutral-400'
              }
            >
              {valid
                ? '● valid'
                : invalid
                  ? `● invalid — ${String(result.reason)}`
                  : result.ok === false
                    ? '● error'
                    : '● response'}
            </span>
          </div>
          <pre className="code">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
