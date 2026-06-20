-- Firm-link mechanics to their auth account and stop duplicate invites.
-- invite-mechanic now sets mechanics.user_id at invite time (from the auth
-- user created by generateLink), so the accept flow no longer guesses by email.

-- 1. FK: mechanics.user_id -> auth.users. If the auth user is deleted, unlink
--    the mechanic (keep the record so the email can be re-invited).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mechanics_user_id_fkey'
  ) then
    alter table mechanics
      add constraint mechanics_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete set null;
  end if;
end $$;

-- 2. One mechanic per email per company — blocks duplicate invitations.
create unique index if not exists mechanics_company_email_uniq
  on mechanics (company_id, lower(email));
