import { createClient } from '@/utils/supabase/client'

/**
 * Get full avatar URL from avatar path
 * @param avatarPath - The avatar path from database (can be null/undefined)
 * @returns Full URL or null if no avatar
 */
export function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null
  
  // If it's already a full URL, handle accordingly
  if (avatarPath.startsWith('http')) {
    // If it's a Google avatar, use proxy
    if (avatarPath.includes('googleusercontent.com')) {
      return `/api/proxy-avatar?url=${encodeURIComponent(avatarPath)}`
    }
    // Otherwise return as is
    return avatarPath
  }
  
  // Get Supabase client to build the URL
  const supabase = createClient()
  
  try {
    // Try different bucket names that might be used
    const possibleBuckets = ['avatars', 'avatar', 'user-avatars', 'profile-images']
    
    for (const bucket of possibleBuckets) {
      try {
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(avatarPath)
        
        // If we get a valid URL, return it
        if (data.publicUrl && data.publicUrl !== avatarPath) {
          return data.publicUrl
        }
      } catch {
        // Continue to next bucket
        continue
      }
    }
    
    // If no bucket works, return original path
    return avatarPath
  } catch (error) {
    console.error('Error building avatar URL:', error)
    return avatarPath // Return the original path as fallback
  }
}

/**
 * Generate a deterministic avatar URL based on user name
 * @param name - User's name
 * @returns URL for generated avatar
 */
export function generateAvatarUrl(name: string): string {
  // Using DiceBear API for generated avatars
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&chars=2&backgroundColor=6366f1,8b5cf6,06b6d4,10b981,f59e0b,ef4444&textColor=ffffff`
}

/**
 * Get avatar URL with fallback handling
 * @param avatarPath - The avatar path from database
 * @param userName - User's name for fallback generation
 * @param fallbackUrl - Optional fallback URL
 * @returns Avatar URL or fallback
 */
export function getAvatarUrlWithFallback(
  avatarPath: string | null | undefined, 
  userName?: string,
  fallbackUrl?: string
): string | null {
  const url = getAvatarUrl(avatarPath)
  
  if (url) return url
  if (fallbackUrl) return fallbackUrl
  if (userName) return generateAvatarUrl(userName)
  
  return null
}
