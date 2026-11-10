"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { SearchUser } from "@/utils/api/users/search"

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userToDelete: SearchUser | null
  onConfirm: () => void
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  userToDelete,
  onConfirm
}: DeleteConfirmationDialogProps) {
  const { t } = useI18n()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            {t('profile.notification_recipients.delete_confirmation.title', 'Remove Notification Recipient')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('profile.notification_recipients.delete_confirmation.description', 'Are you sure you want to remove {name} from notification recipients?').replace('{name}', userToDelete?.name || '')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t('profile.notification_recipients.delete_confirmation.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('profile.notification_recipients.delete_confirmation.confirm', 'Yes, Remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

