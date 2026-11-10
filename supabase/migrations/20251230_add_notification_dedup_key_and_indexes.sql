alter table public.notifications
  add column if not exists dedup_key text;

create unique index if not exists notifications_dedup_key_key
  on public.notifications (dedup_key);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_ticket_id_created_at_idx
  on public.notifications (ticket_id, created_at desc);