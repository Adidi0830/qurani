"use server";

/**
 * ============================================
 * Groups Fetch API (LEGACY - Supabase)
 * ============================================
 * API Source: Supabase (Local Database)
 * Status: DEPRECATED & DISABLED
 * 
 * Note: This file used to use Supabase. It has been disabled to force
 * migration to MyQurani API via `use-grup-data.ts`.
 * ============================================
 */

// import { createClient } from "../../supabase/server"; // DISABLED
import { Grup } from "@/types/grup";

type GrupMemberWithGrup = {
  grup: Grup;
};

export async function fetchGroups() {
  console.warn("Legacy fetchGroups called! This should not happen. Use useGroupsData hook instead.");
  return { status: "success", data: [] };
}

export async function fetchAllCategories() {
  console.warn("Legacy fetchAllCategories called! Use API instead.");
  return { status: "success", data: [] };
}

export async function fetchGroupBySearch(query: string) {
  console.warn("Legacy fetchGroupBySearch called!", query);
  return { status: "success", data: [] };
}

export async function fetchGroupById(groupId: string) {
  console.warn("Legacy fetchGroupById called!", groupId);
  return { status: "error", message: "Legacy API disabled" };
}

export async function fetchGroupMembers(groupId: string) {
  console.warn("Legacy fetchGroupMembers called!", groupId);
  return { status: "success", data: [] };
}

export async function fetchJoinedGroup(userId: string) {
  console.warn("Legacy fetchJoinedGroup called!", userId);
  return {
    success: true,
    message: "Legacy API disabled",
    data: [],
  };
}
