import Link from 'next/link';

const snippet = `// 1. In your Lemon Squeezy / Stripe webhook — mint a key on payment
const res = await fetch("https://keyforge.app/api/v1/keys", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.KEYFORGE_API_KEY}\` },
  body: JSON.stringify({ email: buyer.email, sku: "pro", seat_limit: 3 })
});
const { license_key } = await res.json();   // KF1-8Q2M-...-7YTR  -> email it

// 2. In your shipped app — validate on launch
const check = await fetch("https://keyforge.app/api/v1/validate", {
  method: "POST",
  body: JSON.stringify({ license_key, device_id: machineId })
}).then(r => r.json());

if (!check.valid) showPaywall(check.reason);  // revoked | expired | seat_limit`;

const features: [string, string][] = [
  [
    'Seat limits that actually hold',
    'Each install registers a device_id. Hit the limit and activation is refused — no honour system, no extra code on your side.',
  ],
  [
    'Instant revocation',
    'Refund or chargeback? One DELETE call and the key stops validating everywhere on next launch.',
  ],
  [
    'Offline-friendly by design',
    'Invalid keys return HTTP 200 with a reason, so your app can tell "pirated" apart from "wifi is down" and fail open on your terms.',
  ],
  [
    'Checksum-guarded keys',
    'Keys carry an HMAC check digit. Made-up keys are rejected before they ever touch the database, so brute force costs an attacker everything and you nothing.',
  ],
  [
    'Hash-only storage',
    'We store SHA-256 hashes, never the key itself. A database leak yields nothing replayable.',
  ],
  [
    'No SDK, no lock-in',
    'Two HTTP endpoints. Works from Electron, Tauri, Swift, .NET, Python, a Figma plugin, or a bash script.',
  ],
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      <section className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
          Licensing infrastructure for people who ship alone
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Stop writing your own license key server.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-neutral-400">
          You built a desktop app, a plugin, or a CLI, and you sell it for real money. The last
          thing standing between you and a launch is the boring part: issuing keys, counting seats,
          and killing keys after a refund. KeyForge is two endpoints that do exactly that — and
          nothing else.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/playground" className="btn-primary">
            Mint a real key in 10 seconds
          </Link>
          <Link href="/docs" className="btn-ghost">
            Read the docs
          </Link>
        </div>
        <p className="text-sm text-neutral-500">
          No signup for the playground. Free tier covers your first 50 keys.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          The whole integration
        </h2>
        <pre className="code">{snippet}</pre>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {features.map(([title, body]) => (
          <div key={title} className="card">
            <h3 className="mb-2 font-medium text-white">{title}</h3>
            <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Pricing</h2>
          <p className="text-neutral-400">
            Priced below the cost of the weekend you would spend building this yourself.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="card">
            <h3 className="font-medium text-white">Free</h3>
            <p className="mt-1 text-3xl font-semibold text-white">$0</p>
            <p className="mt-3 text-sm text-neutral-400">
              1 app, 50 license keys, full API. Enough to validate that people will pay for your
              thing.
            </p>
            <Link href="/playground" className="btn-ghost mt-5 w-full">
              Start free
            </Link>
          </div>

          <div className="card border-emerald-500/40">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Solo</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                Most popular
              </span>
            </div>
            <p className="mt-1 text-3xl font-semibold text-white">
              $12<span className="text-base font-normal text-neutral-500">/mo</span>
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              1 app, 500 keys, seat limits, revocation, email support. For a product that is
              already selling.
            </p>
            <a href="/api/checkout?plan=solo" className="btn-primary mt-5 w-full">
              Get Solo
            </a>
          </div>

          <div className="card">
            <h3 className="font-medium text-white">Studio</h3>
            <p className="mt-1 text-3xl font-semibold text-white">
              $29<span className="text-base font-normal text-neutral-500">/mo</span>
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              Unlimited apps, 10,000 keys, custom expiry and SKUs. For a small catalogue of paid
              tools.
            </p>
            <a href="/api/checkout?plan=studio" className="btn-ghost mt-5 w-full">
              Get Studio
            </a>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Billed in USD via Lemon Squeezy (merchant of record — they handle VAT and sales tax).
          Cancel anytime; keys you already issued keep validating for the rest of the billing
          period.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-white">Honest answers</h2>
        <dl className="space-y-4 text-sm leading-relaxed">
          <div>
            <dt className="text-neutral-200">Can this be cracked?</dt>
            <dd className="text-neutral-400">
              Any client-side check can be patched out by a determined attacker — that is true of
              every licensing product, including the expensive ones. KeyForge is built to stop
              casual key sharing and to make refunds enforceable, which is where indie revenue
              actually leaks.
            </dd>
          </div>
          <div>
            <dt className="text-neutral-200">What if KeyForge disappears?</dt>
            <dd className="text-neutral-400">
              Your keys are yours. The API returns everything you need to export, and the schema is
              four Postgres tables you can self-host.
            </dd>
          </div>
          <div>
            <dt className="text-neutral-200">Do you see my customers&apos; data?</dt>
            <dd className="text-neutral-400">
              Only what you send: an optional buyer email and an opaque device identifier. Send a
              hashed device ID and we never learn anything about the machine.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
