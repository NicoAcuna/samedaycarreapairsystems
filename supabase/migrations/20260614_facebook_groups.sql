-- Discovered Facebook groups, per company. The capture endpoint upserts a row
-- for each group a scraped post comes from. Lead detection runs on every group
-- UNLESS its row is active=false (same model as whatsapp_groups).

create table if not exists facebook_groups (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  group_id   text not null,
  group_name text,
  group_url  text,
  active     boolean not null default true,
  last_seen  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, group_id)
);

create index if not exists facebook_groups_company
  on facebook_groups (company_id);

alter table facebook_groups enable row level security;

create policy "company_select" on facebook_groups
  for select using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );

create policy "company_update" on facebook_groups
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );
