"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * Clean up duplicate ticket notifications in the database
 * This function removes duplicate notifications for the same ticket_id and user_id combination
 */
export async function cleanupDuplicateNotifications() {
  try {
    const supabase = await createClient()
    
    console.log('🧹 Starting cleanup of duplicate ticket notifications...')
    
    // Get all ticket notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, user_id, ticket_id, created_at')
      .eq('type', 'ticket_new_message')
      .order('created_at', { ascending: false }) // Keep the newest ones
    
    if (error) {
      throw error
    }

    if (!notifications || notifications.length === 0) {
      console.log('📭 No ticket notifications found')
      return { success: true, duplicatesRemoved: 0 }
    }

    // Group by ticket_id and user_id to find duplicates
    const grouped: { [key: string]: typeof notifications } = {}
    
    notifications.forEach(notification => {
      const key = `${notification.ticket_id}_${notification.user_id}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(notification)
    })

    // Find duplicates (groups with more than 1 notification)
    const duplicatesToRemove: string[] = []
    
    Object.entries(grouped).forEach(([key, group]) => {
      if (group.length > 1) {
        // Keep the first (newest) one, remove the rest
        const [keep, ...remove] = group
        duplicatesToRemove.push(...remove.map(n => n.id))
        
        console.log(`🔍 Found ${group.length} duplicates for ${key}:`)
        console.log(`   ✅ Keeping: ${keep.id} (${keep.created_at})`)
        remove.forEach(n => console.log(`   ❌ Removing: ${n.id} (${n.created_at})`))
      }
    })

    if (duplicatesToRemove.length === 0) {
      console.log('✨ No duplicates found - database is clean!')
      return { success: true, duplicatesRemoved: 0 }
    }

    console.log(`🗑️ Removing ${duplicatesToRemove.length} duplicate notifications...`)
    
    // Remove duplicates in batches to avoid timeout
    const BATCH_SIZE = 100
    let totalRemoved = 0
    
    for (let i = 0; i < duplicatesToRemove.length; i += BATCH_SIZE) {
      const batch = duplicatesToRemove.slice(i, i + BATCH_SIZE)
      
      const { error: deleteError, count } = await supabase
        .from('notifications')
        .delete()
        .in('id', batch)
      
      if (deleteError) {
        console.error('❌ Error deleting batch:', deleteError)
        throw deleteError
      }
      
      totalRemoved += count || 0
      console.log(`✅ Removed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${count} notifications`)
    }

    console.log(`🎉 Cleanup completed! Removed ${totalRemoved} duplicate notifications`)
    
    return { 
      success: true, 
      duplicatesRemoved: totalRemoved,
      details: `Processed ${Object.keys(grouped).length} unique ticket-user combinations`
    }

  } catch (error) {
    console.error('💥 Cleanup failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duplicatesRemoved: 0
    }
  }
}

/**
 * Clean up notifications with null user_id (historical bug)
 */
export async function cleanupNullUserNotifications() {
  try {
    const supabase = await createClient()
    
    console.log('🧹 Cleaning up notifications with null user_id...')
    
    const { error, count } = await supabase
      .from('notifications')
      .delete()
      .is('user_id', null)
    
    if (error) {
      throw error
    }

    console.log(`✅ Removed ${count || 0} notifications with null user_id`)
    
    return { 
      success: true, 
      nullNotificationsRemoved: count || 0 
    }

  } catch (error) {
    console.error('💥 Null user cleanup failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      nullNotificationsRemoved: 0
    }
  }
}
