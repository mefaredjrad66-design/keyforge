#!/usr/bin/env node
/**
 * End-to-end smoke test. Run `npm run dev` in one terminal, then `npm run test:api`.
 * Works with zero environment variables (mock store + mock checkout).
 *   BASE=https://your-deploy.vercel.app node scripts/smoke.mjs   // also works live
 */

const BASE = process.env.BASE ?? 'http://localhost:3000';

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, data };
}

const validate = (license_key, device_id) => post('/api/v1/validate', { license_key, device_id });

async function main() {
  console.log(`\nKeyForge smoke test against ${BASE}\n`);

  console.log('demo key + seat limits');
  const demo = await post('/api/demo');
  const key = demo.data.license_key;
  check('demo mints a key', typeof key === 'string' && key.startsWith('KF1-'), demo.data);
  check('demo key allows 2 seats', demo.data.seat_limit === 2, demo.data);
  if (!key) throw new Error('cannot continue without a demo key');

  check('seat 1 validates', (await validate(key, 'device-a')).data.valid === true);
  check('seat 2 validates', (await validate(key, 'device-b')).data.valid === true);
  check('same device is idempotent', (await validate(key, 'device-a')).data.valid === true);

  const third = await validate(key, 'device-c');
  check('third seat is refused', third.data.valid === false, third.data);
  check('refusal reason is seat_limit', third.data.reason === 'seat_limit', third.data);
  check('refusal still returns HTTP 200', third.status === 200, third.status);

  console.log('\ndeactivation frees a seat');
  const freed = await post('/api/v1/deactivate', { license_key: key, device_id: 'device-a' });
  check('deactivate succeeds', freed.data.ok === true, freed.data);
  check('freed seat is reusable', (await validate(key, 'device-c')).data.valid === true);

  console.log('\ntampered + unknown keys');
  const tampered = key.slice(0, -1) + (key.endsWith('Z') ? 'Y' : 'Z');
  const bad = await validate(tampered, 'device-x');
  check('checksum rejects tampered key', bad.data.valid === false, bad.data);
  check('reason is malformed', bad.data.reason === 'malformed', bad.data);
  const junk = await validate('KF1-0000-0000-0000-0000-0000', 'device-x');
  check('junk key is invalid', junk.data.valid === false, junk.data);

  console.log('\nauth is enforced');
  const noAuth = await post('/api/v1/keys', { email: 'x@example.com' });
  check('issuing without API key is 401', noAuth.status === 401, noAuth);
  const badAuth = await post('/api/v1/keys', {}, { authorization: 'Bearer kf_live_nope' });
  check('issuing with bad API key is 401', badAuth.status === 401, badAuth);

  console.log('\npurchase -> claim -> issue');
  const email = `dev+${Date.now()}@example.com`;
  const reference = `mock_${Math.random().toString(36).slice(2, 10)}`;
  const hook = await post(
    '/api/webhooks/lemonsqueezy',
    {
      meta: { event_name: 'subscription_created', custom_data: { plan: 'solo' } },
      data: { id: reference, attributes: { user_email: email, status: 'active' } },
    },
    { 'x-keyforge-mock': '1' },
  );
  check('mock webhook accepted', hook.data.ok === true, hook.data);
  check('webhook resolves plan', hook.data.plan === 'solo', hook.data);

  const noRef = await post('/api/claim', { email });
  check('claim without reference is refused', noRef.status === 403, noRef);
  const wrongRef = await post('/api/claim', { email, reference: 'mock_wrong' });
  check('claim with wrong reference is refused', wrongRef.status === 403, wrongRef);

  const claim = await post('/api/claim', { email, reference, app_name: 'Smoke App' });
  const apiKey = claim.data.api_key;
  check('claim returns an API key', typeof apiKey === 'string', claim.data);
  check('paid plan quota applied', claim.data.key_quota === 500, claim.data);
  if (!apiKey) throw new Error('cannot continue without an API key');

  const auth = { authorization: `Bearer ${apiKey}` };
  const issued = await post(
    '/api/v1/keys',
    { email: 'buyer@example.com', sku: 'pro', seat_limit: 1, expires_in_days: 30 },
    auth,
  );
  check('key issued for app', typeof issued.data.license_key === 'string', issued.data);
  check('sku persisted', issued.data.sku === 'pro', issued.data);

  const real = await validate(issued.data.license_key, 'buyer-machine');
  check('issued key validates', real.data.valid === true, real.data);
  check('sku returned on validate', real.data.sku === 'pro', real.data);
  const secondSeat = await validate(issued.data.license_key, 'buyer-machine-2');
  check('1-seat licence blocks second machine', secondSeat.data.reason === 'seat_limit', secondSeat.data);

  console.log('\nrevocation');
  const del = await fetch(`${BASE}/api/v1/keys/${issued.data.id}`, {
    method: 'DELETE',
    headers: auth,
  });
  check('revoke returns 200', del.status === 200, del.status);
  const afterRevoke = await validate(issued.data.license_key, 'buyer-machine');
  check('revoked key stops validating', afterRevoke.data.reason === 'revoked', afterRevoke.data);

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log(`failed: ${failures.join(', ')}\n`);
    process.exit(1);
  }
  console.log('all good\n');
}

main().catch((err) => {
  console.error(`\nsmoke test crashed: ${err.message}`);
  console.error('is the dev server running on ' + BASE + ' ?\n');
  process.exit(1);
});
