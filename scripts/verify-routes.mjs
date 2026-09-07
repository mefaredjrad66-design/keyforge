/**
 * Headless regression suite. Runs the real route handlers in-process (no server,
 * no npm install of extra deps) with the mock store, so behaviour can be verified
 * before `next build` ever runs.
 *
 *   node scripts/verify-routes.mjs
 *
 * It mirrors src/ into a temp dir, rewriting the `@/lib/*` alias and adding the
 * explicit .ts extensions Node's type-stripping loader requires.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(tmpdir(), 'keyforge-verify');

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
cpSync(join(root, 'src'), join(work, 'src'), { recursive: true });
if (!existsSync(join(work, 'node_modules'))) {
  symlinkSync(join(root, 'node_modules'), join(work, 'node_modules'), 'dir');
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(entry)) {
      const libDir = join(work, 'src', 'lib');
      let code = readFileSync(p, 'utf8');
      code = code.replace(/from '@\/lib\/([a-z]+)'/g, (_m, name) => {
        let rel = relative(dirname(p), join(libDir, `${name}.ts`)).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = `./${rel}`;
        return `from '${rel}'`;
      });
      code = code.replace(/from '(\.\.?\/[a-z-]+)'/g, "from '$1.ts'");
      writeFileSync(p, code);
    }
  }
}
walk(join(work, 'src'));

const suite = String.raw`
import assert from 'node:assert/strict';
const S = ${JSON.stringify(join(work, 'src').replace(/\\/g, '/'))};

let pass = 0;
const fails = [];
async function it(name, fn) {
  try { await fn(); pass++; console.log('ok    ' + name); }
  catch (e) { fails.push(name); console.log('FAIL  ' + name + ' -> ' + e.message); }
}
const j = async (res) => (await res).json();
const post = (url, body, headers = {}) =>
  new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

const apps = await import(S + '/app/api/v1/apps/route.ts');
const keysR = await import(S + '/app/api/v1/keys/route.ts');
const validate = await import(S + '/app/api/v1/validate/route.ts');
const deactivate = await import(S + '/app/api/v1/deactivate/route.ts');
const checkout = await import(S + '/app/api/checkout/route.ts');
const webhook = await import(S + '/app/api/webhooks/lemonsqueezy/route.ts');

// --- provisioning + core licensing path -------------------------------------
const created = await j(apps.POST(post('http://x/api/v1/apps', { name: 'Acme', owner_email: 'dev@acme.test', plan: 'solo' })));
const API = created.api_key;
await it('app provisioning returns an api key', () => assert.match(API, /^kf_live_[0-9a-f]{48}$/));

const auth = { authorization: 'Bearer ' + API };
const issued = await j(keysR.POST(post('http://x/api/v1/keys', { seat_limit: 2 }, auth)));
const KEY = issued.license_key;
await it('issued key matches the KF1 format', () => assert.match(KEY, /^KF1(-[0-9A-Z]{4}){5}$/));

await it('valid key on first device', async () => {
  const r = await j(validate.POST(post('http://x/api/v1/validate', { key: KEY, device_id: 'dev-1' })));
  assert.equal(r.valid, true);
});
await it('re-activation of the same device is idempotent', async () => {
  const r = await j(validate.POST(post('http://x/api/v1/validate', { key: KEY, device_id: 'dev-1' })));
  assert.equal(r.valid, true);
  assert.equal(r.seats_used, 1);
});
await it('second seat allowed', async () => {
  const r = await j(validate.POST(post('http://x/api/v1/validate', { key: KEY, device_id: 'dev-2' })));
  assert.equal(r.valid, true);
});
await it('third device hits seat_limit with HTTP 200', async () => {
  const res = await validate.POST(post('http://x/api/v1/validate', { key: KEY, device_id: 'dev-3' }));
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'seat_limit');
});
await it('deactivate frees a seat', async () => {
  await deactivate.POST(post('http://x/api/v1/deactivate', { key: KEY, device_id: 'dev-2' }, auth));
  const r = await j(validate.POST(post('http://x/api/v1/validate', { key: KEY, device_id: 'dev-3' })));
  assert.equal(r.valid, true);
});
await it('tampered key is rejected as malformed without a DB read', async () => {
  const bad = KEY.slice(0, -1) + (KEY.slice(-1) === 'Z' ? 'Y' : 'Z');
  const r = await j(validate.POST(post('http://x/api/v1/validate', { key: bad, device_id: 'd' })));
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'malformed');
});
await it('privileged key issuance requires a bearer token', async () => {
  const res = await keysR.POST(post('http://x/api/v1/keys', { seats: 1 }));
  assert.equal(res.status, 401);
});

// --- the paths that consume siteUrl() ---------------------------------------
await it('checkout redirects to an absolute, parseable URL when Lemon Squeezy is unconfigured', async () => {
  const res = await checkout.GET(new Request('http://x/api/checkout?plan=solo'));
  assert.equal(res.status, 303);
  const loc = res.headers.get('location');
  assert.doesNotThrow(() => new URL(loc));
  assert.match(loc, /\/checkout\/mock\?plan=solo$/);
});
await it('mock webhook returns an absolute claim_url', async () => {
  const body = { meta: { event_name: 'subscription_created' }, data: { id: 'sub_1', attributes: { user_email: 'buyer@acme.test', status: 'active', variant_id: '1', order_number: 12 } } };
  const r = await j(webhook.POST(post('http://x/api/webhooks/lemonsqueezy', body, { 'x-keyforge-mock': '1' })));
  assert.doesNotThrow(() => new URL(r.claim_url));
  assert.equal(r.order_ref, '12');
});

// --- claim flow: buyers quote the order number from the receipt, not the sub ID ---
const claim = await import(S + '/app/api/claim/route.ts');

await it('claim without a reference is refused for a paid subscriber', async () => {
  const res = await claim.POST(post('http://x/api/claim', { email: 'buyer@acme.test' }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).needs_reference, true);
});
await it('claim rejects a wrong reference', async () => {
  const res = await claim.POST(post('http://x/api/claim', { email: 'buyer@acme.test', reference: '999' }));
  assert.equal(res.status, 403);
});
await it('claim accepts the order number as printed on the receipt (#12)', async () => {
  const r = await j(claim.POST(post('http://x/api/claim', { email: 'buyer@acme.test', reference: ' #12 ', app_name: 'Buyer App' })));
  assert.equal(r.ok, true);
  assert.match(r.api_key, /^kf_live_[0-9a-f]{48}$/);
});
await it('claim also accepts the subscription id, and rotates the key', async () => {
  const r = await j(claim.POST(post('http://x/api/claim', { email: 'buyer@acme.test', reference: 'sub_1' })));
  assert.equal(r.rotated, true);
  assert.match(r.api_key, /^kf_live_[0-9a-f]{48}$/);
});
await it('free tier claim works with no reference, once', async () => {
  const first = await j(claim.POST(post('http://x/api/claim', { email: 'free@acme.test' })));
  assert.equal(first.plan, 'free');
  const second = await claim.POST(post('http://x/api/claim', { email: 'free@acme.test' }));
  assert.equal(second.status, 409);
});

console.log('\n' + pass + ' passed / ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
`;

writeFileSync(join(work, 'suite.mjs'), suite);
try {
  execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', join(work, 'suite.mjs')], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: '' },
    cwd: work,
  });
} catch {
  process.exit(1);
}
