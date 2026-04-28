-- Notification center: persistent history of all events sent to a company.
-- Rows are inserted by the service role (via /api/notify).
-- Users read and update (mark-read) their own company's notifications.

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  type       text not null default 'notification',
  title      text not null,
  body       text,
  url        text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_company_created
  on notifications (company_id, created_at desc);

alter table notifications enable row level security;

-- Users can read notifications for their active company
create policy "company_select" on notifications
  for select using (
    company_id in (
      select coalesce(active_company_id, company_id)
      from users
      where id = auth.uid()
    )
  );

-- Users can mark notifications as read
create policy "company_update" on notifications
  for update using (
    company_id in (
      select coalesce(active_company_id, company_id)
      from users
      where id = auth.uid()
    )
  );

-- Enable realtime so NotificationCenter receives new rows instantly
alter publication supabase_realtime add table notifications;
