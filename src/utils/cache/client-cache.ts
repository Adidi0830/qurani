// Client-side cache utilities for browser storage

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = 1000 * 60 * 15; // 15 minutes
const CACHE_PREFIX = 'qurani_cache_';

export class ClientCache {
  private static storage: Storage | null = null;

  private static getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    if (!this.storage) {
      try {
        this.storage = window.localStorage;
      } catch {
        // Fallback to in-memory storage if localStorage is not available
        this.storage = null;
      }
    }
    return this.storage;
  }

  private static getKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  static get<T>(key: string): T | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const item = storage.getItem(this.getKey(key));
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);
      
      // Check if expired
      if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  static set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      
      storage.setItem(this.getKey(key), JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  static remove(key: string): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.removeItem(this.getKey(key));
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  static clear(): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  static isExpired(key: string): boolean {
    const storage = this.getStorage();
    if (!storage) return true;

    try {
      const item = storage.getItem(this.getKey(key));
      if (!item) return true;

      const cacheItem: CacheItem<unknown> = JSON.parse(item);
      return Date.now() - cacheItem.timestamp > cacheItem.ttl;
    } catch {
      return true;
    }
  }

  static getRemainingTTL(key: string): number {
    const storage = this.getStorage();
    if (!storage) return 0;

    try {
      const item = storage.getItem(this.getKey(key));
      if (!item) return 0;

      const cacheItem: CacheItem<unknown> = JSON.parse(item);
      const remaining = cacheItem.ttl - (Date.now() - cacheItem.timestamp);
      return Math.max(0, remaining);
    } catch {
      return 0;
    }
  }

  static getTimestamp(key: string): number | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const item = storage.getItem(this.getKey(key));
      if (!item) return null;

      const cacheItem: CacheItem<unknown> = JSON.parse(item);
      return cacheItem.timestamp;
    } catch {
      return null;
    }
  }

  // Invalidate user groups cache (useful when group membership changes)
  static invalidateUserGroupsCache(userId: string): void {
    const key = CACHE_KEYS.USER_GROUPS(userId);
    this.remove(key);
  }
}

// Specific cache keys for different data types
export const CACHE_KEYS = {
  USER_GROUPS: (userId: string) => `user_groups_${userId}`,
  GROUP_DETAILS: (groupId: string) => `group_details_${groupId}`,
  GROUP_MEMBERS: (groupId: string) => `group_members_${groupId}`,
} as const;

// Cache TTL configurations
export const CACHE_TTL = {
  USER_GROUPS: 1000 * 60 * 15, // 15 minutes
  GROUP_DETAILS: 1000 * 60 * 10, // 10 minutes
  GROUP_MEMBERS: 1000 * 60 * 5, // 5 minutes
} as const;
