-- Migration: Add ticket_id to notifications for support ticket notifications
-- Run this SQL in your Supabase SQL Editor

-- Add ticket_id column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS ticket_id integer REFERENCES public.tickets(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON public.notifications(ticket_id);

-- Add comment
COMMENT ON COLUMN public.notifications.ticket_id IS 'Reference to ticket for support ticket notifications';

-- Enable realtime for notifications table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
