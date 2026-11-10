"use client"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Search, UserPlus, X, Check, Plus } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { SearchUser } from "@/utils/api/users/search"
import { getInitials } from "@/utils/helpers/get-initials"
import { cn } from "@/lib/utils"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: SearchUser[]
  isSearching: boolean
  recipients: SearchUser[]
  onAddUser: (user: SearchUser) => void
  getAvatarUrl: (user: SearchUser) => string | undefined
}

export function AddUserDialog({
  open,
  onOpenChange,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  recipients,
  onAddUser,
  getAvatarUrl
}: AddUserDialogProps) {
  const { t } = useI18n()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md dark:bg-gray-800">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              {t('profile.notification_recipients.add_notification_recipient', 'Add Notification Recipient')}
            </AlertDialogTitle>
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('profile.notification_recipients.search_placeholder', 'Search by name or username...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                <span className="ml-2 text-sm text-muted-foreground">{t('profile.notification_recipients.searching', 'Searching...')}</span>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('profile.notification_recipients.no_users_found', 'No users found')}</p>
                <p className="text-xs">{t('profile.notification_recipients.try_different_term', 'Try searching with a different term')}</p>
              </div>
            ) : searchQuery === "" ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('profile.notification_recipients.start_typing', 'Start typing to search for users')}</p>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('profile.notification_recipients.type_at_least_2', 'Type at least 2 characters to search')}</p>
              </div>
            ) : (
              searchResults.map((user) => {
                const isAlreadySelected = recipients.some(u => u.id === user.id)
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                      isAlreadySelected
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 opacity-60"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarUrl(user)} />
                        <AvatarFallback className="bg-slate-100 dark:bg-slate-700">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.username}</p>
                      </div>
                    </div>
                    {isAlreadySelected ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddUser(user)
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

