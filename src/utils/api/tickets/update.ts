"use server"

/**
 * Tickets Update API
 *
 * This module provides ticket update functions using the MyQurani API.
 * Supabase has been fully removed.
 * Note: project/service fields are not supported by API Qurani and have been removed.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

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
function getStatusNumber(status: string): number {
  const statusMap: Record<string, number> = {
    'Open': 1,
    'In Progress': 2,
    'Answered': 3,
    'On Hold': 4,
    'Closed': 5,
  };
  return statusMap[status] || 1;
}

// Map priority name to number for API
function getPriorityNumber(priority: string): number {
  const priorityMap: Record<string, number> = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
  };
  return priorityMap[priority] || 2;
}

// ============================================
// API Functions
// ============================================

export async function updateTicketStatus(
  ticketId: number,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    console.log('[updateTicketStatus] Updating ticket', ticketId, 'status to', status);

    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: getStatusNumber(status),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[updateTicketStatus] API error:', result);
      return { success: false, error: result.message || 'Failed to update status' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateTicketStatus] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateTicketPriority(
  ticketId: number,
  priority: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    console.log('[updateTicketPriority] Updating ticket', ticketId, 'priority to', priority);

    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}/priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        priority: getPriorityNumber(priority),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[updateTicketPriority] API error:', result);
      return { success: false, error: result.message || 'Failed to update priority' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateTicketPriority] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateTicket(
  ticketId: number,
  updates: {
    status?: string
    priority?: string
  }
): Promise<{ success: boolean; error?: string }> {
  // Handle each update type separately since API has separate endpoints
  let hasError = false;
  let errorMessage = '';

  if (updates.status) {
    const result = await updateTicketStatus(ticketId, updates.status);
    if (!result.success) {
      hasError = true;
      errorMessage = result.error || 'Failed to update status';
    }
  }

  if (updates.priority) {
    const result = await updateTicketPriority(ticketId, updates.priority);
    if (!result.success) {
      hasError = true;
      errorMessage = result.error || 'Failed to update priority';
    }
  }

  return hasError ? { success: false, error: errorMessage } : { success: true };
}

export async function bulkUpdateTickets(
  ticketIds: number[],
  updates: {
    status?: string
    priority?: string
  }
): Promise<{ success: boolean; error?: string }> {
  // Process updates for each ticket
  const results = await Promise.all(
    ticketIds.map(id => updateTicket(id, updates))
  );

  const failed = results.filter(r => !r.success);

  if (failed.length > 0) {
    return {
      success: false,
      error: `Failed to update ${failed.length} of ${ticketIds.length} tickets`,
    };
  }

  return { success: true };
}
