-- Lead detection criteria — user-defined keywords/filters shared by all channels
-- (WhatsApp, Facebook, Airtasker). Read by the bot webhook (service role) and
-- managed by users from the /settings panel.

create table if not exists lead_criteria (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  term       text not null,
  kind       text not null default 'trigger'
    check (kind in ('trigger','exclude','high_priority','medium_priority')),
  channels   text[] not null default '{whatsapp,facebook,airtasker}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists lead_criteria_company
  on lead_criteria (company_id, kind);

alter table lead_criteria enable row level security;

-- Users manage criteria for their own active company
create policy "company_select" on lead_criteria
  for select using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );

create policy "company_insert" on lead_criteria
  for insert with check (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );

create policy "company_update" on lead_criteria
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );

create policy "company_delete" on lead_criteria
  for delete using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );
