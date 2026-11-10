/**
 * Get user avatar with priority logic:
 * 1. profile_user (custom uploaded avatar)
 * 2. Google profile picture
 * 3. Generated avatar based on name
 */
export function getUserAvatar(
  profileUser: string | null | undefined,
  googleProfile: string | null | undefined,
  userName: string,
  useProxy: boolean = true
): string {
  // Priority 1: Custom uploaded profile_user
  if (profileUser) {
    // If it's a relative path, assume it's in Supabase storage
    if (!profileUser.startsWith("http")) {
      // You might need to build the full Supabase URL here
      // For now, return as-is and let the avatar component handle it
      return profileUser;
    }
    return profileUser;
  }

  // Priority 2: Google profile picture with proxy
  if (googleProfile) {
    if (useProxy && googleProfile.includes("googleusercontent.com")) {
      return `/api/proxy-avatar?url=${encodeURIComponent(googleProfile)}`;
    }
    return googleProfile;
  }

  // Priority 3: Generated avatar based on name
  return generateAvatarFromName(userName);
}

/**
 * Generate a beautiful avatar URL based on user name
 */
function generateAvatarFromName(name: string): string {
  if (!name) return generateAvatarFromName("Unknown User");

  // Using DiceBear API for consistent, beautiful avatars
  const seed = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&chars=2&backgroundColor=6366f1,8b5cf6,06b6d4,10b981,f59e0b,ef4444&textColor=ffffff&fontFamily=Arial&fontSize=36`;
}
