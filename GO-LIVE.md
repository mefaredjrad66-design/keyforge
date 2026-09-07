# Going live — KeyForge, step by step

Do these in order. Each step ends with something you can check, so you never build on a broken step.
Env-var reference lives in `DEPLOY.md`; launch copy lives in `LAUNCH.md`.

---

## Step 0 — Confirm Lemon Squeezy will accept you as a seller (do this first, ~10 min)

This is the only step that can fail for a reason code cannot fix, so find out before you invest a week in marketing.

1. Go to lemonsqueezy.com and start a seller signup. Lemon Squeezy is now part of Stripe, so the onboarding may route you through Stripe's identity/payout flow — the country requirement applies either way.
2. During store setup you must choose the **country of the business/individual selling**. Look for **Algeria** in that list, and check the help-centre page for supported countries plus the restricted-countries section of their acceptable-use policy.
3. Write down the answer before continuing.

**If Algeria is not supported**, do not register with a US address and route payouts to a virtual US checking account. Identity verification happens at or before the first payout, which is *after* you already have paying customers — the account gets frozen at the worst possible moment, and the customers are yours to refund. Realistic alternatives at $0:

| Option | Reality check |
| --- | --- |
| NOWPayments / crypto (USDT) | No seller-country restriction, settles to your Kast card. Not built yet — ask me and I will add `/api/checkout/crypto` plus the IPN handler; roughly the same shape as the Lemon Squeezy route. |
| Gumroad / Paddle | Check their seller-country lists the same way. Both are merchant-of-record like Lemon Squeezy, so the code change is small, but the country question repeats. |
| Company registered abroad | Works, but costs real money and paperwork — not a $0 path. |

Steps 1–5 are unaffected by this answer. The product runs and can serve free-tier users while payments are unresolved.

---

## Step 1 — Push the code

```bash
cd path/to/keyforge
git log --oneline -3      # you should see the CSS-types and site-URL fixes on top
git push
```

Then open Vercel → your `keyforge` project → **Deployments**. Wait for the build to go green. If it goes red, copy the error text — the two failure modes we already fixed were a missing `target` in `tsconfig.json` and `new URL('')` from a blank env var.

---

## Step 2 — Create the database (without this, every key you issue disappears)

With no Supabase credentials the app silently falls back to an in-memory store. That is deliberate for local testing, and fatal in production: serverless instances recycle and take your customers' license keys with them.

1. supabase.com → **New project** (free tier). Pick the region closest to your customers. Save the database password.
2. **SQL Editor** → paste the entire contents of `supabase/schema.sql` → **Run**. You should get "Success. No rows returned". This creates `apps`, `license_keys`, `activations`, `subscriptions`, the indexes, and enables row-level security with no public policies.
3. **Settings → API** → copy the **Project URL** and the **`service_role`** key. The `service_role` key bypasses RLS, so it is server-side only — never put it in a `NEXT_PUBLIC_*` variable.

If you had already run an older copy of the schema, add the new column:

```sql
alter table subscriptions add column if not exists order_ref text;
```

---

## Step 3 — Generate your two secrets

Run this twice and keep both values in a password manager:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- First value → `KEYFORGE_SIGNING_SECRET`. Every license key's check digit is an HMAC of this secret. **Never rotate it after you sell your first key** — rotation makes every existing key fail its checksum and look counterfeit.
- Second value → `ADMIN_TOKEN`. Guards `POST /api/v1/apps`.

---

## Step 4 — Set the environment variables on Vercel, then redeploy

Vercel → Settings → **Environment Variables**. Add each one to **Production** (and Preview if you want previews to work):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key from step 2 |
| `KEYFORGE_SIGNING_SECRET` | first value from step 3 |
| `ADMIN_TOKEN` | second value from step 3 |
| `NEXT_PUBLIC_SITE_URL` | **either delete this variable entirely, or set it to your real origin** (`https://keyforge-xxxx.vercel.app`). Never leave it present-but-blank — that is what broke the first three builds. |

Environment changes do not apply to an existing build. Go to **Deployments → ⋯ → Redeploy** on the newest deployment.

---

## Step 5 — Smoke-test the live API (~5 min)

```bash
BASE=https://your-app.vercel.app
ADMIN=your_admin_token

# 1. register your first app (returns an api_key, shown once)
curl -s -X POST $BASE/api/v1/apps \
  -H "Authorization: Bearer $ADMIN" -H 'content-type: application/json' \
  -d '{"name":"Test App","owner_email":"mefaredjrad66@gmail.com"}'

API=kf_live_...   # paste the api_key from above

# 2. mint a license key with 1 seat
curl -s -X POST $BASE/api/v1/keys \
  -H "Authorization: Bearer $API" -H 'content-type: application/json' \
  -d '{"seat_limit":1,"email":"customer@example.com"}'

KEY=KF1-...

# 3. validate it (expect valid:true)
curl -s -X POST $BASE/api/v1/validate -H 'content-type: application/json' \
  -d "{\"license_key\":\"$KEY\",\"device_id\":\"laptop-1\"}"

# 4. a second device must be refused with HTTP 200 + reason seat_limit
curl -s -X POST $BASE/api/v1/validate -H 'content-type: application/json' \
  -d "{\"license_key\":\"$KEY\",\"device_id\":\"laptop-2\"}"
```

