// Utility function for username validation (matches profile page logic)
export const validateUsername = (username: string) => {
    if (!username) return null

    // Remove @ prefix if present for validation
    const usernameWithoutAt = username.startsWith('@') ? username.slice(1) : username
    
    // Check for spaces
    if (usernameWithoutAt.includes(' ')) {
        return "Username cannot contain spaces. Use underscore (_) instead."
    }

    // Check for hyphens (not allowed)
    if (usernameWithoutAt.includes('-')) {
        return "Username cannot contain hyphens (-). Use underscore (_) instead."
    }

    // Check for valid characters (alphanumeric, underscore only)
    const validUsernameRegex = /^[a-zA-Z0-9_]+$/
    if (!validUsernameRegex.test(usernameWithoutAt)) {
        return "Username can only contain letters, numbers, and underscore (_)"
    }

    // Check minimum length
    if (usernameWithoutAt.length < 3) {
        return "Username must be at least 3 characters"
    }
    
    // Check maximum length
    if (usernameWithoutAt.length > 20) {
        return "Username must be at most 20 characters"
    }

    return null
}

export const normalizeUsername = (username: string) => {
    return username.toLowerCase().trim()
}
