import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { siteUrl } from '@/lib/plans';
import './globals.css';

// siteUrl() always returns a parseable origin, so new URL() below cannot throw at build time.
const site = siteUrl();

export const metadata: Metadata = {
  title: 'KeyForge — license keys for indie software, in one API call',
  description:
    'Issue, validate, and revoke license keys for your desktop app, plugin, or CLI. One POST from your checkout webhook, one POST from your app. Seat limits and revocation included.',
  metadataBase: new URL(site),
  openGraph: {
    title: 'KeyForge — license keys for indie software',
    description: 'Licensing infrastructure for solo devs. Two endpoints, no SDK, no lock-in.',
    url: site,
    siteName: 'KeyForge',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-900">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-mono text-sm font-semibold tracking-tight text-white">
              key<span className="text-emerald-400">forge</span>
            </Link>
            <div className="flex items-center gap-5 text-sm text-neutral-400">
              <Link href="/docs" className="hover:text-white">
                Docs
              </Link>
              <Link href="/playground" className="hover:text-white">
                Playground
              </Link>
              <Link href="/#pricing" className="hover:text-white">
                Pricing
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-14">{children}</main>

        <footer className="border-t border-neutral-900 py-8 text-sm text-neutral-500">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6">
            <span>© {new Date().getFullYear()} KeyForge</span>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-neutral-300">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-neutral-300">
                Terms
              </Link>
              <Link href="/refunds" className="hover:text-neutral-300">
                Refunds
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}