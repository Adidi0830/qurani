"use client"

import * as React from "react"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/components/providers/i18n-provider"
import { LogOut } from "lucide-react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

interface BtnLogoutProps {
    showDialog: boolean
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>
    text?: string
    desc?: string
    handleEvent: (status: boolean, router?: AppRouterInstance) => Promise<void>
    router?: AppRouterInstance
}

export const BtnLogout = React.memo(function BtnLogout({
    showDialog,
    setShowDialog,
    text = "Sign Out",
    desc = "",
    handleEvent,
    router
}: BtnLogoutProps) {
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)
    const { t } = useI18n()

    // Direct logout handler using server-side API
    const handleLogout = React.useCallback(async () => {
        setIsLoggingOut(true)
        setShowDialog(false)

        try {
            // Clear localStorage
            localStorage.removeItem('myqurani_auth')
            localStorage.removeItem('myqurani_access_token')
            localStorage.removeItem('myqurani_refresh_token')
            localStorage.removeItem('myqurani_user')
            localStorage.removeItem('autoNotificationDismissed')

            // Clear ticket cache
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('ticket_cache_') || key.startsWith('ticket_replies_')) {
                    localStorage.removeItem(key)
                }
            })

            // Call server-side logout API to clear httpOnly cookies
            await fetch('/api/auth/logout', { method: 'POST' })

            // Call the handleEvent for any additional cleanup
            await handleEvent(true, router)
        } catch (error) {
            console.error('Logout error:', error)
        }

        // Force redirect to login page
        window.location.href = '/login'
    }, [handleEvent, router, setShowDialog])

    const handleCancel = React.useCallback(() => {
        setShowDialog(false)
    }, [setShowDialog])

    return (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent className="dark:bg-gray-800">
                <AlertDialogHeader>
                    <AlertDialogTitle>{text}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {desc}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-row">
                    <AlertDialogCancel className="cursor-pointer flex-1" onClick={handleCancel}>
                        {t('cancel')}
                    </AlertDialogCancel>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2"
                    >
                        <LogOut className="w-4 h-4" />
                        {isLoggingOut ? 'Logging out...' : t('continue')}
                    </button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
})
