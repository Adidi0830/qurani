import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cleanupDuplicateNotifications, cleanupNullUserNotifications } from "@/utils/database/cleanup-notifications";

/**
 * Admin-only API endpoint to cleanup notification duplicates
 * POST /api/admin/cleanup-notifications
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Parse request body to determine cleanup type
    const body = await request.json();
    const { type = 'all' } = body;

    const results: {
      duplicates?: { success: boolean; duplicatesRemoved: number; details?: string; error?: string };
      nullUsers?: { success: boolean; nullNotificationsRemoved: number; error?: string };
    } = {};

    // Cleanup duplicate notifications
    if (type === 'all' || type === 'duplicates') {
      console.log('🧹 Starting duplicate notifications cleanup...');
      const duplicateResult = await cleanupDuplicateNotifications();
      results.duplicates = duplicateResult;
    }

    // Cleanup null user_id notifications
    if (type === 'all' || type === 'nullusers') {
      console.log('🧹 Starting null user notifications cleanup...');
      const nullUserResult = await cleanupNullUserNotifications();
      results.nullUsers = nullUserResult;
    }

    // Summary
    const summary = {
      duplicatesRemoved: results.duplicates?.duplicatesRemoved || 0,
      nullNotificationsRemoved: results.nullUsers?.nullNotificationsRemoved || 0,
      totalCleaned: (results.duplicates?.duplicatesRemoved || 0) + (results.nullUsers?.nullNotificationsRemoved || 0)
    };

    console.log(`✅ Cleanup completed. Total cleaned: ${summary.totalCleaned} notifications`);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      summary,
      details: results
    });

  } catch (error) {
    console.error('💥 Cleanup API error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * Get cleanup statistics without performing cleanup
 * GET /api/admin/cleanup-notifications
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role (same as POST)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get statistics about notifications that would be cleaned
    const { data: allNotifications } = await supabase
      .from('notifications')
      .select('id, user_id, ticket_id, type, created_at')
      .eq('type', 'ticket_new_message');

    const { data: nullUserNotifications } = await supabase
      .from('notifications')
      .select('id')
      .is('user_id', null);

    // Group by ticket_id and user_id to find duplicates
    const grouped: { [key: string]: Array<{ id: string; user_id: string; ticket_id: number; type: string; created_at: string }> } = {};
    
    (allNotifications || []).forEach(notification => {
      const key = `${notification.ticket_id}_${notification.user_id}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(notification);
    });

    const duplicateGroups = Object.entries(grouped).filter(([, group]) => group.length > 1);
    const totalDuplicates = duplicateGroups.reduce((sum, [, group]) => sum + (group.length - 1), 0);

    const statistics = {
      totalTicketNotifications: allNotifications?.length || 0,
      duplicateGroups: duplicateGroups.length,
      duplicatesToRemove: totalDuplicates,
      nullUserNotifications: nullUserNotifications?.length || 0,
      wouldClean: totalDuplicates + (nullUserNotifications?.length || 0)
    };

    return NextResponse.json({
      success: true,
      statistics,
      message: `Found ${statistics.wouldClean} notifications that can be cleaned`
    });

  } catch (error) {
    console.error('💥 Statistics API error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
