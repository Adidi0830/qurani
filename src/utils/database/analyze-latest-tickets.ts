"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * Analyze latest ticket notifications to understand current state
 */
export async function analyzeLatestTicketNotifications() {
  try {
    const supabase = await createClient()
    
    console.log('🔍 Analyzing latest ticket notifications...')
    
    // Get the most recent ticket notifications
    const { data: latestTicketNotifications, error } = await supabase
      .from('notifications')
      .select('id, user_id, ticket_id, created_at, is_read')
      .eq('type', 'ticket_new_message')
      .order('created_at', { ascending: false })
      .limit(50) // Get last 50 ticket notifications

    if (error) {
      throw error
    }

    if (!latestTicketNotifications || latestTicketNotifications.length === 0) {
      console.log('📭 No ticket notifications found')
      return { success: false, error: 'No ticket notifications found' }
    }

    // Find the absolute latest notification
    const latestNotification = latestTicketNotifications[0]
    console.log('\n🎯 LATEST TICKET NOTIFICATION:')
    console.log('=' .repeat(60))
    console.log(`📅 Date: ${latestNotification.created_at}`)
    console.log(`🆔 ID: ${latestNotification.id}`)
    console.log(`🎫 Ticket ID: ${latestNotification.ticket_id}`)
    console.log(`👤 User ID: ${latestNotification.user_id || 'NULL'}`)
    console.log(`📖 Read: ${latestNotification.is_read}`)

    // Get ticket details for the latest notification
    if (latestNotification.ticket_id) {
      const { data: ticketDetails } = await supabase
        .from('tickets')
        .select('ticket_number, subject, contact, status, submitted_date, last_reply')
        .eq('id', latestNotification.ticket_id)
        .single()

      if (ticketDetails) {
        console.log('\n🎫 TICKET DETAILS:')
        console.log(`🔢 Number: ${ticketDetails.ticket_number}`)
        console.log(`📝 Subject: ${ticketDetails.subject}`)
        console.log(`📧 Contact: ${ticketDetails.contact}`)
        console.log(`📊 Status: ${ticketDetails.status}`)
        console.log(`📅 Submitted: ${ticketDetails.submitted_date}`)
        console.log(`💬 Last Reply: ${ticketDetails.last_reply}`)
      }
    }

    // Group notifications by creation date to see patterns
    console.log('\n📊 RECENT NOTIFICATION PATTERNS:')
    console.log('=' .repeat(60))

    const dateGroups: { [key: string]: typeof latestTicketNotifications } = {}
    latestTicketNotifications.forEach(notification => {
      const date = notification.created_at.split('T')[0] // Get just the date part
      if (!dateGroups[date]) {
        dateGroups[date] = []
      }
      dateGroups[date].push(notification)
    })

    Object.entries(dateGroups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Sort by date descending
      .slice(0, 7) // Show last 7 days
      .forEach(([date, notifications]) => {
        console.log(`📅 ${date}: ${notifications.length} notifications`)
        
        // Show unique ticket_ids for this date
        const uniqueTickets = [...new Set(notifications.map(n => n.ticket_id))].filter(Boolean)
        if (uniqueTickets.length > 0) {
          console.log(`   🎫 Tickets: ${uniqueTickets.join(', ')}`)
        }

        // Check user_id patterns
        const nullUserIds = notifications.filter(n => n.user_id === null).length
        const validUserIds = notifications.filter(n => n.user_id !== null).length
        console.log(`   👤 user_id null: ${nullUserIds}, valid: ${validUserIds}`)
      })

    // Check for recent duplicates
    console.log('\n🔍 DUPLICATE ANALYSIS (Recent):')
    console.log('=' .repeat(60))

    const recentDuplicates: { [key: number]: number } = {}
    latestTicketNotifications.forEach(notification => {
      if (notification.ticket_id) {
        recentDuplicates[notification.ticket_id] = (recentDuplicates[notification.ticket_id] || 0) + 1
      }
    })

    const duplicateTickets = Object.entries(recentDuplicates)
      .filter(([, count]) => count > 1)
      .sort(([, countA], [, countB]) => countB - countA)

    if (duplicateTickets.length > 0) {
      console.log('🚨 Found duplicate notifications:')
      duplicateTickets.slice(0, 10).forEach(([ticketId, count]) => {
        console.log(`   Ticket ${ticketId}: ${count} notifications`)
      })
    } else {
      console.log('✅ No duplicates found in recent notifications')
    }

    // Get current time for comparison
    const now = new Date()
    const latestDate = new Date(latestNotification.created_at)
    const timeDifference = now.getTime() - latestDate.getTime()
    const hoursDifference = Math.round(timeDifference / (1000 * 60 * 60))

    console.log('\n⏰ TIME ANALYSIS:')
    console.log('=' .repeat(60))
    console.log(`🕐 Current time: ${now.toISOString()}`)
    console.log(`🕐 Latest notification: ${latestNotification.created_at}`)
    console.log(`⏳ Time difference: ${hoursDifference} hours ago`)

    return {
      success: true,
      latestNotification: {
        ...latestNotification,
        timeDifference: `${hoursDifference} hours ago`
      },
      summary: {
        totalRecent: latestTicketNotifications.length,
        latestDate: latestNotification.created_at,
        hoursAgo: hoursDifference,
        duplicateTickets: duplicateTickets.length,
        uniqueTicketsInRecent: [...new Set(latestTicketNotifications.map(n => n.ticket_id))].filter(Boolean).length,
        dateRange: {
          from: latestTicketNotifications[latestTicketNotifications.length - 1]?.created_at,
          to: latestNotification.created_at
        }
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
 * Get all notifications for a specific ticket to see the pattern
 */
export async function analyzeSpecificTicketNotifications(ticketId: number) {
  try {
    const supabase = await createClient()
    
    console.log(`🔍 Analyzing all notifications for ticket ${ticketId}...`)
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, user_id, created_at, is_read')
      .eq('ticket_id', ticketId)
      .eq('type', 'ticket_new_message')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!notifications || notifications.length === 0) {
      console.log(`📭 No notifications found for ticket ${ticketId}`)
      return { success: false, error: 'No notifications found' }
    }

    console.log(`\n🎫 TICKET ${ticketId} NOTIFICATION HISTORY:`)
    console.log('=' .repeat(60))
    console.log(`📊 Total notifications: ${notifications.length}`)

    notifications.forEach((notification, index) => {
      console.log(`[${index + 1}] ${notification.created_at} | ID: ${notification.id.slice(0, 8)}... | user_id: ${notification.user_id || 'NULL'} | read: ${notification.is_read}`)
    })

    return {
      success: true,
      ticketId,
      totalNotifications: notifications.length,
      notifications
    }

  } catch (error) {
    console.error('💥 Ticket analysis failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
