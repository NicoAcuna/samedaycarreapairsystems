-- Push notification subscriptions
-- One row per device/browser. A user can have multiple devices.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- Only the owning user can read/write their subscriptions
alter table push_subscriptions enable row level security;

create policy "owner_all" on push_subscriptions
  for all using (auth.uid() = user_id);

-- Service role (used by /api/notify and the bot) can read all subscriptions
-- for a company to fan-out pushes
create policy "service_read" on push_subscriptions
  for select using (true);
