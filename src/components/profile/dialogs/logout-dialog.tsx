"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { LogOut } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

interface LogoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (status: boolean) => void
}

export function LogoutDialog({
  open,
  onOpenChange,
  onConfirm
}: LogoutDialogProps) {
  const { t } = useI18n()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('profile.logout_dialog.title', 'Are You Sure?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('profile.logout_dialog.description', 'If you want to sign out, make sure all changes have been saved.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row justify-between gap-3">
          <AlertDialogCancel onClick={() => onConfirm(false)} className="flex-1">
            {t('common.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(true)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('profile.logout', 'Logout')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

