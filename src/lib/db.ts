import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Single data layer with two backends:
 *   1. Supabase (free tier) when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *   2. In-memory mock otherwise — lets the entire product be tested locally with $0 and no accounts
 * Every route talks to `store`, so nothing above this file knows which backend is live.
 */

export interface App {
  id: string;
  name: string;
  owner_email: string;
  api_key_hash: string;
  plan: string;
  key_quota: number;
  created_at: string;
}

export interface LicenseKey {
  id: string;
  app_id: string;
  key_hash: string;
  key_prefix: string;
  email: string | null;
  sku: string;
  seat_limit: number;
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  order_ref: string | null;
  created_at: string;
}

export interface Activation {
  id: string;
  key_id: string;
  device_id: string;
  hostname: string | null;
  last_seen: string;
  created_at: string;
}

export interface Subscription {
  provider: string;
  provider_id: string;
  customer_email: string;
  plan: string;
  status: string;
  updated_at: string;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isMockStore = !(url && serviceKey);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) {
    client = createClient(url as string, serviceKey as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// --- mock backend ------------------------------------------------------------
// Held on globalThis so hot reloads (and separately-bundled route handlers)
// share one store during local development.
interface MockState {
  apps: App[];
  keys: LicenseKey[];
  activations: Activation[];
  subs: Subscription[];
}
const g = globalThis as typeof globalThis & { __keyforgeMock?: MockState };
const mem: MockState = (g.__keyforgeMock ??= { apps: [], keys: [], activations: [], subs: [] });

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

export const store = {
  async createApp(input: {
    name: string;
    owner_email: string;
    api_key_hash: string;
    plan?: string;
    key_quota?: number;
  }): Promise<App> {
    const row: App = {
      id: uid(),
      name: input.name,
      owner_email: input.owner_email,
      api_key_hash: input.api_key_hash,
      plan: input.plan ?? 'solo',
      key_quota: input.key_quota ?? 500,
      created_at: now(),
    };
    if (isMockStore) {
      mem.apps.push(row);
      return row;
    }
    const { data, error } = await sb()
      .from('apps')
      .insert({
        name: row.name,
        owner_email: row.owner_email,
        api_key_hash: row.api_key_hash,
        plan: row.plan,
        key_quota: row.key_quota,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as App;
  },

  async getAppByApiKeyHash(hash: string): Promise<App | null> {
    if (isMockStore) return mem.apps.find((a) => a.api_key_hash === hash) ?? null;
    const { data } = await sb().from('apps').select().eq('api_key_hash', hash).maybeSingle();
    return (data as App) ?? null;
  },

  async getAppByOwnerEmail(email: string): Promise<App | null> {
    if (isMockStore) return mem.apps.find((a) => a.owner_email === email) ?? null;
    const { data } = await sb()
      .from('apps')
      .select()
      .eq('owner_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as App) ?? null;
  },

  /** Rotating on claim means a leaked email thread can never be replayed for access. */
  async rotateAppApiKey(id: string, apiKeyHash: string, plan: string, quota: number): Promise<void> {
    if (isMockStore) {
      const a = mem.apps.find((x) => x.id === id);
      if (a) {
        a.api_key_hash = apiKeyHash;
        a.plan = plan;
        a.key_quota = quota;
      }
      return;
    }
    await sb()
      .from('apps')
      .update({ api_key_hash: apiKeyHash, plan, key_quota: quota })
      .eq('id', id);
  },

  async createKey(input: {
    app_id: string;
    key_hash: string;
    key_prefix: string;
    email?: string | null;
    sku?: string;
    seat_limit?: number;
    expires_at?: string | null;
    order_ref?: string | null;
  }): Promise<LicenseKey> {
    const row: LicenseKey = {
      id: uid(),
      app_id: input.app_id,
      key_hash: input.key_hash,
      key_prefix: input.key_prefix,
      email: input.email ?? null,
      sku: input.sku ?? 'default',
      seat_limit: input.seat_limit ?? 1,
      status: 'active',
      expires_at: input.expires_at ?? null,
      order_ref: input.order_ref ?? null,
      created_at: now(),
    };
    if (isMockStore) {
      mem.keys.unshift(row);
      return row;
    }
    const { id, created_at, ...insert } = row;
    const { data, error } = await sb().from('license_keys').insert(insert).select().single();
    if (error) throw new Error(error.message);
    return data as LicenseKey;
  },

  async getKeyByHash(hash: string): Promise<LicenseKey | null> {
    if (isMockStore) return mem.keys.find((k) => k.key_hash === hash) ?? null;
    const { data } = await sb().from('license_keys').select().eq('key_hash', hash).maybeSingle();
    return (data as LicenseKey) ?? null;
  },

  async listKeys(appId: string, limit = 50): Promise<LicenseKey[]> {
    if (isMockStore) return mem.keys.filter((k) => k.app_id === appId).slice(0, limit);
    const { data } = await sb()
      .from('license_keys')
      .select()
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as LicenseKey[]) ?? [];
  },

  async countKeys(appId: string): Promise<number> {
    if (isMockStore) return mem.keys.filter((k) => k.app_id === appId).length;
    const { count } = await sb()
      .from('license_keys')
      .select('id', { count: 'exact', head: true })
      .eq('app_id', appId);
    return count ?? 0;
  },

  async setKeyStatus(id: string, status: LicenseKey['status']): Promise<void> {
    if (isMockStore) {
      const k = mem.keys.find((x) => x.id === id);
      if (k) k.status = status;
      return;
    }
    await sb().from('license_keys').update({ status }).eq('id', id);
  },

  async getActivation(keyId: string, deviceId: string): Promise<Activation | null> {
    if (isMockStore)
      return mem.activations.find((a) => a.key_id === keyId && a.device_id === deviceId) ?? null;
    const { data } = await sb()
      .from('activations')
      .select()
      .eq('key_id', keyId)
      .eq('device_id', deviceId)
      .maybeSingle();
    return (data as Activation) ?? null;
  },

  async countActivations(keyId: string): Promise<number> {
    if (isMockStore) return mem.activations.filter((a) => a.key_id === keyId).length;
    const { count } = await sb()
      .from('activations')
      .select('id', { count: 'exact', head: true })
      .eq('key_id', keyId);
    return count ?? 0;
  },

  async addActivation(keyId: string, deviceId: string, hostname?: string | null): Promise<void> {
    if (isMockStore) {
      mem.activations.push({
        id: uid(),
        key_id: keyId,
        device_id: deviceId,
        hostname: hostname ?? null,
        last_seen: now(),
        created_at: now(),
      });
      return;
    }
    await sb()
      .from('activations')
      .insert({ key_id: keyId, device_id: deviceId, hostname: hostname ?? null });
  },

  async touchActivation(keyId: string, deviceId: string): Promise<void> {
    if (isMockStore) {
      const a = mem.activations.find((x) => x.key_id === keyId && x.device_id === deviceId);
      if (a) a.last_seen = now();
      return;
    }
    await sb()
      .from('activations')
      .update({ last_seen: now() })
      .eq('key_id', keyId)
      .eq('device_id', deviceId);
  },

  async removeActivation(keyId: string, deviceId: string): Promise<void> {
    if (isMockStore) {
      mem.activations = mem.activations.filter(
        (a) => !(a.key_id === keyId && a.device_id === deviceId),
      );
      return;
    }
    await sb().from('activations').delete().eq('key_id', keyId).eq('device_id', deviceId);
  },

  async upsertSubscription(rec: Omit<Subscription, 'updated_at'>): Promise<void> {
    const row: Subscription = { ...rec, updated_at: now() };
    if (isMockStore) {
      const i = mem.subs.findIndex((s) => s.provider_id === row.provider_id);
      if (i >= 0) mem.subs[i] = row;
      else mem.subs.push(row);
      return;
    }
    await sb().from('subscriptions').upsert(row, { onConflict: 'provider_id' });
  },

  async getSubscriptionByEmail(email: string): Promise<Subscription | null> {
    if (isMockStore)
      return (
        mem.subs
          .filter((s) => s.customer_email.toLowerCase() === email.toLowerCase())
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null
      );
    const { data } = await sb()
      .from('subscriptions')
      .select()
      .ilike('customer_email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Subscription) ?? null;
  },
};
