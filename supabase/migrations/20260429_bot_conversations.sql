-- Tracks the state of each WhatsApp conversation the bot is managing.
-- One active conversation per contact per company at a time.

create table if not exists bot_conversations (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete set null,
  company_id    uuid not null,
  contact_jid   text not null,  -- e.g. '61439269598@s.whatsapp.net'
  contact_name  text,
  contact_phone text,
  status        text not null default 'qualifying',
  -- statuses: qualifying → awaiting_quote_approval → quoted → awaiting_booking_approval → scheduled → closed
  language      text default 'es',
  vehicle       jsonb,          -- {year, make, model}
  suburb        text,
  job_type      text,           -- diagnosis | direct_job | client_dx
  job_description text,
  suggested_price numeric,
  messages      jsonb not null default '[]',  -- [{role, content}] for Claude context
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Only one active conversation per contact per company
create unique index bot_conversations_active
  on bot_conversations (company_id, contact_jid)
  where status not in ('closed', 'scheduled');

create index bot_conversations_lead on bot_conversations (lead_id);
create index bot_conversations_company on bot_conversations (company_id, status);

alter table bot_conversations enable row level security;

-- Service role only (bot uses service role key, no user-facing access needed yet)
create policy "service_all" on bot_conversations
  for all using (true);
