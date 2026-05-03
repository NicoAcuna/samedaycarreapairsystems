-- Lifecycle stage funnel for leads
alter table leads
  add column if not exists lifecycle_stage text not null default 'awareness'
    check (lifecycle_stage in ('awareness','acquisition','engagement','activation','retention','lost'));

-- Track follow-up messages sent by the bot to avoid duplicates
alter table bot_conversations
  add column if not exists follow_up_sent_at timestamptz;
