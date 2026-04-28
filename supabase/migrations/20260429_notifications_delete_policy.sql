-- Allow users to delete notifications for their active company
create policy "company_delete" on notifications
  for delete using (
    company_id in (
      select coalesce(active_company_id, company_id)
      from users
      where id = auth.uid()
    )
  );
