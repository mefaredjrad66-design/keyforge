# KeyForge — launch assets

Everything below is ready to paste. Replace `keyforge.app` with your real domain and
delete any claim you cannot personally stand behind.

Ground rule that matters more than the copy: on Hacker News and Reddit, the fastest way
to kill a launch is to sound like marketing. All copy below is deliberately plain, admits
the product's limits, and leads with the thing developers actually want to know — what the
integration looks like.

---

## 1. Product Hunt

**Name:** KeyForge

**Tagline (60 char max):**
`License keys for indie software in two API calls`

Alternates:
- `Licensing infrastructure for people who ship alone`
- `Issue, validate, and revoke license keys. That's it.`

**Description (260 char max):**
> KeyForge issues license keys, validates them from your app, enforces seat limits, and
> revokes keys after refunds. Two HTTP endpoints, no SDK, no lock-in. Free for your first
> 50 keys, $12/mo after. Built for desktop apps, plugins, and CLIs.

**Topics:** Developer Tools, SaaS, API, Software Engineering

**First comment (post this yourself, immediately):**
> Hi PH 👋
>
> I built KeyForge because I kept writing the same boring code every time I sold software
> directly instead of through an app store: generate a key, email it, check it on launch,
> count how many machines are using it, kill it when someone refunds.
>
> It's two endpoints. `POST /keys` from your payment webhook, `POST /validate` from your
> app. Seat limits are enforced server-side against a device ID you choose. Refunds are one
> DELETE call and the key stops working on next launch.
>
> Three decisions I'd call out:
>
> 1. Invalid keys return HTTP 200 with a `reason` field, not an error status. Your app can
>    tell "revoked" apart from "the user's wifi is down" and decide for itself whether to
>    fail open. Licensing that locks out paying customers on a plane is worse than piracy.
> 2. Keys carry an HMAC check digit, so made-up keys are rejected before they touch the
>    database. Brute force costs the attacker everything and me nothing.
> 3. Only SHA-256 hashes of keys are stored. If my database leaks, nothing in it can be
>    replayed against your app.
>
> What it is not: unbreakable copy protection. Any check running on someone else's computer
> can be patched out, and anyone who tells you otherwise is selling something. This stops
> casual key sharing and makes refunds enforceable, which is where indie revenue actually
> leaks.
>
> There's a playground on the site — mint a real key and burn through its seat limit without
> signing up. Happy to answer anything about the design.

---

## 2. Reddit — r/SideProject

**Title:**
`I got tired of rewriting license key logic for every paid app, so I made it an API`

**Body:**
> Every time I've sold software directly — a Mac app, a Figma plugin, a CLI — I've written
> the same 200 lines: generate a key, store it, check it at startup, stop it working on
> more machines than the customer paid for, kill it after a refund. It's never the
> interesting part and it's always the part that delays the launch.
>
> So I extracted it. KeyForge is two endpoints:
>
> - `POST /api/v1/keys` from your Lemon Squeezy or Stripe webhook → returns a license key
>   you email to the buyer
> - `POST /api/v1/validate` from your app → returns `valid: true/false` plus a reason
>
> Seat limits, expiry dates, SKU tiers, and revocation are included. No SDK to install —
> it's HTTP, so it works from Electron, Tauri, Swift, .NET, Python, or a bash script.
>
> Some things I decided on purpose:
>
> - Failed validation returns 200 with `reason: "seat_limit" | "revoked" | "expired"`, so
>   a network outage never looks like piracy to your app
> - Keys have a built-in checksum, so garbage keys never reach the database
> - Only hashes are stored, never the keys themselves
> - The schema is four Postgres tables and it's published, so you can self-host or migrate
>   out whenever you want
>
> Free tier is 50 keys, which is enough to find out whether anyone will pay for your thing.
> Paid is $12/mo.
>
> There's a playground where you can mint a key and watch the seat limit reject a third
> device, no signup. I'd really like feedback on the validation contract specifically —
> if you ship a paid desktop app, does the fail-open-on-network-error default match what
> you'd want?

