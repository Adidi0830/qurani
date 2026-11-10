"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Crown, Edit, Shield, MoreVertical, Settings2, Trash2, LogOut, UserMinus } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { GroupDetail } from "@/types/grup"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useI18n } from "@/components/providers/i18n-provider"

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { leaveGrup } from "@/utils/api/grup/delete"
import { CATEGORY_LIST } from "@/data/categories-data"
import { groupsApi } from "@/lib/api"

interface GroupInfoHeaderProps {
  group: GroupDetail
  userRole?: "owner" | "admin" | "member"
  isOwner: boolean                         // konsisten dengan KelolaGrup
  onEditGroup?: () => void
  onDeleteGroup?: () => void
  isDeletingGroup?: boolean
  avatarPreview?: string | null
  onMembersDeleted?: () => void  // callback untuk refresh data setelah delete member
}

export function GroupInfoHeader({ group, userRole, isOwner, onEditGroup, onDeleteGroup, isDeletingGroup, avatarPreview, onMembersDeleted }: GroupInfoHeaderProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const categoryList = CATEGORY_LIST

  const divRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [shouldMargin, setShouldMargin] = useState<boolean>()
  const [isLeavingGroup, setIsLeavingGroup] = useState(false)

  // Delete member states
  const [isDeleteMemberDialogOpen, setIsDeleteMemberDialogOpen] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isDeletingMembers, setIsDeletingMembers] = useState(false)

  useEffect(() => {
    if (divRef.current) {
      setHeight(divRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (height < 170) {
      setShouldMargin(true)
    } else {
      setShouldMargin(false)
    }
  }, [height])
  // Generate avatar fallback
  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .filter(n => n.length > 0)
      .slice(0, 3)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "G"
  }

  // Sort members by role priority: owner -> admin -> member
  const getSortedMembers = () => {
    const roleOrder = { 'owner': 1, 'admin': 2, 'member': 3 }
    return [...group.grup_members].sort((a, b) => {
      return roleOrder[a.role] - roleOrder[b.role]
    })
  }

  // Generate CSS gradient colors for background when no profile image
  const generateLinearGradient = (name: string) => {
    const gradients = [
      '#667eea, #764ba2',
      '#f093fb, #f5576c',
      '#4facfe, #00f2fe',
      '#43e97b, #38f9d7',
      '#ffecd2, #fcb69f',
      '#a8edea, #fed6e3',
      '#ff9a9e, #fecfef',
      '#fdcbf1, #e6dee9'
    ]
    const index = name.length % gradients.length
    return gradients[index]
  }

  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const el = textRef.current;
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, []);

  const handleLeaveGroup = useCallback(async () => {
    setIsLeavingGroup(true)
    try {
      const result = await leaveGrup(group.id)
      if (result.status === 'success') {
        toast.success(t('kelola grup.leave_group.success', 'Successfully left the group'))
        router.push('/grup')
      } else {
        toast.error(t('kelola grup.leave_group.failed', 'Failed to leave the group'))
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      toast.error(t('kelola grup.leave_group.error', 'An error occurred while leaving the group'))
    } finally {
      setIsLeavingGroup(false)
    }
  }, [group.id, t, router])

  // Toggle member selection for delete
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  // Get deletable members (exclude owner)
  const getDeletableMembers = () => {
    return group.grup_members.filter(m => m.role !== 'owner')
  }

  // Handle delete selected members using MyQurani API
  const handleDeleteMembers = useCallback(async () => {
    if (selectedMemberIds.length === 0) {
      toast.error(t('grup detail.delete_member.no_selection', 'Please select at least one member to remove'))
      return
    }

    setIsDeletingMembers(true)

    try {
      // Use groupsApi.deleteMembers for batch deletion
      const result = await groupsApi.deleteMembers(group.id, selectedMemberIds)

      if (result.successCount > 0) {
        toast.success(
          t('grup detail.delete_member.success', '{count} member(s) removed successfully')
            .replace('{count}', String(result.successCount))
        )
        onMembersDeleted?.()  // Refresh data
      }

      if (result.failCount > 0) {
        toast.error(
          t('grup detail.delete_member.partial_fail', 'Failed to remove {count} member(s)')
            .replace('{count}', String(result.failCount))
        )
        // Log errors for debugging (use warn instead of error to avoid Next.js overlay)
        result.errors.forEach(error => console.warn('[Delete Member]', error))
      }

      setIsDeleteMemberDialogOpen(false)
      setSelectedMemberIds([])
    } catch (error: any) {
      console.error('Error deleting members:', error)
      toast.error(t('grup detail.delete_member.error', 'An error occurred while removing members'))
    } finally {
      setIsDeletingMembers(false)
    }
  }, [selectedMemberIds, group.id, t, onMembersDeleted])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 shadow-sm">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-transparent dark:from-emerald-900/20" />

      {/* Content - Single Row Layout */}
      <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Group Avatar */}
        <div className="relative shrink-0">
          <Avatar className="w-20 h-20 md:w-24 md:h-24 shadow-lg shadow-emerald-200/50 dark:shadow-none border-4 border-white dark:border-gray-900">
            <AvatarImage
              className="object-cover"
              src={avatarPreview ? avatarPreview : group.photo_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path}` : ""}
              alt={group.name}
            />
            <AvatarFallback className="bg-emerald-500 text-white font-bold text-2xl md:text-3xl">
              {getAvatarFallback(group.name)}
            </AvatarFallback>
          </Avatar>
          {/* Role Badge */}
          {userRole && (userRole === "owner" || userRole === "admin") && (
            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center ${userRole === "owner"
              ? "bg-amber-400 text-amber-900"
              : "bg-blue-500 text-white"
              }`}>
              {userRole === "owner" ? (
                <Crown className="w-3.5 h-3.5" />
              ) : (
                <Shield className="w-3.5 h-3.5" />
              )}
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold truncate pr-4 text-gray-900 dark:text-white">
              {group.name}
            </h1>
            {/* Actions Menu */}
            <div className="flex items-center gap-2">
              {group.category?.id && (
                <Badge variant="secondary" className="bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm hidden sm:inline-flex">
                  {categoryList.find((cat) => cat.id === Number(group.category?.id))?.name}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900 hover:bg-emerald-100/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-full">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Admin/Owner Actions - temporarily always visible for testing */}
                  <DropdownMenuItem onClick={onEditGroup}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('grup detail.manage.edit_group')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/grup/${group.id}/pengaturan-qurani`)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t('grup detail.manage.qurani_settings')}
                  </DropdownMenuItem>
                  {/* Delete Member - always visible for admin panel */}
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedMemberIds([])
                      setIsDeleteMemberDialogOpen(true)
                    }}
                    className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-900/10"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    {t('grup detail.delete_member.menu_title', 'Remove Members')}
                  </DropdownMenuItem>


                  {/* Delete Group - always visible for admin panel */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('kelola grup.delete_group.delete', 'Delete Group')}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('kelola grup.mistake_labels.confirm_delete', 'Confirm Group Deletion')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('kelola grup.mistake_labels.confirm_delete_description', 'Are you sure you want to delete this group? This action cannot be undone.').replace('{groupName}', group.name)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('kelola grup.delete_group.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={onDeleteGroup} className="bg-red-600 hover:bg-red-700">
                          {isDeletingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : t('kelola grup.mistake_labels.yes_delete', 'Delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Leave Group - always visible for admin panel */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10">
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('kelola grup.leave_group.leave_button', 'Leave Group')}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('grup detail.leave_group.dialog_title', 'Leave Group')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('grup detail.leave_group.dialog_description_before', 'Are you sure you want to leave')} <strong>{group.name}</strong>?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('grup detail.leave_group.no', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveGroup} disabled={isLeavingGroup} className="bg-red-600 hover:bg-red-700">
                          {t('grup detail.leave_group.yes', 'Yes, Leave')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Location & Description */}
          {(group.city_name || group.description) && (
            <p className="text-gray-600 dark:text-emerald-100 text-sm md:text-base max-w-2xl font-medium">
              {group.city_name && (
                <span>{group.city_name}{group.province_name ? ` • ${group.province_name}` : ''}</span>
              )}
              {group.city_name && group.description && <span className="text-emerald-400 mx-2">•</span>}
              {group.description && (
                <span ref={textRef} className={`${expanded ? "" : "line-clamp-1 inline"}`}>
                  {group.description}
                </span>
              )}
            </p>
          )}

          {/* Member Badges */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex -space-x-2">
              {getSortedMembers().slice(0, 4).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-white dark:border-emerald-900">
                  <AvatarImage src={member.user.avatar || ""} />
                  <AvatarFallback className="text-[8px] bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300">
                    {getAvatarFallback(member.user.name || "")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.grup_members.length > 4 && (
                <div className="h-6 w-6 rounded-full border-2 border-white dark:border-emerald-900 bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-[8px] font-medium text-emerald-600 dark:text-emerald-300">
                  +{group.grup_members.length - 4}
                </div>
              )}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              {group.grup_members.length} {t('grup detail.members.members_text', 'Members')}
            </span>
          </div>
        </div>
      </div>

      {/* Delete Member Dialog */}
      <Dialog open={isDeleteMemberDialogOpen} onOpenChange={setIsDeleteMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserMinus className="h-5 w-5" />
              {t('grup detail.delete_member.dialog_title', 'Remove Members')}
            </DialogTitle>
            <DialogDescription>
              {t('grup detail.delete_member.dialog_description', 'Select members to remove from this group. This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {getDeletableMembers().map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => toggleMemberSelection(member.id)}
                >
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selectedMemberIds.includes(member.id)}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                    className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                  />
                  <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                    <AvatarImage src={member.user.avatar || ""} />
                    <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm">
                      {getAvatarFallback(member.user.name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {member.user.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {member.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span>Member</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {getDeletableMembers().length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  {t('grup detail.delete_member.no_members', 'No members to remove')}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteMemberDialogOpen(false)}
              disabled={isDeletingMembers}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMembers}
              disabled={isDeletingMembers || selectedMemberIds.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDeletingMembers ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('common.processing', 'Processing...')}
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  {t('grup detail.delete_member.confirm_button', 'Remove')} ({selectedMemberIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
