-- ====================================================================
-- SIMPLIFIED MIGRATION: Fix Push Notification System Issues
-- Date: 23 September 2025
-- Description: Add indexes and fix data without changing notification constraints
-- ====================================================================

-- STRATEGY: Keep existing notification types (group_invite, friend_request, recap_notification)
-- No need to modify constraints - use existing types only

-- 1. Add performance indexes for push notification queries
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

-- 2. Fix username data for users with NULL usernames (for group invitations)
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

-- 3. Add helpful comments for documentation
-- ====================================================================

COMMENT ON INDEX idx_notifications_type_unread IS 
'Performance index for push notification queries filtering unread notifications by type';

COMMENT ON INDEX idx_user_push_subscriptions_user_id IS 
'Primary lookup index for finding push subscriptions by user ID';

-- 4. Verification queries (run after migration)
-- ====================================================================

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

-- Show current notification constraint (should remain unchanged)
SELECT conname, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass AND contype = 'c';

-- Show notification type distribution
SELECT 
  type, 
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- Show push subscription status
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as unique_users_subscribed
FROM user_push_subscriptions;

-- ====================================================================
-- NOTIFICATION TYPE MAPPING (for documentation)
-- ====================================================================

/*
Push Notification Templates mapped to existing DB types:

1. friendRequest → 'friend_request' ✅
2. friendRequestAccepted → 'friend_request' ✅ (same type, different context)
3. groupInvite → 'group_invite' ✅
4. newRecap → 'recap_notification' ✅
5. memorationReminder → 'recap_notification' ✅ (system notification)
6. test → 'recap_notification' ✅ (system notification)
7. custom → 'recap_notification' ✅ (system notification)

This mapping ensures all push notifications work within existing constraints
while maintaining semantic meaning through the push payload data.
*/

-- ====================================================================
-- POST-MIGRATION NOTES
-- ====================================================================

/*
After this migration:

1. ✅ All notification types are compatible with existing constraint
2. ✅ Performance indexes added for push notification queries  
3. ✅ Username data fixed for group invitation functionality
4. ✅ No breaking changes to existing system
5. ✅ Push notifications can be sent immediately after user subscriptions

Next steps:
1. Test push subscription registration in frontend
2. Verify VAPID keys are correctly configured  
3. Test end-to-end push notification flow
4. Monitor push notification delivery and performance
*/
