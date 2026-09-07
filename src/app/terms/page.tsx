import Link from 'next/link';

import { LEGAL } from '@/lib/legal';

export const metadata = { title: `Terms of Service — ${LEGAL.productName}` };

export default function TermsPage() {
  return (
    <article className="max-w-3xl space-y-6 text-[15px] leading-relaxed text-neutral-300">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Terms of Service</h1>
        <p className="text-sm text-neutral-500">Last updated {LEGAL.lastUpdated}</p>
      </header>

      <p>
        These terms govern your use of {LEGAL.productName}, a hosted licensing API operated by{' '}
        {LEGAL.legalName}. By creating an account or calling the API you agree to them. If you are
        agreeing on behalf of a company, you confirm you have authority to bind it.
      </p>

      <h2 className="text-xl font-medium text-white">The service</h2>
      <p>
        {LEGAL.productName} issues license keys, validates them, tracks activations against the seat
        limits you set, and revokes keys on your instruction. It is developer infrastructure: what it
        does depends on how you integrate it. We provide the endpoints and the durability of the
        records; you remain responsible for the licensing terms you offer your own customers and for
        the behaviour of your software when a validation call fails.
      </p>

      <h2 className="text-xl font-medium text-white">Accounts and API keys</h2>
      <p>
        Your API key authenticates every privileged call and must be kept server-side. Do not embed
        it in a desktop application, a browser bundle, or a public repository. You are responsible
        for activity carried out with your API key. If you believe it has been exposed, reissue it
        immediately; reissuing invalidates the previous key.
      </p>

      <h2 className="text-xl font-medium text-white">Plans, billing, and taxes</h2>
      <p>
        Paid plans are billed monthly in United States dollars through {LEGAL.merchantOfRecord},
        which acts as merchant of record and is responsible for collecting and remitting applicable
        sales tax and VAT. Subscriptions renew automatically until cancelled. Plan limits, including
        the number of applications and license keys, are published on the pricing page and enforced
        by the API; exceeding them returns an explicit error rather than a surprise invoice.
      </p>
      <p>
        You may cancel at any time from the billing portal link in your receipt. Cancellation stops
        future renewals; keys you have already issued continue to validate until the end of the
        period you paid for.
      </p>

      <h2 className="text-xl font-medium text-white">Refunds</h2>
      <p>
        Our refund policy is set out on the <Link href="/refunds" className="text-emerald-400 hover:underline">refunds page</Link>{' '}
        and forms part of these terms.
      </p>

      <h2 className="text-xl font-medium text-white">Acceptable use</h2>
      <p>
        You may not use {LEGAL.productName} to distribute malware, to license software you do not
        have the right to license, to interfere with the integrity of the service, to attempt to
        enumerate or brute-force license keys belonging to others, or to store sensitive categories
        of personal data such as health or financial records in the optional metadata fields. We may
        rate-limit or suspend accounts that threaten the stability of the service for everyone else,
        and we will tell you why.
      </p>

      <h2 className="text-xl font-medium text-white">Availability</h2>
      <p>
        We aim for high availability and design the API so that transient outages need not lock out
        your paying customers: invalid keys return a structured reason rather than an error, and the
        documented client pattern caches the last successful check. We do not, however, offer a
        contractual uptime guarantee on the plans described on the pricing page. Because validation
        happens on machines we do not control, you should always implement a graceful fallback.
      </p>

      <h2 className="text-xl font-medium text-white">Your data and ours</h2>
      <p>
        You own the license and activation data you create. You can export it through the API at any
        time, and the database schema is published so you can migrate away or self-host. We own the
        service itself, including its code, design, and documentation. Nothing in these terms
        transfers our intellectual property to you or yours to us.
      </p>

      <h2 className="text-xl font-medium text-white">Anti-piracy expectations</h2>
      <p>
        We want to be candid, because overselling this category is common: any licensing check that
        runs on a user&apos;s own computer can in principle be bypassed by a determined attacker.{' '}
        {LEGAL.productName} is designed to stop casual key sharing, enforce seat counts, and make
        refunds and chargebacks actionable. It is not, and cannot honestly be sold as, unbreakable
        copy protection.
      </p>

      <h2 className="text-xl font-medium text-white">Disclaimers and liability</h2>
      <p>
        The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis
        without warranties of any kind, whether express or implied, to the fullest extent permitted
        by law. To the maximum extent permitted by applicable law, our total aggregate liability
        arising out of or relating to these terms is limited to the greater of the fees you paid us
        in the twelve months before the claim or one hundred United States dollars. Neither party is
        liable for indirect, incidental, special, or consequential damages, including lost revenue or
        lost profits. Some jurisdictions do not allow these limitations, in which case they apply to
        the extent permitted.
      </p>

      <h2 className="text-xl font-medium text-white">Termination</h2>
      <p>
        You may stop using the service and delete your account at any time. We may suspend or
        terminate access for material breach of these terms, for non-payment, or where required by
        law, with notice where practicable. On termination we will make your data available for
        export for thirty days.
      </p>

      <h2 className="text-xl font-medium text-white">Changes</h2>
      <p>
        We may update these terms as the service evolves. For material changes we will give
        reasonable advance notice by email or an in-product notice. Continuing to use the service
        after a change takes effect means you accept the revised terms.
      </p>

      <h2 className="text-xl font-medium text-white">Governing law and contact</h2>
      <p>
        These terms are governed by the laws of {LEGAL.jurisdiction}, without regard to conflict of
        law rules, and the courts there have exclusive jurisdiction. Questions:{' '}
        {LEGAL.contactEmail}.
      </p>
    </article>
  );
}