**Rules note:** r/SideProject allows links; keep the link at the end and answer every
comment. Do not cross-post the same text to r/Entrepreneur (they'll flag it) — instead
post the variant below in the developer-specific subs where it's genuinely on topic:
r/electronjs, r/tauri, r/swift, r/devtools, r/indiebiz, r/macapps (read each sub's
self-promotion rules first; several require a flair or a comment-only approach).

---

## 3. Hacker News — Show HN

**Title:**
`Show HN: KeyForge – License key issuance and validation as two HTTP endpoints`

**Body (the text field — keep it short, HN prefers the discussion in comments):**
> I sell software directly rather than through app stores, and every product meant
> rewriting the same licensing code: issue a key on payment, validate it on launch, cap
> the number of machines, revoke it on refund. KeyForge is that extracted into two
> endpoints, with the free tier sized so you can ship before paying anything.
>
> Design notes and the reasoning behind them are in my comment below.

**First comment (post immediately after submitting):**
> Author here. The technical decisions worth discussing:
>
> **Failure semantics.** `POST /validate` returns HTTP 200 even when a key is invalid, with
> `{ valid: false, reason: "revoked" }`. Non-2xx is reserved for "the service is broken".
> This matters because the alternative — 403 for an invalid key — makes it impossible for a
> client to distinguish a revoked license from a captive-portal wifi hotspot returning
> garbage. The documented client pattern caches the last successful check and fails open for
> a configurable TTL. I'd rather lose a small amount to sharing than brick a paying
> customer's app offline.
>
> **Key format.** `KF1-XXXX-XXXX-XXXX-XXXX-CCCC` — 80 bits of Crockford base32 (no
> ambiguous I/L/O/U, so it survives being read over the phone) plus a 20-bit HMAC check
> digit. The check digit means fabricated keys are rejected statelessly, so an attacker
> hammering the endpoint doesn't generate database load. Storage is SHA-256 only; a
> database leak yields nothing replayable.
>
> **Seats.** Activation is `(key_id, device_id)` with a unique constraint, and the client
> chooses the device_id. I recommend hashing a machine identifier before sending it, so I
> never receive anything that identifies a machine. Deactivation is exposed so vendors can
> ship a "sign out of this device" button and never field the support email.
>
> **Stack.** Next.js on Vercel's free tier, Postgres on Supabase's free tier, Lemon Squeezy
> as merchant of record so I'm not managing VAT. The data layer has an in-memory
> implementation behind the same interface, which means the whole product — including the
> purchase and webhook flow — runs and passes its smoke tests with zero credentials
> configured. That turned out to be the single best decision for iteration speed.
>
> **What it isn't.** Copy protection. Client-side checks can be patched; obfuscation only
> raises the cost. This is for enforcing seat counts and making refunds actionable.
>
> Open questions I'd genuinely like opinions on: is a 7-day offline grace period the right
> default, and should revocation propagate faster than "next launch" for long-running apps?

**Timing:** submit 7–9am Pacific on a Tuesday, Wednesday, or Thursday. Never ask for
upvotes — HN penalises it and it's detectable. Stay in the thread for the first three hours;
the response rate of the author is the single biggest factor in whether a Show HN survives.

---

## 4. Indie Hackers / X (Twitter) thread

**Hook:**
> Shipped a paid desktop app? You've written this code:
>
> generate key → email key → check key → count machines → kill key after refund
>
> I've written it four times. So I made it an API. Two endpoints, free for 50 keys.

**Follow-ups:**
> The non-obvious part isn't generating keys. It's what your app does when validation
> fails *because the wifi is down*. Get that wrong and you lock out the people who paid.
>
> KeyForge returns 200 + a reason code for invalid keys, so "revoked" and "offline" are
> never confused. Fail-open TTL is your call.

> Keys are stored as SHA-256 hashes. Keys carry an HMAC check digit so fake keys never hit
> the DB. The schema is four Postgres tables and it's public, so you can walk away with your
> data whenever you like.

---

## 5. Direct outreach (highest conversion, lowest volume)

Where your buyers actually are: indie Mac/Windows app developers, Figma and Sketch plugin
authors, Obsidian and Raycast extension developers, JetBrains and VS Code marketplace
sellers, and anyone selling a CLI or SaaS-adjacent binary on Lemon Squeezy or Gumroad.

**Template (personalise the first line or don't send it):**
> Hi [name] — I bought [their product] last month and noticed [specific, true observation
> about their licensing, e.g. "the license email says keys are per-user but there's no
> device limit"].
>
> I built a small API that handles key issuance, seat limits, and revocation so you don't
> have to maintain that yourself: [link]. Free for the first 50 keys, and there's a
> playground with no signup if you want to see the shape of it.
>
> Not trying to sell you anything you don't need — if your current setup works, ignore me.
> If you've been meaning to add device limits, this is about an hour of work.

Send ten of these a week, personally. Ten real conversations with people who already sell
software beat a thousand impressions.

---

## 6. Launch checklist

- [ ] Replace every placeholder in `src/lib/legal.ts` (legal name, support email,
      jurisdiction) — Lemon Squeezy rejects stores with template legal pages
- [ ] Point a real domain at the deployment; set `NEXT_PUBLIC_SITE_URL`
- [ ] `openssl rand -hex 32` → `KEYFORGE_SIGNING_SECRET` in the host's env (never commit it)
- [ ] Run `supabase/schema.sql` in the Supabase SQL editor; confirm RLS is on for all tables
- [ ] Create the two Lemon Squeezy variants ($12 and $29), copy their variant IDs into env
- [ ] Add the webhook (`/api/webhooks/lemonsqueezy`, events: `subscription_created`,
      `subscription_updated`, `subscription_cancelled`, `order_created`) and set the secret
- [ ] Run `BASE=https://your-domain npm run test:api` against production before announcing
- [ ] Buy your own $12 subscription with a real card to confirm the money reaches your
      account, then refund it
- [ ] Confirm the payout account (ACH → virtual checking → card) receives the first payout
      before you promise anyone support
- [ ] Only then: Show HN, Product Hunt, Reddit — on three different days, not all at once
