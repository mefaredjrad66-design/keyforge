import { store, type App } from './db';
import { hashApiKey } from './keys';

export const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ ok: false, error: message, ...extra }, status);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function bearer(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Resolves the calling app from its secret API key, or returns a 401 Response. */
export async function requireApp(req: Request): Promise<App | Response> {
  const token = bearer(req);
  if (!token) return fail('Missing Authorization: Bearer <api_key>', 401);
  const app = await store.getAppByApiKeyHash(hashApiKey(token));
  if (!app) return fail('Invalid API key', 401);
  return app;
}

export function isApp(value: App | Response): value is App {
  return !(value instanceof Response);
}

/** Owner-only guard. In local mock mode (no ADMIN_TOKEN set) it stays open for testing. */
export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return process.env.NODE_ENV !== 'production';
  return bearer(req) === expected;
}

export const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export const int = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};
