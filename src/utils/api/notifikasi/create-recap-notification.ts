"use server"

import { createClient } from "@/utils/supabase/server"
import { sendNotificationWithTemplate } from "./server"

export async function createRecapNotifications(recapId: number, reciterId: string) {
  try {
    
    const supabase = await createClient()
    // Get notification recipients for the reciter
    const { data: recipients, error: recipientsError } = await supabase
      .from('user_monitoring_records')
      .select('user_monitoring_id')
      .eq('user_id', reciterId)

    if (recipientsError) {
      console.error('Error fetching notification recipients:', recipientsError)
      return { success: false, error: recipientsError }
    }

    if (!recipients || recipients.length === 0) {
      return { success: true, message: 'No recipients to notify' }
    }

    // Get reciter name for push notification
    const { data: reciterProfile } = await supabase
      .from('user_profiles')
      .select('full_name, username')
      .eq('id', reciterId)
      .single()

    const reciterName = reciterProfile?.full_name || reciterProfile?.username || 'Seseorang'

    // Create notifications with push for each recipient
    const notificationResults = []
    for (const recipient of recipients) {
      try {
        
        // Gunakan template newRecap yang sudah adaa di insert.ts
        const result = await sendNotificationWithTemplate(
          'recap_notification',
          reciterId,
          recipient.user_monitoring_id,
          recapId,
          reciterName
        )
        
        notificationResults.push({
          recipientId: recipient.user_monitoring_id,
          success: true,
          result
        })
        
      } catch (error) {
        console.error(`❌ Failed to send notification to ${recipient.user_monitoring_id}:`, error)
        notificationResults.push({
          recipientId: recipient.user_monitoring_id,
          success: false,
          error: error
        })
      }
    }

    const successCount = notificationResults.filter(r => r.success).length
    const failCount = notificationResults.filter(r => !r.success).length
    

    return { 
      success: successCount > 0, 
      message: `Created ${successCount} notifications with push, ${failCount} failed`,
      count: successCount,
      results: notificationResults
    }

  } catch (error) {
    console.error('Error in createRecapNotifications:', error)
    return { success: false, error }
  }
}
