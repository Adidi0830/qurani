import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { analyzeNotificationsStructure, getCurrentAdminUsers } from "@/utils/database/analyze-notifications";

/**
 * Admin-only API endpoint to analyze notifications table structure
 * GET /api/admin/analyze-notifications
 */
export async function GET() {
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

    console.log('🔍 Starting notifications table analysis...');

    // Run analysis
    const [analysisResult, adminResult] = await Promise.all([
      analyzeNotificationsStructure(),
      getCurrentAdminUsers()
    ]);

    if (!analysisResult.success) {
      return NextResponse.json({
        error: "Analysis failed",
        details: analysisResult.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notifications analysis completed - check server logs for detailed output",
      summary: analysisResult.analysis,
      currentAdmins: adminResult.admins,
      adminCount: adminResult.count,
      recommendations: analysisResult.analysis ? generateRecommendations(analysisResult.analysis, adminResult.count) : []
    });

  } catch (error) {
    console.error('💥 Analysis API error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

function generateRecommendations(analysis: {
  totalNotifications: number;
  typeBreakdown: Array<{
    type: string;
    count: number;
    nullUserIds: number;
    validUserIds: number;
  }>;
  duplicateTickets: number;
  ticketNotificationPattern: {
    totalTicketNotifications: number;
    uniqueTicketIds: number;
    nullUserIdPercentage: number;
  } | null;
}, adminCount: number) {
  const recommendations = [];

  if (!analysis.ticketNotificationPattern) {
    recommendations.push("No ticket notifications found in recent data");
    return recommendations;
  }

  const { nullUserIdPercentage, totalTicketNotifications, uniqueTicketIds } = analysis.ticketNotificationPattern;

  if (nullUserIdPercentage > 80) {
    recommendations.push("🚨 MAJOR ISSUE: Most ticket notifications have user_id = null");
    recommendations.push("💡 SOLUTION: Remove user_id filtering for ticket notifications");
    recommendations.push("💡 SOLUTION: Create single notification per ticket, not per admin");
  } else if (nullUserIdPercentage > 20) {
    recommendations.push("⚠️ MIXED PATTERN: Some ticket notifications have user_id, some don't");
    recommendations.push("💡 SOLUTION: Standardize notification creation logic");
  } else {
    recommendations.push("✅ Good: Most ticket notifications have valid user_id");
  }

  const avgNotificationsPerTicket = totalTicketNotifications / uniqueTicketIds;
  if (avgNotificationsPerTicket > adminCount + 1) {
    recommendations.push(" DUPLICATION: Too many notifications per ticket");
    recommendations.push(" SOLUTION: Implement better duplicate prevention");
  }

  if (uniqueTicketIds < totalTicketNotifications / 2) {
    recommendations.push("📊 INFO: Many tickets have multiple notifications");
    if (nullUserIdPercentage > 50) {
      recommendations.push("💡 SUGGESTED APPROACH: One notification per ticket (no user_id filtering)");
    } else {
      recommendations.push("💡 SUGGESTED APPROACH: One notification per admin per ticket");
    }
  }

  return recommendations;
}
