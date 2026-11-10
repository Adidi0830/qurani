"use server"

/**
 * Tickets Fetch API
 *
 * This module provides ticket fetching functions using the MyQurani API.
 * Supabase has been fully removed — all data comes from API Qurani.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// Types (kept same as before for compatibility)
// ============================================

export interface TicketListItem {
  id: number
  ticket_number: string
  subject: string
  contact: string
  department: string
  project: string | null
  service: string | null
  priority: string
  status: string
  last_reply: string | null
  submitted_date: string
  body: string | null
}

export interface TicketReply {
  id: number
  ticket_id: number
  author: string
  message: string
  date: string
  attachments: string | null
}

export interface TicketWithReplies extends TicketListItem {
  replies: TicketReply[]
}

// ============================================
// API Types from MyQurani
// ============================================

interface ApiTicketListDto {
  id: number;
  ticketKey: string;
  subject: string;
  email: string | null;
  name: string | null;
  status: number;
  statusName: string;
  priority: number;
  priorityName: string;
  department: number;
  assigned: number;
  date: string;
  lastReply: string | null;
  clientRead: number;
  adminRead: number;
  replyCount: number;
}

interface ApiTicketDetailDto {
  id: number;
  ticketKey: string;
  userId: number | null;
  email: string | null;
  name: string | null;
  department: number | null;
  priority: number;
  priorityName: string | null;
  status: number;
  statusName: string | null;
  service: string | null;
  subject: string;
  message: string | null;
  date: string;
  lastReply: string | null;
  clientRead: number;
  adminRead: number;
  replies: ApiTicketReplyDto[];
  attachments: ApiTicketAttachmentDto[];
}

interface ApiTicketReplyDto {
  id: number;
  ticketId: number;
  userId: number | null;
  name: string | null;
  email: string | null;
  message: string | null;
  admin: number | null;
  isStaffReply: boolean;
  date: string;
  attachments: ApiTicketAttachmentDto[] | null;
}

interface ApiTicketAttachmentDto {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

// ============================================
// Helper Functions
// ============================================

async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('myqurani_access_token')?.value || null;
  } catch {
    return null;
  }
}

// Map status name to number for API
function getStatusNumber(status?: string): number | undefined {
  if (!status || status === 'all') return undefined;
  const statusMap: Record<string, number> = {
    'Open': 1,
    'In Progress': 2,
    'Answered': 3,
    'On Hold': 4,
    'Closed': 5,
  };
  return statusMap[status];
}

// Map priority name to number for API
function getPriorityNumber(priority?: string): number | undefined {
  if (!priority || priority === 'all') return undefined;
  const priorityMap: Record<string, number> = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
  };
  return priorityMap[priority];
}

function getStatusName(status: number): string {
  const names: Record<number, string> = {
    1: 'Open',
    2: 'In Progress',
    3: 'Answered',
    4: 'On Hold',
    5: 'Closed',
  };
  return names[status] || 'Unknown';
}

function getPriorityName(priority: number): string {
  const names: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
  };
  return names[priority] || 'Medium';
}

// Convert API ticket to local format
function convertTicketListItem(apiTicket: ApiTicketListDto): TicketListItem {
  return {
    id: apiTicket.id,
    ticket_number: apiTicket.ticketKey,
    subject: apiTicket.subject,
    contact: apiTicket.name || apiTicket.email || 'Unknown',
    department: String(apiTicket.department), // Will be resolved via GET /api/v1/tickets/config/categories
    project: null,
    service: null,
    priority: apiTicket.priorityName || getPriorityName(apiTicket.priority),
    status: apiTicket.statusName || getStatusName(apiTicket.status),
    last_reply: apiTicket.lastReply,
    submitted_date: apiTicket.date,
    body: null,
  };
}

// Convert API ticket detail to local format
function convertTicketWithReplies(apiTicket: ApiTicketDetailDto): TicketWithReplies {
  return {
    id: apiTicket.id,
    ticket_number: apiTicket.ticketKey || `#${apiTicket.id}`,
    subject: apiTicket.subject || 'No Subject',
    contact: apiTicket.name || apiTicket.email || 'Unknown',
    department: String(apiTicket.department || ''),
    project: null,
    service: apiTicket.service,
    priority: apiTicket.priorityName || getPriorityName(apiTicket.priority),
    status: apiTicket.statusName || getStatusName(apiTicket.status),
    last_reply: apiTicket.lastReply,
    submitted_date: apiTicket.date,
    body: apiTicket.message,
    replies: (apiTicket.replies || []).map(reply => ({
      id: reply.id,
      ticket_id: reply.ticketId,
      author: reply.name || reply.email || (reply.isStaffReply ? 'Staff' : 'User'),
      message: reply.message || '',
      date: reply.date,
      attachments: reply.attachments
        ? JSON.stringify(reply.attachments.map(a => a.url))
        : null,
    })),
  };
}

// ============================================
// API Functions — Full API Qurani, no Supabase
// ============================================

export async function fetchTickets(filters?: {
  status?: string
  priority?: string
  department?: string
  search?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data?: TicketListItem[]; totalCount?: number; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    console.error('[fetchTickets] No auth token found');
    return { success: false, error: 'Not authenticated', data: [], totalCount: 0 };
  }

  try {
    const params = new URLSearchParams();

    const statusNum = getStatusNumber(filters?.status);
    const priorityNum = getPriorityNumber(filters?.priority);

    if (statusNum !== undefined) params.append('Status', String(statusNum));
    if (priorityNum !== undefined) params.append('Priority', String(priorityNum));
    if (filters?.search) params.append('Keyword', filters.search);

    // Pagination
    const page = filters?.offset !== undefined && filters?.limit !== undefined
      ? Math.floor(filters.offset / filters.limit) + 1
      : 1;
    const pageSize = filters?.limit || 10;

    params.append('Page', String(page));
    params.append('PageSize', String(pageSize));

    const url = `${API_BASE_URL}/api/v1/tickets${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[fetchTickets] Calling API:', url);

    const { fetchWithAutoRefresh } = await import('@/utils/api/token-refresh');

    let response: Response;
    try {
      response = await fetchWithAutoRefresh(url, { method: 'GET' });
    } catch (authError) {
      console.error('[fetchTickets] Auth error:', authError);
      return { success: false, error: 'Authentication required', data: [], totalCount: 0 };
    }

    const responseText = await response.text();
    console.log('[fetchTickets] Response status:', response.status);
    console.log('[fetchTickets] Response text:', responseText.substring(0, 300));

    if (!responseText || responseText.trim() === '') {
      console.log('[fetchTickets] Empty response from API');
      return { success: true, data: [], totalCount: 0 };
    }

    let rawResult: any;
    try {
      rawResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[fetchTickets] JSON parse error:', parseError);
      return { success: false, error: 'Invalid response format', data: [], totalCount: 0 };
    }

    if (!response.ok) {
      console.error('[fetchTickets] API error:', rawResult);
      return { success: false, error: rawResult.message || 'Failed to fetch tickets', data: [], totalCount: 0 };
    }

    // Handle different response structures (MyQurani API patterns)
    let ticketData: ApiTicketListDto[] = [];
    let totalCount = 0;

    const rData = rawResult.data || rawResult;

    if (Array.isArray(rData)) {
      ticketData = rData;
      totalCount = rawResult.totalCount || rData.length;
    } else if (rData && typeof rData === 'object') {
      ticketData = rData.items || rData.data || (Array.isArray(rData) ? rData : []);
      totalCount =
        rData.totalCount || rData.TotalCount ||
        rData.total || rData.Total ||
        rData.count ||
        rawResult.totalCount || rawResult.TotalCount ||
        (Array.isArray(ticketData) ? ticketData.length : 0);
    }

    console.log('[fetchTickets] Parsed:', ticketData.length, 'tickets, total:', totalCount);

    const apiTickets = ticketData.map(convertTicketListItem);

    return {
      success: true,
      data: apiTickets,
      totalCount,
    };
  } catch (error) {
    console.error('[fetchTickets] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [], totalCount: 0 };
  }
}

export async function fetchTicketById(ticketId: number): Promise<{ success: boolean; data?: TicketWithReplies; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('[fetchTicketById] HTTP error:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();

    // Handle different response formats:
    // 1. { success: true, data: {...} }
    // 2. { data: {...} }
    // 3. Direct object: {...}
    const ticketData = result.data || result;

    if (!ticketData || typeof ticketData !== 'object') {
      console.error('[fetchTicketById] Invalid data format:', result);
      return { success: false, error: 'Invalid response format' };
    }

    return {
      success: true,
      data: convertTicketWithReplies(ticketData),
    };
  } catch (error) {
    console.error('[fetchTicketById] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchRelatedTickets(excludeId: number): Promise<{ success: boolean; data?: TicketListItem[]; error?: string }> {
  const result = await fetchTickets({ limit: 200 });
  if (!result.success || !result.data) return result;

  const current = result.data.find(t => t.id === excludeId);
  const pool = result.data.filter(t => t.id !== excludeId);

  // Fallback when current ticket isn't in this page of data.
  if (!current) {
    return { success: true, data: pool.slice(0, 8) };
  }

  const normalize = (val: string | null | undefined) => (val || "").trim().toLowerCase();
  const keywords = normalize(current.subject).split(/\s+/).filter(w => w.length >= 4);

  const scored = pool.map((t) => {
    let score = 0;
    if (normalize(t.department) && normalize(t.department) === normalize(current.department)) score += 5;
    if (normalize(t.contact) && normalize(t.contact) === normalize(current.contact)) score += 3;
    if (normalize(t.priority) && normalize(t.priority) === normalize(current.priority)) score += 1;

    const subject = normalize(t.subject);
    const keywordHit = keywords.some((k) => subject.includes(k));
    if (keywordHit) score += 1;

    return { ticket: t, score };
  });

  const related = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.ticket.submitted_date).getTime() - new Date(a.ticket.submitted_date).getTime();
    })
    .map((item) => item.ticket)
    .slice(0, 8);

  return { success: true, data: related };
}

export async function fetchTicketStats(): Promise<{
  success: boolean
  data?: {
    total: number
    open: number
    in_progress: number
    answered: number
    on_hold: number
    closed: number
  }
  error?: string
}> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Fetch all status counts in parallel
    const statusCounts = await Promise.all([
      fetchTickets({ status: 'Open', limit: 1 }),
      fetchTickets({ status: 'In Progress', limit: 1 }),
      fetchTickets({ status: 'Answered', limit: 1 }),
      fetchTickets({ status: 'On Hold', limit: 1 }),
      fetchTickets({ status: 'Closed', limit: 1 }),
      fetchTickets({ limit: 1 }), // Total
    ]);

    return {
      success: true,
      data: {
        open: statusCounts[0].totalCount || 0,
        in_progress: statusCounts[1].totalCount || 0,
        answered: statusCounts[2].totalCount || 0,
        on_hold: statusCounts[3].totalCount || 0,
        closed: statusCounts[4].totalCount || 0,
        total: statusCounts[5].totalCount || 0,
      },
    };
  } catch (error) {
    console.error('[fetchTicketStats] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchTicketHeaderById(ticketId: number): Promise<{ success: boolean; data?: TicketListItem; error?: string }> {
  const result = await fetchTicketById(ticketId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Convert to TicketListItem format
  const { replies, ...ticketData } = result.data;
  return {
    success: true,
    data: ticketData,
  };
}

export async function fetchTicketRepliesPage(ticketId: number, limit: number, offset: number): Promise<{ success: boolean; data?: TicketReply[]; error?: string }> {
  const result = await fetchTicketById(ticketId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Paginate replies locally (API returns all replies)
  const paginatedReplies = result.data.replies.slice(offset, offset + limit);

  return {
    success: true,
    data: paginatedReplies,
  };
}
