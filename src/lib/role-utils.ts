export const ALL_PAGES = [
    "Dashboard", "Support", "Groups", "Billing", "Administrator",
    "Master Data", "Notifications", "Settings", "Profile", "My Qurani"
]

export const ROLE_META: Record<string, {
    pages: string[]
    gradient: string
    iconColor: string
    badgeColor: string
    isSystem?: boolean
}> = {
    admin: {
        pages: ALL_PAGES,
        gradient: "from-orange-400 to-red-500",
        iconColor: "text-orange-500",
        badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        isSystem: true,
    },
    billing: {
        pages: ["Dashboard", "Billing", "Notifications", "Settings", "Profile"],
        gradient: "from-emerald-400 to-teal-500",
        iconColor: "text-emerald-500",
        badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        isSystem: true,
    },
    member: {
        pages: ["Dashboard", "My Qurani", "Notifications", "Settings", "Profile"],
        gradient: "from-blue-400 to-indigo-500",
        iconColor: "text-blue-500",
        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        isSystem: false,
    },
    support: {
        pages: ["Dashboard", "Support", "Groups", "Notifications", "Settings", "Profile"],
        gradient: "from-purple-400 to-violet-500",
        iconColor: "text-purple-500",
        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        isSystem: false,
    },
}

export const DEFAULT_META = {
    pages: ["Dashboard", "Notifications", "Settings", "Profile"],
    gradient: "from-gray-400 to-slate-500",
    iconColor: "text-gray-500",
    badgeColor: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    isSystem: false,
}

export function getRoleMetaBase(name: string) {
    const key = name?.toLowerCase()?.trim()
    return ROLE_META[key] ?? DEFAULT_META
}

export function getSavedRolePages(roleName: string, defaultPages: string[]) {
    if (typeof window === "undefined") return defaultPages;
    const key = `role_pages_${roleName.toLowerCase().trim()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultPages;
}
