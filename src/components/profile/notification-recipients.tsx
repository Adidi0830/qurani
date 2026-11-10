"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, UserPlus, Trash2 } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { SearchUser } from "@/utils/api/users/search"
import { getInitials } from "@/utils/helpers/get-initials"
import { useRouter } from "next/navigation"

interface NotificationRecipientsProps {
  recipients: SearchUser[]
  onAddClick: () => void
  onDeleteClick: (user: SearchUser) => void
  getAvatarUrl: (user: SearchUser) => string | undefined
}

export function NotificationRecipients({
  recipients,
  onAddClick,
  onDeleteClick,
  getAvatarUrl
}: NotificationRecipientsProps) {
  const { t } = useI18n()
  const router = useRouter()

  return (
    <div className="group py-4 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {t('profile.notification_recipients.title', 'Notification Recipients')}
            </Label>
          </div>
          {/* Desktop Add Button - Hidden on mobile */}
          <Button
            onClick={onAddClick}
            size="sm"
            className="hidden md:flex bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t('profile.notification_recipients.add_recipient', 'Add Recipient')}
          </Button>
        </div>

        {/* Selected Users Display */}
        <div className="space-y-3">
          {recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('profile.notification_recipients.no_recipients_selected', 'No notification recipients selected')}</p>
              <p className="text-xs">{t('profile.notification_recipients.add_people_description', 'Add people to receive notifications about your recitations')}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {recipients.map(user => ({ ...user ?? undefined })).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Link href={'/profile/' + user.username?.replace(/^@/, '')}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarUrl(user)} />
                        <AvatarFallback className="bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <p
                        className="font-medium text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                        onClick={() => router.push('/profile/' + user.username?.replace(/^@/, ''))}
                      >
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.username}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => onDeleteClick(user)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Add Button - Only visible on mobile, positioned at bottom */}
        <div className="md:hidden pt-2">
          <Button
            onClick={onAddClick}
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t('profile.notification_recipients.add_recipient', 'Add Recipient')}
          </Button>
        </div>
      </div>
    </div>
  )
}

