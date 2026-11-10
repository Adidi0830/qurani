"use server"

import { generateId } from "@/lib/generateId";
import { createClient } from "@/utils/supabase/server";

export async function createReport(reportData: {
    violation: string;
    title: string;
    detail: string;
    evidence?: string | null; // bisa URL jika di-upload ke storage
    type?: string;
    group_id?: string;
    user_id?: string;
    status?: string; // optional, misalnya default: pending
  }) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "User not authenticated" };
  }

  const { error } = await supabase
    .from("reports")
    .insert([
        {
            id: generateId(),
            type: reportData.type || "group",
            violation: reportData.violation,
            report_title: reportData.title,
            report_detail: reportData.detail,
            evidence: reportData.evidence || null,
            group_id: reportData.group_id || null,
            user_id: reportData.user_id || null,
            report_by: user?.id,
            status: reportData.status || "pending",
        },
    ])
    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true, message: "Insert reports successfully" };
}

