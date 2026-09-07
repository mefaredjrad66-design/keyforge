# KeyForge

License key issuance, validation, seat limits, and revocation as two HTTP endpoints.
Built to run entirely on free tiers, and to run locally with **zero** credentials.

```
POST /api/v1/keys       # from your payment webhook  -> returns a license key
POST /api/v1/validate   # from your shipped app      -> { valid, reason, seats_used }
POST /api/v1/deactivate # "sign out of this device"
DELETE /api/v1/keys/:id # revoke after a refund
```

## Run it now

```bash
npm install
npm run dev          # http://localhost:3000 — works with no .env at all
npm run test:api     # 25-assertion end-to-end smoke test (second terminal)
```

With no environment variables the app uses an in-memory store and a mock checkout, so the
entire funnel — purchase, webhook, claim, issue, validate, hit the seat limit, revoke — is
testable before you create a single account anywhere. Visit `/playground` to feel it, and
`/checkout/mock?plan=solo` to walk the paid path.

## Going live

1. **Database** — create a Supabase project, run `supabase/schema.sql`, then set
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The app switches from the
   mock store to Postgres automatically; nothing above `src/lib/db.ts` changes.
2. **Signing secret** — `openssl rand -hex 32` into `KEYFORGE_SIGNING_SECRET`. Required in
   production; rotating it invalidates the checksum on existing keys, so set it once.
3. **Payments** — create two Lemon Squeezy variants ($12 Solo, $29 Studio), then set
   `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, both variant IDs, and
   `LEMONSQUEEZY_WEBHOOK_SECRET`. Webhook URL: `/api/webhooks/lemonsqueezy`.
4. **Legal** — replace the placeholders in `src/lib/legal.ts`. Lemon Squeezy and Stripe
   both reject stores whose privacy and terms pages still contain template text.
5. **Deploy** — `vercel` (or Cloudflare Pages). Set the same env vars in the dashboard.
   Then run `BASE=https://your-domain npm run test:api` against production.

Copy `.env.example` to `.env.local` for local overrides. `.env.local` is gitignored; never
commit real keys.

## How it fits together

```
src/lib/keys.ts     key generation, HMAC checksum, hashing        (~90 LOC)
src/lib/db.ts       one interface, two backends: Supabase | mock
src/lib/http.ts     auth guards, JSON helpers
src/lib/plans.ts    plan → quota → Lemon Squeezy variant mapping
src/app/api/v1/*    the public API
src/app/api/*       checkout, webhook, claim, demo
supabase/schema.sql four tables, RLS on, no public policies
```

Security posture: license keys and API keys are stored as SHA-256 hashes only. Keys carry
an HMAC check digit so fabricated keys are rejected without a database read. All Supabase
access uses the service role key server-side, and every table has RLS enabled with no
public policy, so nothing is readable from a browser. The webhook verifies Lemon Squeezy's
`X-Signature` HMAC and refuses unsigned events in production; unsigned mock events are
accepted only when `NODE_ENV !== 'production'`.

## Design decision worth knowing about

`/api/v1/validate` returns **HTTP 200 even for invalid keys**, with a machine-readable
`reason` (`malformed`, `not_found`, `revoked`, `expired`, `seat_limit`). Non-2xx means the
service itself failed. This lets client code distinguish "this license is dead" from "the
user is offline" and fail open on its own terms — see the caching pattern in `/docs`.

## Honest limits

Any licensing check that runs on a user's machine can be patched out. KeyForge is built to
stop casual key sharing and to make refunds and chargebacks enforceable, not to provide
unbreakable copy protection. Say the same to your own customers.
