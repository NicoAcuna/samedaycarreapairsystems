-- Discovered WhatsApp groups, per company and per Evolution instance (= each
-- WhatsApp number). The bot webhook upserts a row whenever a group message
-- arrives. Lead detection runs on every group UNLESS its row is active=false.

create table if not exists whatsapp_groups (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  instance    text,
  group_jid   text not null,
  group_name  text,
  active      boolean not null default true,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (company_id, group_jid)
);

create index if not exists whatsapp_groups_company
  on whatsapp_groups (company_id, instance);

alter table whatsapp_groups enable row level security;

-- Users read and toggle (active) their own company's groups.
create policy "company_select" on whatsapp_groups
  for select using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );

create policy "company_update" on whatsapp_groups
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );
