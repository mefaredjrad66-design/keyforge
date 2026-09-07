import { LEGAL } from '@/lib/legal';

export const metadata = { title: `Privacy Policy — ${LEGAL.productName}` };

export default function PrivacyPage() {
  return (
    <article className="prose-invert max-w-3xl space-y-6 text-[15px] leading-relaxed text-neutral-300">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Privacy Policy</h1>
        <p className="text-sm text-neutral-500">Last updated {LEGAL.lastUpdated}</p>
      </header>

      <p>
        {LEGAL.productName} is a licensing API operated by {LEGAL.legalName}. This policy explains
        what we collect, why we collect it, and what we do not collect. We have deliberately built
        the service to need very little personal data, because holding data we do not need is a
        liability for both of us.
      </p>

      <h2 className="text-xl font-medium text-white">Data we collect</h2>
      <p>
        From you, our customer, we collect the email address you sign up or pay with, the name you
        give your application, and a hashed copy of your API key. We never store your API key in a
        readable form; if you lose it you must reissue it.
      </p>
      <p>
        From your end users, we collect only what your application sends us when it validates a
        license: an optional buyer email address, an opaque device identifier of your choosing, and
        an optional hostname label. We recommend sending a hashed device identifier so that we never
        receive a value that could be linked back to a specific machine or person. License keys
        themselves are stored only as SHA-256 hashes.
      </p>
      <p>
        Our hosting and database providers process standard server logs, which may include IP
        addresses and timestamps, for security and abuse prevention.
      </p>

      <h2 className="text-xl font-medium text-white">Why we process it</h2>
      <p>
        We process this data to perform the contract you entered into with us: issuing license keys,
        enforcing the seat limits you configure, honouring revocations, billing you, and protecting
        the service against abuse. We do not sell personal data, we do not share it with advertisers,
        and we do not use it to train machine learning models.
      </p>

      <h2 className="text-xl font-medium text-white">Processors we rely on</h2>
      <p>
        Payments and invoicing are handled by {LEGAL.merchantOfRecord}, which acts as merchant of
        record and receives your billing details directly; we never see your card number. Application
        hosting is provided by our cloud host, and data is stored in a managed PostgreSQL database.
        Each of these providers is bound by its own data processing terms.
      </p>

      <h2 className="text-xl font-medium text-white">Retention</h2>
      <p>
        License and activation records are retained for as long as your account is active, because
        they are the operational record your software depends on. If you close your account we delete
        your applications, keys, and activation records within thirty days, except where we are
        required to retain billing records for tax purposes.
      </p>

      <h2 className="text-xl font-medium text-white">Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export, or delete
        the personal data we hold about you, and to object to certain processing. Write to{' '}
        {LEGAL.contactEmail} and we will respond within thirty days. If you are acting on behalf of
        an end user of your own software, note that you are the controller of that relationship and
        we act as your processor.
      </p>

      <h2 className="text-xl font-medium text-white">Cookies</h2>
      <p>
        The marketing pages set no tracking cookies and run no third-party analytics. If you are
        signed in, a single first-party session cookie may be used to keep you signed in. There is
        nothing to opt out of because there is no cross-site tracking to opt out of.
      </p>

      <h2 className="text-xl font-medium text-white">Security</h2>
      <p>
        All traffic is encrypted in transit. API keys and license keys are stored as hashes, database
        access is restricted to server-side credentials, and row level security is enabled on every
        table. No system is perfect: if we discover a breach affecting your data we will notify you
        without undue delay.
      </p>

      <h2 className="text-xl font-medium text-white">Contact</h2>
      <p>
        {LEGAL.legalName}, {LEGAL.jurisdiction}. Questions or requests: {LEGAL.contactEmail}.
      </p>
    </article>
  );
}
