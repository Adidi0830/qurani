
// Navigation cache utilities
// Used to distinguish between sidebar navigation vs page refresh

const NAVIGATION_FLAG_KEY = 'qurani-sidebar-navigation';

/**
 * Mark that the next navigation is from sidebar/programmatic navigation
 * This helps cache system distinguish between navigation vs page refresh
 */
export function markSidebarNavigation(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(NAVIGATION_FLAG_KEY, 'true');
    } catch (error) {
      console.warn('Failed to set navigation flag:', error);
    }
  }
}

/**
 * Check if current page load is from sidebar navigation
 */
export function isSidebarNavigation(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const flag = sessionStorage.getItem(NAVIGATION_FLAG_KEY);
    return flag === 'true';
  } catch (error) {
    console.warn('Failed to check navigation flag:', error);
    return false;
  }
}

/**
 * Clear navigation flag (used internally by cache system)
 */
export function clearNavigationFlag(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(NAVIGATION_FLAG_KEY);
    } catch (error) {
      console.warn('Failed to clear navigation flag:', error);
    }
  }
}
