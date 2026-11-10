// Simple Presence Types - Only Online/Offline Status

export interface UserPresence {
  user_id: string;
  username: string;
  online_at: string;
}

export interface UsePresenceReturn {
  onlineUsers: Set<string>; // Set of online user IDs for fast lookup
  isOnline: (userId: string) => boolean;
  onlineCount: number;
  isConnected: boolean;
}
