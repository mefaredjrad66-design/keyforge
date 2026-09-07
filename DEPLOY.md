# Deploying KeyForge to Vercel

## Why the first three builds failed

`src/app/layout.tsx` sets `metadataBase: new URL(site)`. `site` came from
`process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`, and `??` only replaces
`null`/`undefined` — **not an empty string**. A Vercel environment variable that exists
with a blank value therefore produced `new URL('')`, which throws `ERR_INVALID_URL` while
Next prerenders `/_not-found`, and the build exits 1.

Fixed by routing every origin lookup through one hardened helper, `siteUrl()` in
`src/lib/plans.ts`. It trims the value, treats blank/whitespace/unparseable as unset,
adds `https://` when a scheme is missing, strips paths and trailing slashes down to the
origin, and falls back to `NEXT_PUBLIC_VERCEL_URL` → `VERCEL_URL` → `http://localhost:3000`.
`new URL(siteUrl())` can no longer throw, so a misconfigured env var can never break a build again.

Verify locally before pushing:

```bash
npm run typecheck   # tsc --noEmit
npm run verify      # 12 URL edge cases + 11 route assertions, no server needed
npm run build
```

## Environment variables to set on Vercel

Project → Settings → Environment Variables. Delete any variable you are not using —
do not leave it present with an empty value.

**Required for production**

| Variable | Value | Notes |
| --- | --- | --- |
| `KEYFORGE_SIGNING_SECRET` | 64 hex chars | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Never rotate it after selling keys** — every issued key's checksum is derived from it and rotation invalidates all of them. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Without this the app silently uses the in-memory store and every key you issue disappears when the serverless instance recycles. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | Server-side only. Never expose it to the browser. |
| `ADMIN_TOKEN` | any long random string | Guards `POST /api/v1/apps`. Without it that route is open in development and closed in production. |

**Optional**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, e.g. `https://keyforge.app`. Leave it unset and Vercel's own `VERCEL_URL` is used. |
| `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_ID_SOLO`, `LEMONSQUEEZY_VARIANT_ID_STUDIO` | Real checkout. Missing → `/api/checkout` redirects to the built-in mock checkout. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Verifies the `X-Signature` HMAC on webhooks. Missing in production → all webhook calls are rejected. |

## Order of operations

1. Run `supabase/schema.sql` in the Supabase SQL editor (creates four tables, indexes, RLS on).
2. Set the four required variables on Vercel for the Production environment.
3. Redeploy. Confirm `GET /api/v1/validate` style calls work via `/playground`.
4. Create the app record once: `POST /api/v1/apps` with `Authorization: Bearer $ADMIN_TOKEN`.
5. Only then point Lemon Squeezy's webhook at `https://<your-domain>/api/webhooks/lemonsqueezy`.
