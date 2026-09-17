-- Second RLS hardening pass — column-level and missing-policy gaps.

-- ── 1. mechanics.invite_token / invite_expires_at were readable by every user in
--       the company (the row-level select policy grants all columns). A low-priv
--       mechanic could read a pending admin invite token and claim that account.
--       Revoke column access from the browser roles; the invite validate/accept
--       endpoints use the service role, which bypasses column grants.
--       (The two client-side `select('*')` on mechanics were narrowed to explicit
--        columns in the same change, so `*` no longer trips these revokes.)
revoke select (invite_token, invite_expires_at) on mechanics from anon, authenticated;

-- ── 2. facebook_groups / whatsapp_groups had select+update but no insert/delete
--       policy. Inserts currently go through the service role, but a browser-side
--       "remove group" action would fail closed. Add company-scoped insert/delete
--       (with WITH CHECK on insert) so the UI can manage groups directly.
create policy "company_insert" on facebook_groups
  for insert with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );
create policy "company_delete" on facebook_groups
  for delete using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );

create policy "company_insert" on whatsapp_groups
  for insert with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );
create policy "company_delete" on whatsapp_groups
  for delete using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );
