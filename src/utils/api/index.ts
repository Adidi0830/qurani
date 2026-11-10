/**
 * ============================================
 * API UTILS INDEX
 * ============================================
 * 
 * This file provides an overview of all API utility modules
 * and their data sources.
 * 
 * ============================================
 * API SOURCE LEGEND:
 * ============================================
 * 
 * [MYQURANI] = MyQurani API (https://api.myqurani.com)
 *              - Online REST API for production
 *              - Authentication via Bearer token
 * 
 * [SUPABASE] = Supabase Local Database
 *              - Used for legacy features
 *              - Should be migrated to MyQurani API
 * 
 * [MIXED]    = Uses both MyQurani API and Supabase
 *              - In transition period
 * 
 * ============================================
 * FOLDER STRUCTURE:
 * ============================================
 * 
 * admin/dashboard/     [SUPABASE] Admin dashboard statistics
 * categories/          [SUPABASE] Category management
 * city/                [MYQURANI] City data (location)
 * countries/           [MYQURANI] Country data (location)
 * friends/             [SUPABASE] Friends/contacts
 * grup/                [MIXED]    Group management
 *   - fetch.ts         [SUPABASE] Legacy group fetching
 *   - insert.ts        [MYQURANI] Create/join/leave groups
 *   - delete.ts        [SUPABASE] Delete groups
 *   - update.ts        [SUPABASE] Update groups
 *   - members.ts       [SUPABASE] Member management
 *   - invitation-links [SUPABASE] Invitation links
 * 
 * notifikasi/          [SUPABASE] Notification management
 * quran/               [SUPABASE] Quran data
 * recaps/              [MYQURANI] Setoran/Recitation data
 *   - fetch.ts         [MYQURANI] Fetch setoran sessions
 *   - insert.ts        [SUPABASE] Create setoran
 * 
 * reports/             [SUPABASE] Report management
 * setting global/      [SUPABASE] Global settings
 * setting group/       [SUPABASE] Group settings
 * setting-user/        [SUPABASE] User settings
 * states/              [MYQURANI] State/Province data
 * statistik/           [SUPABASE] Statistics
 * tickets/             [MYQURANI] Support tickets
 *   - fetch.ts         [MYQURANI] Fetch tickets
 *   - insert.ts        [MYQURANI] Create tickets & replies
 *   - delete.ts        [MYQURANI] Delete tickets
 *   - update.ts        [MYQURANI] Update tickets
 *   - upload.ts        [MYQURANI] Upload attachments
 * 
 * user/                [MIXED]    User profile
 * users/               [SUPABASE] User management
 * 
 * ============================================
 * MAIN API CLIENT:
 * ============================================
 * 
 * For MyQurani API, the main client is in:
 * - /src/lib/api.ts
 * 
 * Available API objects:
 * - authApi       - Authentication (login, register, logout)
 * - profileApi    - User profile management
 * - ticketsApi    - Support tickets
 * - setoranApi    - Setoran/Recitation
 * - groupsApi     - Group management (NEW)
 * 
 * ============================================
 */

// Re-export commonly used functions
// (Add exports as needed)

export const API_SOURCES = {
    MYQURANI: 'MyQurani API (https://api.myqurani.com)',
    SUPABASE: 'Supabase Local Database',
    MIXED: 'Both MyQurani API and Supabase',
} as const;
