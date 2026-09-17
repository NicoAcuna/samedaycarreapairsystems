-- RLS hardening pass. Two classes of holes:
--   1. Over-permissive policies (`using (true)`) that exist only to grant the
--      browser (authenticated/anon) role blanket cross-tenant access. The
--      service role already bypasses RLS, so these grants are pure leak.
--   2. UPDATE policies with a USING clause but no WITH CHECK, which lets a user
--      rewrite a row they can see into ANOTHER company (tenant hop).

-- ── 1. bot_conversations: was `for all using (true)` → any logged-in user could
--       read/modify every tenant's conversations (phones, transcripts, prices).
drop policy if exists "service_all" on bot_conversations;

create policy "company_select" on bot_conversations
  for select using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );

create policy "company_update" on bot_conversations
  for update using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  ) with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );
-- Inserts/deletes stay on the service role (bot webhook / notify), which bypasses RLS.

-- ── 2. push_subscriptions: `service_read using (true)` leaked every device's
--       push credentials (endpoint, p256dh, auth) to all tenants. The fan-out
--       uses the service role, so this policy is unnecessary — drop it. The
--       existing `owner_all` policy still covers legitimate per-user access.
drop policy if exists "service_read" on push_subscriptions;

-- ── 3. Add the missing WITH CHECK to every company-scoped UPDATE policy so a row
--       cannot be moved to another company_id on update.
drop policy if exists "admin_update" on mechanics;
create policy "admin_update" on mechanics
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id) from users
      where id = auth.uid() and role <> 'mechanic'
    )
  ) with check (
    company_id in (
      select coalesce(active_company_id, company_id) from users
      where id = auth.uid() and role <> 'mechanic'
    )
  );

drop policy if exists "company_update" on lead_criteria;
create policy "company_update" on lead_criteria
  for update using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  ) with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );

drop policy if exists "company_update" on facebook_groups;
create policy "company_update" on facebook_groups
  for update using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  ) with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );

drop policy if exists "company_update" on whatsapp_groups;
create policy "company_update" on whatsapp_groups
  for update using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  ) with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );

drop policy if exists "company_update" on notifications;
create policy "company_update" on notifications
  for update using (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  ) with check (
    company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );

-- ── 4. roles: `roles_select using (true)` is fine for seeded system roles but
--       will leak custom per-company roles once they exist. Scope to system
--       roles + the caller's own company.
drop policy if exists "roles_select" on roles;
create policy "roles_select" on roles
  for select using (
    company_id is null
    or company_id in (select coalesce(active_company_id, company_id) from users where id = auth.uid())
  );
