-- Assign jobs to a mechanic (the admin does the assigning) and lock down who can
-- change a mechanic's access.

-- 1. Jobs get an optional assigned mechanic. On mechanic deletion, keep the job
--    but clear the assignment.
alter table jobs
  add column if not exists assigned_mechanic_id uuid references mechanics (id) on delete set null;

create index if not exists jobs_assigned_mechanic_idx on jobs (assigned_mechanic_id);

-- 2. Close the privilege-escalation hole: the old company_update policy let ANY
--    user in the company update a mechanic row — meaning a mechanic could grant
--    themselves permissions / change their role with a direct query. Only admins
--    (users.role <> 'mechanic') may update mechanics now. Invites/deletes keep
--    going through the service role, which bypasses RLS.
drop policy if exists "company_update" on mechanics;
create policy "admin_update" on mechanics
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id)
      from users
      where id = auth.uid() and role <> 'mechanic'
    )
  );
