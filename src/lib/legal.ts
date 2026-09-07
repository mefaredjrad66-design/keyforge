/**
 * Single source of truth for the legal pages.
 * REPLACE these placeholders before you submit the store for approval —
 * Lemon Squeezy and Stripe both reject stores with template contact details.
 */
export const LEGAL = {
  productName: 'KeyForge',
  legalName: '[YOUR LEGAL NAME OR COMPANY]',
  contactEmail: 'support@[YOUR-DOMAIN]',
  jurisdiction: '[YOUR COUNTRY / STATE]',
  merchantOfRecord: 'Lemon Squeezy, LLC',
  lastUpdated: 'September 7, 2026',
  refundWindowDays: 14,
} as const;
