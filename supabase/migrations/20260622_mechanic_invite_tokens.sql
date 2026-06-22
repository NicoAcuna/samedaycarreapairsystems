-- Mechanic invites now use our own token (not Supabase magic-links/OTP, which
-- break inside in-app browsers and get consumed by email link scanners).
-- invite-mechanic stores a random token + 1-day expiry on the mechanic row;
-- /join validates it and the mechanic sets their password via accept-invite.

alter table mechanics
  add column if not exists invite_token text,
  add column if not exists invite_expires_at timestamptz;

create index if not exists mechanics_invite_token_idx on mechanics (invite_token);
