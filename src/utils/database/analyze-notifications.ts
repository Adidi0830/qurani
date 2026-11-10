"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * Analyze notifications table structure and data patterns
 */
export async function analyzeNotificationsStructure() {
  try {
    const supabase = await createClient()
    
    console.log('🔍 Analyzing notifications table structure and patterns...')
    
    // Get all notification types and their user_id patterns
    const { data: allNotifications, error } = await supabase
      .from('notifications')
      .select('id, type, user_id, ticket_id, from_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200) // Get recent 200 notifications
    
    if (error) {
      throw error
    }

    if (!allNotifications || allNotifications.length === 0) {
      console.log('📭 No notifications found')
      return { success: false, error: 'No notifications found' }
    }

    // Group by notification type
    const groupedByType: { [key: string]: Array<{
      id: string;
      type: string;
      user_id: string | null;
      ticket_id: number | null;
      from_user_id: string | null;
      created_at: string;
    }> } = {}
    
    allNotifications.forEach(notification => {
      const type = notification.type
      if (!groupedByType[type]) {
        groupedByType[type] = []
      }
      groupedByType[type].push(notification)
    })

    console.log('\n📊 NOTIFICATION ANALYSIS RESULTS:')
    console.log('=' .repeat(60))
    
    Object.entries(groupedByType).forEach(([type, notifications]) => {
      console.log(`\n🏷️  TYPE: ${type}`)
      console.log(`   Total: ${notifications.length}`)
      
      // Check user_id patterns
      const nullUserIds = notifications.filter(n => n.user_id === null).length
      const validUserIds = notifications.filter(n => n.user_id !== null).length
      
      console.log(`   user_id = null: ${nullUserIds}`)
      console.log(`   user_id = valid: ${validUserIds}`)
      
      if (type === 'ticket_new_message') {
        console.log('\n   🎫 TICKET NOTIFICATION DETAILS:')
        
        // Show ticket_id distribution
        const ticketIds = [...new Set(notifications.map(n => n.ticket_id))].filter(Boolean)
        console.log(`   Unique ticket_ids: ${ticketIds.length}`)
        
        // Show pattern of first 10
        notifications.slice(0, 10).forEach((n, i) => {
          console.log(`   [${i+1}] ID: ${n.id.slice(0, 8)}... ticket_id: ${n.ticket_id}, user_id: ${n.user_id}, created: ${n.created_at.slice(0, 10)}`)
        })
        
        // Check for same ticket_id with different user_ids
        const ticketUserMap: { [key: number]: Set<string | null> } = {}
        notifications.forEach(n => {
          if (n.ticket_id) {
            if (!ticketUserMap[n.ticket_id]) {
              ticketUserMap[n.ticket_id] = new Set()
            }
            ticketUserMap[n.ticket_id].add(n.user_id)
          }
        })
        
        console.log('\n   🔍 TICKET -> USER_ID MAPPING:')
        Object.entries(ticketUserMap).slice(0, 5).forEach(([ticketId, userIds]) => {
          console.log(`   Ticket ${ticketId}: users = ${Array.from(userIds).join(', ') || 'null'}`)
        })
      }
    })

    // Check for potential duplicate patterns
    console.log('\n🔍 DUPLICATE ANALYSIS:')
    const ticketNotifications = allNotifications.filter(n => n.type === 'ticket_new_message')
    
    const duplicateCheck: { [key: string]: number } = {}
    ticketNotifications.forEach(n => {
      const key = `ticket_${n.ticket_id}`
      duplicateCheck[key] = (duplicateCheck[key] || 0) + 1
    })
    
    const duplicates = Object.entries(duplicateCheck).filter(([, count]) => count > 1)
    console.log(`Found ${duplicates.length} tickets with multiple notifications:`)
    duplicates.slice(0, 10).forEach(([key, count]) => {
      console.log(`   ${key}: ${count} notifications`)
    })

    return { 
      success: true,
      analysis: {
        totalNotifications: allNotifications.length,
        typeBreakdown: Object.entries(groupedByType).map(([type, notifications]) => ({
          type,
          count: notifications.length,
          nullUserIds: notifications.filter(n => n.user_id === null).length,
          validUserIds: notifications.filter(n => n.user_id !== null).length
        })),
        duplicateTickets: duplicates.length,
        ticketNotificationPattern: ticketNotifications.length > 0 ? {
          totalTicketNotifications: ticketNotifications.length,
          uniqueTicketIds: [...new Set(ticketNotifications.map(n => n.ticket_id))].length,
          nullUserIdPercentage: Math.round((ticketNotifications.filter(n => n.user_id === null).length / ticketNotifications.length) * 100)
        } : null
      }
    }

  } catch (error) {
    console.error('💥 Analysis failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get current admin users for comparison
 */
export async function getCurrentAdminUsers() {
  try {
    const supabase = await createClient()
    
    const { data: adminUsers, error } = await supabase
      .from('user_profiles')
      .select('id, name, role')
      .eq('role', 'admin')
    
    if (error) throw error
    
    console.log('\n👥 CURRENT ADMIN USERS:')
    adminUsers?.forEach((admin, i) => {
      console.log(`   [${i+1}] ${admin.id} - ${admin.name}`)
    })
    
    return {
      success: true,
      admins: adminUsers || [],
      count: adminUsers?.length || 0
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      admins: [],
      count: 0
    }
  }
}
