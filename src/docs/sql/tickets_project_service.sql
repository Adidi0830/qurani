-- Add project + service columns for support tickets (safe to re-run)
-- Run in Supabase SQL Editor

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS project text;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS service text;

-- Optional: indexes if you filter/search these fields often
CREATE INDEX IF NOT EXISTS idx_tickets_project ON public.tickets (project);
CREATE INDEX IF NOT EXISTS idx_tickets_service ON public.tickets (service);
