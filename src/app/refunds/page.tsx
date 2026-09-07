import { LEGAL } from '@/lib/legal';

export const metadata = { title: `Refund Policy — ${LEGAL.productName}` };

export default function RefundsPage() {
  return (
    <article className="max-w-3xl space-y-6 text-[15px] leading-relaxed text-neutral-300">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Refund Policy</h1>
        <p className="text-sm text-neutral-500">Last updated {LEGAL.lastUpdated}</p>
      </header>

      <p>
        If {LEGAL.productName} does not do what you expected, write to {LEGAL.contactEmail} within{' '}
        {LEGAL.refundWindowDays} days of a charge and we will refund it in full. You do not need to
        justify the request, and we will not make you sit through a retention call. Refunds are
        issued by {LEGAL.merchantOfRecord} to the original payment method and typically appear within
        five to ten business days depending on your bank.
      </p>

      <p>
        There is a free tier precisely so that you can test the integration before paying, so we ask
        that you use it rather than subscribing and immediately requesting a refund as a matter of
        routine. We may decline repeated refund requests from the same customer, or requests where
        the account was used to distribute malicious software in breach of our terms.
      </p>

      <p>
        Cancelling a subscription stops the next renewal. We do not automatically pro-rate partial
        months, but if you cancel shortly after an unwanted renewal, ask us and we will refund it.
        License keys you have already issued to your own customers continue to validate through the
        end of the period you paid for, so a cancellation never breaks software already in your
        users&apos; hands without warning.
      </p>

      <p>
        Chargebacks cost small businesses disproportionately and take months to resolve. If something
        has gone wrong, emailing {LEGAL.contactEmail} will always be faster than filing a dispute.
      </p>
    </article>
  );
}
