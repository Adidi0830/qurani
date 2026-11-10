"use client"

import * as React from "react"

// Context untuk berbagi state dropdown
const SidebarDropdownContext = React.createContext<{
    isDropdownOpen: boolean
    setIsDropdownOpen: (open: boolean) => void
} | null>(null)

export const useSidebarDropdown = () => {
    const context = React.useContext(SidebarDropdownContext)
    if (!context) {
        throw new Error("useSidebarDropdown must be used within SidebarDropdownProvider")
    }
    return context
}

export const SidebarDropdownProvider = ({
    children,
    value
}: {
    children: React.ReactNode
    value: {
        isDropdownOpen: boolean
        setIsDropdownOpen: (open: boolean) => void
    }
}) => {
    return (
        <SidebarDropdownContext.Provider value={value}>
            {children}
        </SidebarDropdownContext.Provider>
    )
}