Or run the whole flow at once: `BASE=https://your-app.vercel.app node scripts/smoke.mjs`.

Then open in a browser: `/`, `/docs`, `/playground`, `/privacy`, `/terms`, `/refunds`. The three legal pages must render with your real name and support email — payment providers reject stores with template contact details.

---

## Step 6 — Complete the Lemon Squeezy account

1. **Store settings** — store name, slug, support email (`mefaredjrad66@gmail.com`), logo. The support email is public and must be one you actually read.
2. **Business / identity verification** — legal name, address, and an ID document. Lemon Squeezy is the **merchant of record**, which means they collect and remit VAT and sales tax for you; you do not register for tax anywhere on their behalf. Your own local income-tax obligation is separate and still yours.
3. **Payout method** — add your bank details, then read the payout schedule and minimum threshold shown in the dashboard so you know when the first payment actually arrives.
4. **Create the two paid products**, both as subscriptions:
   - "KeyForge Solo" — $12 / month
   - "KeyForge Studio" — $29 / month
   Open each product's **variant** and copy its numeric **variant ID** (it appears in the variant's URL). The free tier is not a product — it is handled entirely in the app.
5. **API key** — Settings → API → create a key → `LEMONSQUEEZY_API_KEY`.
6. **Store ID** — the numeric ID of your store (Settings → Stores) → `LEMONSQUEEZY_STORE_ID`.
7. **Webhook** — Settings → Webhooks → add:
   - URL: `https://your-app.vercel.app/api/webhooks/lemonsqueezy`
   - Signing secret: create one → `LEMONSQUEEZY_WEBHOOK_SECRET`
   - Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_resumed`
8. **Add the five Lemon Squeezy variables to Vercel** (`LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_ID_SOLO`, `LEMONSQUEEZY_VARIANT_ID_STUDIO`, `LEMONSQUEEZY_WEBHOOK_SECRET`) and redeploy. Until `LEMONSQUEEZY_API_KEY` exists, `/api/checkout` deliberately redirects to the built-in mock checkout.
9. **Test-mode purchase.** Turn on test mode in Lemon Squeezy and buy Solo with the test card it shows (`4242 4242 4242 4242`, any future expiry, any CVC). Then verify all four of these:
   - Lemon Squeezy → Webhooks → the delivery shows **200**
   - Supabase → `subscriptions` has a row with your email, `plan = solo`, `status = active`
   - `/success` → entering that email plus the **order number from the receipt email** returns an API key (the claim route accepts either the order number or the subscription ID, with or without a `#`)
   - claiming a second time reports the key was rotated, and the old key stops working
10. **Go live.** Turn test mode off, submit the store for review if Lemon Squeezy asks, then make one real $12 purchase with your own card and refund it. That is the only way to prove the live path — test mode does not exercise real card processing or your payout setup.

---

## Step 7 — Domain (optional, still $0)

The free `*.vercel.app` domain is fine for launch. If you add a custom domain later: Vercel → Domains → add it, set `NEXT_PUBLIC_SITE_URL` to the new origin, redeploy, then update the Lemon Squeezy webhook URL. Redirect URLs are derived from `siteUrl()`, so nothing else needs editing.

---

## Step 8 — After launch

`LAUNCH.md` has the Product Hunt, Hacker News, Reddit and X copy. Post only after step 6.9 passes — a broken checkout on launch day costs you the whole audience.

Watch three things weekly: Vercel function logs for 5xx, the Lemon Squeezy webhook delivery list for failures, and the Supabase `subscriptions` / `license_keys` row counts. Never rotate `KEYFORGE_SIGNING_SECRET`, never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, and never delete a `subscriptions` row — buyers claim their key against it.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails, `ERR_INVALID_URL` | An env var holds a value that is not a URL | Already hardened in `siteUrl()`; check `NEXT_PUBLIC_SITE_URL` is a full origin or absent |
| Keys work, then stop existing | Supabase vars missing → in-memory store | Steps 2 and 4 |
| Every API call 500s in production | `KEYFORGE_SIGNING_SECRET` not set | Step 3 and 4 |
| Webhook deliveries show 401 | Secret mismatch, or secret missing in production | Re-copy `LEMONSQUEEZY_WEBHOOK_SECRET` exactly, redeploy |
| Buyer says "reference does not match" | They paid with a different email than the one they typed | Look up their row in `subscriptions` and tell them which email to use |
| Every license key suddenly invalid | Signing secret was rotated | Restore the old secret from your password manager |
