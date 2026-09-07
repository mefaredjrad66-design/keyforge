/**
 * Reproduces the Vercel build crash (ERR_INVALID_URL while collecting page data
 * for /_not-found) against the real siteUrl() implementation, under every hostile
 * value NEXT_PUBLIC_SITE_URL / VERCEL_URL can hold in a dashboard-configured env.
 *
 *   node --experimental-strip-types scripts/verify-build-env.mjs
 *
 * Every case must produce a URL that `new URL()` accepts, because src/app/layout.tsx
 * feeds siteUrl() straight into `metadataBase: new URL(site)`.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const plans = resolve(here, '../src/lib/plans.ts');

const cases = [
  { name: 'both unset', env: {}, expect: 'http://localhost:3000' },
  { name: 'site url empty string (the Vercel failure)', env: { NEXT_PUBLIC_SITE_URL: '' }, expect: 'http://localhost:3000' },
  { name: 'site url whitespace only', env: { NEXT_PUBLIC_SITE_URL: '   ' }, expect: 'http://localhost:3000' },
  { name: 'site url unparseable', env: { NEXT_PUBLIC_SITE_URL: 'not a url' }, expect: 'http://localhost:3000' },
  { name: 'site url missing scheme', env: { NEXT_PUBLIC_SITE_URL: 'keyforge.vercel.app' }, expect: 'https://keyforge.vercel.app' },
  { name: 'site url trailing slash stripped', env: { NEXT_PUBLIC_SITE_URL: 'https://keyforge.app/' }, expect: 'https://keyforge.app' },
  { name: 'site url with path stripped to origin', env: { NEXT_PUBLIC_SITE_URL: 'https://keyforge.app/en/' }, expect: 'https://keyforge.app' },
  { name: 'site url padded with spaces', env: { NEXT_PUBLIC_SITE_URL: '  https://keyforge.app  ' }, expect: 'https://keyforge.app' },
  { name: 'http kept as-is', env: { NEXT_PUBLIC_SITE_URL: 'http://localhost:4000' }, expect: 'http://localhost:4000' },
  { name: 'falls back to VERCEL_URL', env: { NEXT_PUBLIC_SITE_URL: '', VERCEL_URL: 'keyforge-abc123.vercel.app' }, expect: 'https://keyforge-abc123.vercel.app' },
  { name: 'prefers NEXT_PUBLIC_VERCEL_URL over VERCEL_URL', env: { NEXT_PUBLIC_VERCEL_URL: 'a.vercel.app', VERCEL_URL: 'b.vercel.app' }, expect: 'https://a.vercel.app' },
  { name: 'explicit site url wins over VERCEL_URL', env: { NEXT_PUBLIC_SITE_URL: 'https://keyforge.app', VERCEL_URL: 'b.vercel.app' }, expect: 'https://keyforge.app' },
];

const script = `
import { siteUrl } from ${JSON.stringify(plans)};
const site = siteUrl();
new URL(site); // this is exactly what layout.tsx does via metadataBase
process.stdout.write(site);
`;

let pass = 0;
let fail = 0;

for (const c of cases) {
  const env = { PATH: process.env.PATH, NODE_ENV: 'production', ...c.env };
  let got;
  try {
    got = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], {
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    console.log(`FAIL  ${c.name} -> threw: ${String(err.stderr || err.message).split('\n')[0]}`);
    fail++;
    continue;
  }
  if (got === c.expect) {
    console.log(`ok    ${c.name} -> ${got}`);
    pass++;
  } else {
    console.log(`FAIL  ${c.name} -> got ${JSON.stringify(got)}, want ${JSON.stringify(c.expect)}`);
    fail++;
  }
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail ? 1 : 0);
