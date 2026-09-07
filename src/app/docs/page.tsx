import type { ReactNode } from 'react';

const curlIssue = `curl -X POST https://keyforge.app/api/v1/keys \\
  -H "Authorization: Bearer $KEYFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"buyer@example.com","sku":"pro","seat_limit":3,"expires_in_days":365}'

# -> { "ok": true, "license_key": "KF1-8Q2M-4KTX-9WRB-2N7D-7YTR", "id": "..." }`;

const curlValidate = `curl -X POST https://keyforge.app/api/v1/validate \\
  -H "Content-Type: application/json" \\
  -d '{"license_key":"KF1-8Q2M-4KTX-9WRB-2N7D-7YTR","device_id":"a91f...","hostname":"studio-mbp"}'

# -> { "ok": true, "valid": true, "sku": "pro", "seats_used": 1, "seat_limit": 3 }
# -> { "ok": true, "valid": false, "reason": "seat_limit", "seats_used": 3 }`;

const clientPattern = `// Recommended client pattern: cache the last good check, fail open briefly.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // tolerate a week offline

async function checkLicense(key, deviceId, cache) {
  try {
    const r = await fetch("https://keyforge.app/api/v1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key, device_id: deviceId }),
    }).then((r) => r.json());

    cache.set({ valid: r.valid, reason: r.reason, at: Date.now() });
    return r.valid;
  } catch {
    // Network down: trust the last successful check inside the TTL.
    const last = cache.get();
    return Boolean(last?.valid && Date.now() - last.at < CACHE_TTL_MS);
  }
}`;

const deviceId = `// Pick a device_id that is stable but not personally identifying.
// Hash a machine identifier so KeyForge never receives the raw value.
import { createHash } from "crypto";
import { machineIdSync } from "node-machine-id";

const deviceId = createHash("sha256").update(machineIdSync()).digest("hex").slice(0, 32);`;
function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Docs</h1>
        <p className="max-w-2xl text-neutral-400">
          Two endpoints matter. Everything else is housekeeping.
        </p>
      </div>

      <Section title="1. Issue a key (server-side)">
        <p className="text-sm leading-relaxed text-neutral-400">
          Call this from your payment webhook. Requires your secret API key — never ship it inside
          your app.
        </p>
        <pre className="code">{curlIssue}</pre>
        <p className="text-sm text-neutral-500">
          Optional fields: <code className="font-mono">sku</code> (tier name),{' '}
          <code className="font-mono">seat_limit</code> (default 1),{' '}
          <code className="font-mono">expires_in_days</code> (omit for perpetual),{' '}
          <code className="font-mono">order_ref</code> (your invoice ID).
        </p>
      </Section>

      <Section title="2. Validate a key (from your app)">
        <p className="text-sm leading-relaxed text-neutral-400">
          No API key needed, because this runs on your customer&apos;s machine. Invalid keys return
          HTTP 200 with a <code className="font-mono">reason</code>, so a network failure is never
          mistaken for piracy.
        </p>
        <pre className="code">{curlValidate}</pre>
        <p className="text-sm text-neutral-500">
          Reasons: <code className="font-mono">malformed</code>,{' '}
          <code className="font-mono">not_found</code>, <code className="font-mono">revoked</code>,{' '}
          <code className="font-mono">expired</code>, <code className="font-mono">seat_limit</code>.
        </p>
      </Section>

      <Section title="3. Free a seat">
        <pre className="code">{`POST /api/v1/deactivate
{ "license_key": "KF1-...", "device_id": "a91f..." }`}</pre>
        <p className="text-sm text-neutral-500">
          Wire this to a &ldquo;Sign out of this device&rdquo; button so support requests never
          reach you.
        </p>
      </Section>

      <Section title="4. Revoke after a refund">
        <pre className="code">{`DELETE /api/v1/keys/{id}
Authorization: Bearer $KEYFORGE_API_KEY`}</pre>
      </Section>

      <Section title="Choosing a device_id">
        <pre className="code">{deviceId}</pre>
      </Section>

      <Section title="Handling offline users">
        <pre className="code">{clientPattern}</pre>
      </Section>

      <Section title="Self-hosting">
        <p className="text-sm leading-relaxed text-neutral-400">
          The data model is four Postgres tables in{' '}
          <code className="font-mono">supabase/schema.sql</code>. Point{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> at your own project, deploy to
          any Node host, and you own the whole stack.
        </p>
      </Section>
    </div>
  );
}
