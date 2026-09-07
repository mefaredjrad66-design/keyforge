-- KeyForge schema (Supabase free tier). Run in SQL editor.
-- Row Level Security stays ON with no public policies: all access is
-- server-side via the service role key, so keys can never be read from a browser.

create table if not exists apps (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_email   text not null,
  api_key_hash  text not null unique,
  plan          text not null default 'solo',
  key_quota     integer not null default 500,
  created_at    timestamptz not null default now()
);

create table if not exists license_keys (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references apps(id) on delete cascade,
  key_hash    text not null unique,
  key_prefix  text not null,
  email       text,
  sku         text not null default 'default',
  seat_limit  integer not null default 1,
  status      text not null default 'active', -- active | revoked | expired
  expires_at  timestamptz,
  order_ref   text,
  created_at  timestamptz not null default now()
);

create table if not exists activations (
  id         uuid primary key default gen_random_uuid(),
  key_id     uuid not null references license_keys(id) on delete cascade,
  device_id  text not null,
  hostname   text,
  last_seen  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (key_id, device_id)
);

create table if not exists subscriptions (
  id             uuid primary key default gen_random_uuid(),
  provider       text not null default 'lemonsqueezy',
  provider_id    text not null unique,
  customer_email text not null,
  plan           text not null,
  status         text not null,
  updated_at     timestamptz not null default now()
);

create index if not exists license_keys_app_idx on license_keys(app_id);
create index if not exists activations_key_idx on activations(key_id);

alter table apps           enable row level security;
alter table license_keys   enable row level security;
alter table activations    enable row level security;
alter table subscriptions  enable row level security;
