-- ====================================================================
-- MIGRATION: Fix Push Notification System Issues
-- Date: 23 September 2025
-- Description: Fix database constraints and indexes for push notifications
-- ====================================================================

-- 1. Fix notifications table constraint to support new push notification types
-- ====================================================================

-- Remove old constraint that only allows 3 types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint supporting all push notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type::text = ANY (ARRAY[
  'group_invite'::character varying::text, 
  'friend_request'::character varying::text, 
  'recap_notification'::character varying::text,
  'test_notification'::character varying::text,
  'custom_notification'::character varying::text,
  'friend_request_accepted'::character varying::text,
  'memorization_reminder'::character varying::text
]));

-- 2. Add performance indexes for push notification queries
-- ====================================================================

-- Index for unread notifications by type (frequently queried)
CREATE INDEX IF NOT EXISTS idx_notifications_type_unread 
ON notifications(type, is_read) 
WHERE is_read = false;

-- Index for notifications by user and type
CREATE INDEX IF NOT EXISTS idx_notifications_user_type 
ON notifications(user_id, type, created_at DESC);

-- Index for push subscriptions by user_id (primary lookup)
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id 
ON user_push_subscriptions(user_id);

-- Index for active push subscriptions (for cleanup operations)
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_created 
ON user_push_subscriptions(created_at DESC);

-- 3. Fix username data for users with NULL usernames
-- ====================================================================

-- Update users with NULL username to use full_name based username
UPDATE user_profiles 
SET username = CONCAT('@', LOWER(REPLACE(REPLACE(full_name, ' ', '_'), '.', '_')))
WHERE username IS NULL 
  AND full_name IS NOT NULL 
  AND full_name != '';

-- Update remaining NULL usernames with fallback
UPDATE user_profiles 
SET username = CONCAT('@user_', SUBSTRING(id::text, 1, 8))
WHERE username IS NULL;

-- 4. Add helpful comments for documentation
-- ====================================================================

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 
'Allowed notification types including push notification system types: group_invite, friend_request, recap_notification, test_notification, custom_notification, friend_request_accepted, memorization_reminder';

COMMENT ON INDEX idx_notifications_type_unread IS 
'Performance index for push notification queries filtering unread notifications by type';

COMMENT ON INDEX idx_user_push_subscriptions_user_id IS 
'Primary lookup index for finding push subscriptions by user ID';

-- 5. Add trigger to automatically clean up old notifications (optional)
-- ====================================================================

-- Function to clean up old read notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications() 
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run cleanup monthly (can be adjusted)
-- Note: This is optional and may need to be run manually or via cron

-- 6. Verification queries (run after migration)
-- ====================================================================

-- Verify constraint is working
DO $$
BEGIN
  -- Test that new notification types are accepted
  INSERT INTO notifications (user_id, type, from_user_id) 
  VALUES ('00000000-0000-0000-0000-000000000000', 'test_notification', NULL);
  
  -- Clean up test record
  DELETE FROM notifications 
  WHERE user_id = '00000000-0000-0000-0000-000000000000' 
    AND type = 'test_notification';
    
  RAISE NOTICE 'Notification constraint test passed - new types are accepted';
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'Migration failed - notification constraint still blocking new types';
END;
$$;

-- Verify indexes are created
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('notifications', 'user_push_subscriptions') 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verify username fixes
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as users_with_username,
  COUNT(*) - COUNT(username) as users_without_username
FROM user_profiles;

-- Show notification type distribution
SELECT 
  type, 
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- ====================================================================
-- POST-MIGRATION VERIFICATION
-- ====================================================================

-- Run these queries to verify migration success:

-- 1. Check constraint allows new types
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints 
-- WHERE constraint_name = 'notifications_type_check';

-- 2. Check indexes are created  
-- \d+ notifications
-- \d+ user_push_subscriptions

-- 3. Check username data
-- SELECT COUNT(*) as users_without_username FROM user_profiles WHERE username IS NULL;

-- 4. Test push notification creation
-- INSERT INTO notifications (user_id, type, from_user_id) 
-- SELECT id, 'test_notification', id FROM user_profiles LIMIT 1;

-- ====================================================================
-- ROLLBACK PLAN (if needed)
-- ====================================================================

-- If migration needs to be rolled back:
/*
-- Restore original constraint
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type::text = ANY (ARRAY[
  'group_invite'::character varying::text, 
  'friend_request'::character varying::text, 
  'recap_notification'::character varying::text
]));

-- Remove indexes
DROP INDEX IF EXISTS idx_notifications_type_unread;
DROP INDEX IF EXISTS idx_notifications_user_type;
DROP INDEX IF EXISTS idx_user_push_subscriptions_user_id;
DROP INDEX IF EXISTS idx_user_push_subscriptions_created;

-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_old_notifications();
*/
