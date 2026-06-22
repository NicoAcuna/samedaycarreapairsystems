-- Track when a job was completed so we can give mechanics a limited window to
-- reopen their own completed jobs (after that, only an admin can reopen).
alter table jobs
  add column if not exists completed_at timestamptz;
