alter table bot_conversations
  add column if not exists client_availability text,
  add column if not exists scheduled_at timestamptz;
