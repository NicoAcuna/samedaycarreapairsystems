-- The mechanics table had RLS enabled but no company-scoped policy, so the
-- owner/admin could never see or edit their company's mechanics from the
-- browser (the list always showed 0). Mirror the company_* pattern used by
-- facebook_groups / lead_criteria / notifications. Inserts and deletes keep
-- going through the service role (invite-mechanic / delete-mechanic).

alter table mechanics enable row level security;

drop policy if exists "company_select" on mechanics;
create policy "company_select" on mechanics
  for select using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );

drop policy if exists "company_update" on mechanics;
create policy "company_update" on mechanics
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id) from users where id = auth.uid()
    )
  );
