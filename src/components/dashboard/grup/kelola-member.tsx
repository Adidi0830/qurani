"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Crown,
  UserMinus,
  Shield,
  ShieldOff,
  Search,
  Copy,
  Bell,
  BellOff,
  Loader2,
  QrCode,
  Maximize2,
  X
} from "lucide-react"
import { toast } from "sonner"
import { generateInvitationLink } from "@/utils/api/grup/invitation-links"
import { useI18n } from "@/components/providers/i18n-provider"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useInviteSearch } from "@/hooks/use-invite-search"
import { useGroupMembers, useGroupMemberMutations } from "@/hooks/use-group-members"
import { InviteUser, clearInviteSearchCache } from "@/utils/api/grup/searchForInvite"
import { RequestJoin, useRequestJoinGrup } from "@/hooks/use-request-join-grup"
import { GroupDetail } from "@/types/grup"
import { QRCodeCanvas } from "qrcode.react"

interface KelolaMemberProps {
  groupId: string
  isOwner: boolean
  group: GroupDetail
}

export function KelolaMember({ groupId, isOwner, group }: KelolaMemberProps) {
  const { t } = useI18n()
  const { userId } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteUsername, setInviteUsername] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [modalRemoveOpen, setModalRemoveOpen] = useState(false)
  const [memberIdToRemove, setMemberIdToRemove] = useState<string>("")
  const [typeEvent, setTypeEvent] = useState<"promote" | "demote" | "remove" | "">("")
  const [buttonLoading, setButtonLoading] = useState(false)
  const [buttonLoadingQr, setButtonLoadingQr] = useState(false)
  const [openDialogRequest, setOpenDialogRequest] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const router = useRouter()
  const [openDialogQr, setOpenDialogQr] = useState(false)
  const [openQrFullScren, setOpenQrFullScren] = useState(false)
  // Use SWR hooks for members data and mutations
  const { members, isLoading: isLoadingMembers, refresh: refreshMembers } = useGroupMembers(groupId, userId)
  const { promoteMember, demoteMember, removeMember, inviteMember } = useGroupMemberMutations(groupId, userId)
  const [inviteLink, setInviteLink] = useState("")
  const [qrSize, setQrSize] = useState(200);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        // sm breakpoint kebawah
        setQrSize(200);
      } else {
        // sm keatas
        setQrSize(500);
      }
    };

    updateSize(); // panggil saat pertama kali render
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (openQrFullScren) {
      // Matikan scroll di body
      document.body.style.overflow = "hidden";
    } else {
      // Kembalikan scroll normal
      document.body.style.overflow = "";
    }

    // Pastikan dikembalikan lagi kalau komponen unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [openQrFullScren]);

  // Search functionality
  const { users: searchUsers, isLoading: isSearchingUsers, hasResults } = useInviteSearch(
    inviteUsername,
    groupId,
    { enabled: isInviteModalOpen && inviteUsername.length >= 2 }
  )

  const {
    requests,
    refresh
  } = useRequestJoinGrup({ groupId: groupId })

  // Handler untuk accept join request
  const handleAcceptRequest = async (requestId: string, requesterUserId: string) => {
    if (!userId) return

    setProcessingRequestId(requestId)
    try {
      const response = await fetch("/api/grup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "acceptJoinRequest",
          userId: userId,
          groupId: groupId,
          requestId: requestId,
          requesterUserId: requesterUserId,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to accept join request")
      }

      toast.success(t('kelola grup.toast.accept_success', 'Join request accepted successfully'))

      // Refresh requests and members data
      await Promise.all([
        refresh(),
        refreshMembers()
      ])
    } catch (error) {
      console.error("Error accepting join request:", error)
      toast.error(t('kelola grup.toast.accept_error', 'Failed to accept join request'))
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Handler untuk reject join request
  const handleRejectRequest = async (requestId: string) => {
    if (!userId) return

    setProcessingRequestId(requestId)
    try {
      const response = await fetch("/api/grup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "rejectJoinRequest",
          userId: userId,
          groupId: groupId,
          requestId: requestId,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to reject join request")
      }

      toast.success(t('kelola grup.toast.reject_success', 'Join request rejected successfully'))

      // Refresh requests data
      await refresh()
    } catch (error) {
      console.error("Error rejecting join request:", error)
      toast.error(t('kelola grup.toast.reject_error', 'Failed to reject join request'))
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Members data is now handled by SWR hook useGroupMembers

  const handlePromoteToAdmin = async (memberId: string) => {
    try {
      const result = await promoteMember(memberId)

      if (result?.success) {
        toast.success(result.message || 'Member promoted to admin successfully')
      } else {
        throw new Error(result?.error || 'Failed to promote member')
      }
    } catch (error) {
      console.error('Error promoting member:', error)
      toast.error(t('kelola grup.toast.member_failed', 'Error promoting to admin'))
    }
  }

  const handleDemoteFromAdmin = async (memberId: string) => {
    try {
      const result = await demoteMember(memberId)

      if (result?.success) {
        toast.success(result.message || 'Admin demoted to member successfully')
      } else {
        throw new Error(result?.error || 'Failed to demote member')
      }
    } catch (error) {
      console.error('Error demoting member:', error)
      toast.error(t('kelola grup.toast.member_failed', 'Error demoting from admin'))
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const result = await removeMember(memberId)

      if (result?.success) {
        toast.success(result.message || 'Member removed successfully')
      } else {
        throw new Error(result?.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error(t('kelola grup.toast.remove_member_error', 'Error removing member'))
    }
  }

  const handleInviteUser = async (userToInvite: InviteUser) => {
    setIsInviting(true)
    try {
      const result = await inviteMember(userToInvite.username!, userToInvite.id || '')

      if (result?.success) {
        toast.success(result.message || 'User invited successfully')
        setIsInviteModalOpen(false)
        setInviteUsername("")
        // Clear cache when membership might change
        clearInviteSearchCache(groupId)
      } else {
        throw new Error(result?.error || 'Failed to invite user')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(t('kelola grup.toast.invite_failed', 'An error occurred while sending invitation'))
    } finally {
      setIsInviting(false)
    }
  }



  const copyInviteLink = async () => {
    let loadingToastId: string | number | undefined

    try {
      // Show loading state and store the toast ID
      loadingToastId = toast.loading(t('kelola grup.toast.generating_link', 'Generating invitation link...'))

      setButtonLoading(true)

      const createLink = await generateInvitationLink(groupId, 24 * 7)

      // Check if link generation was successful
      if (createLink.status !== 'success' || !createLink.data?.url) {
        // Dismiss loading toast before showing error
        if (loadingToastId) toast.dismiss(loadingToastId)
        toast.error(createLink.message || t('kelola grup.toast.link_generation_failed', 'Failed to generate invitation link'))
        return
      }

      // Check if clipboard API is available
      if (!navigator.clipboard) {
        // Fallback: Use text selection method
        const textArea = document.createElement('textarea')
        textArea.value = createLink.data.url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          // Dismiss loading toast before showing success
          if (loadingToastId) toast.dismiss(loadingToastId)
          toast.success(t('kelola grup.toast.link_copied', 'Invitation link copied successfully!'))
        } catch (fallbackError) {
          console.warn('Fallback copy failed:', fallbackError)
          // Dismiss loading toast before showing error
          if (loadingToastId) toast.dismiss(loadingToastId)
          toast.error(t('kelola grup.toast.copy_failed', 'Failed to copy link. Please copy manually.'))
        } finally {
          document.body.removeChild(textArea)
          setButtonLoading(false)
        }
        return
      }

      // Use modern clipboard API with proper error handling
      try {
        await navigator.clipboard.writeText(createLink.data.url)
        // Dismiss loading toast before showing success
        if (loadingToastId) toast.dismiss(loadingToastId)
        toast.success(t('kelola grup.toast.link_copied', 'Invitation link copied successfully!'))
      } catch (clipboardError) {
        // If clipboard fails, show the link in a modal or use fallback
        console.warn('Clipboard API failed:', clipboardError)

        // Dismiss loading toast before showing fallback
        if (loadingToastId) toast.dismiss(loadingToastId)

        // Fallback: Show link in alert or modal
        const userConfirmed = window.confirm(
          `${t('kelola grup.toast.copy_manually', 'Please copy this link manually:')}\n\n${createLink.data.url}`
        )

        if (userConfirmed) {
          toast.success(t('kelola grup.toast.link_ready', 'Link is ready to be copied'))
          setButtonLoading(false)
        }
      }
    } catch (error) {
      console.error('Error generating invitation link:', error)
      // Dismiss loading toast before showing error
      if (loadingToastId) toast.dismiss(loadingToastId)
      toast.error(t('kelola grup.toast.link_generation_error', 'An error occurred while generating the invitation link'))
    } finally {
      setButtonLoading(false)
    }
  }

  // Filter members berdasarkan search query
  const filteredMembers = members.filter(member =>
    member.user &&
    (
      member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );


  // getAvatarFallback function removed - now handled by UserAvatar component


  const admins = filteredMembers.filter(m => m.role === 'owner' || m.role === 'admin')
  const sortAdmins = admins.sort((a, b) => b.role.localeCompare(a.role))
  const regularMembers = filteredMembers.filter(m => m.role === 'member')

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .filter(n => n.length > 0)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "G"
  }

  const handleOpenQrDialog = async () => {
    let loadingToastId: string | number | undefined
    try {
      loadingToastId = toast.loading(t('kelola grup.toast.generating_link', 'Generating invitation link...'))
      setButtonLoadingQr(true)
      const createLink = await generateInvitationLink(groupId, 24 * 7)
      if (createLink.status !== 'success' || !createLink.data?.url) {
        if (loadingToastId) toast.dismiss(loadingToastId)
        toast.error(createLink.message || t('kelola grup.toast.link_generation_failed', 'Failed to generate invitation link'))
        return
      }
      setInviteLink(createLink.data.url)
      if (loadingToastId) toast.dismiss(loadingToastId)
      setOpenDialogQr(true)
    } catch (error) {
      console.error('Error generating invitation link:', error)
      if (loadingToastId) toast.dismiss(loadingToastId)
      toast.error(t('kelola grup.toast.link_generation_error', 'An error occurred while generating the invitation link'))
    } finally {
      setButtonLoadingQr(false)
    }
  }

  const handleOpenChange = openQrFullScren
    ? (isOpen: boolean) => {
      if (isOpen) setOpenDialogQr(true); // cegah auto close
    } // jika fullscreen aktif, biarkan default handler
    : setOpenDialogQr;

  return (
    <>
      <Card className="dark:bg-gray-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('kelola grup.members.title', 'Manage Members')} ({members.length})
              </CardTitle>
              {(group.type === "private") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:text-white !p-1.5 h-auto sm:hidden"
                  onClick={() => setOpenDialogRequest(true)}
                >
                  <Bell size={15} />
                  {requests.length > 0 && (
                    <>
                      {/* Outer pulse ring - larger and slower */}
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 animate-ping opacity-60"></span>
                      {/* Middle pulse ring - medium */}
                      <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-400 animate-ping opacity-40"></span>
                      {/* Main badge with count - gradient and shadow */}
                      <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/60 border-2 border-white dark:border-gray-800 z-10 hover:scale-110 transition-transform duration-200">
                        {requests.length > 99 ? '99+' : requests.length}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-1 sm:gap-2 w-full sm:flex-row sm:w-auto">
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenQrDialog}
                  disabled={buttonLoadingQr}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:text-white"
                >
                  <QrCode className="h-4 w-4" />
                  {t('kelola grup.invite.scanqr', 'Scan')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteLink}
                  disabled={buttonLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('kelola grup.invite.copy_link', 'Copy Link')}
                </Button>

              </div>
              <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:text-white ">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('kelola grup.members.invite_member', 'Invite')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle>{t('kelola grup.invite.title', 'Invite New Member')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-username">{t('kelola grup.invite.username_label', 'Username')}</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="invite-username"
                          type="text"
                          placeholder={t('kelola grup.invite.username_placeholder', 'Type to search users or enter username')}
                          value={inviteUsername}
                          onChange={(e) => setInviteUsername(e.target.value)}
                          maxLength={20}
                          className="pl-10"
                        />
                      </div>

                      {/* Search Results */}
                      {inviteUsername.length >= 2 && (
                        <div className="space-y-2">
                          {isSearchingUsers && (
                            <div className="flex items-center justify-center py-3">
                              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
                              <span className="text-xs text-muted-foreground">{t('kelola grup.invite.searching_users', 'Searching users...')}</span>
                            </div>
                          )}

                          {hasResults && !isSearchingUsers && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{t('kelola grup.invite.found_users', 'Found users:')}</p>
                              {searchUsers.slice(0, 2).map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <UserAvatar
                                      user={{
                                        id: user.id,
                                        name: user.name,
                                        username: user.username || "",
                                        avatar: user.avatar
                                      }}
                                      size="sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                        {user.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {user.username}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleInviteUser(user)}
                                    disabled={isInviting}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:text-white border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-6 md:h-8 px-2 md:px-3 text-xs md:text-sm"
                                  >
                                    <UserPlus className="h-3 w-3 md:mr-1" />
                                    <span className="hidden md:block">
                                      {t('kelola grup.invite.invite_button', 'Invite')}
                                    </span>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {!hasResults && !isSearchingUsers && inviteUsername.length >= 2 && (
                            <div className="text-center py-2">
                              <p className="text-xs text-muted-foreground">{t('kelola grup.invite.no_users_found', 'No users found. You can still invite by username below.')}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        {t('kelola grup.invite.username_help', '3-20 characters, letters, numbers, underscore only (no spaces or hyphens)')}
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="flex flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsInviteModalOpen(false)
                        setInviteUsername("")
                      }}
                      className="flex-1"
                    >
                      {t('kelola grup.invite.cancel', 'Cancel')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {(group.type === "private") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:text-white hover:from-emerald-700 hover:to-teal-700 hidden sm:block relative overflow-visible transition-all duration-200 shadow-md hover:shadow-lg"
                  onClick={() => setOpenDialogRequest(true)}
                >
                  <Bell
                    size={15}
                  // className={`transition-all duration-300 ${requests.length > 0 ? "animate-pulse" : ""}`}
                  />
                  {requests.length > 0 && (
                    <>
                      {/* Outer pulse ring - larger and slower */}
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 animate-ping opacity-60"></span>
                      {/* Middle pulse ring - medium */}
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-400 animate-ping opacity-40"></span>
                      {/* Main badge with count - gradient and shadow */}
                      <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/60 border-2 border-white dark:border-gray-800 z-10 hover:scale-110 transition-transform duration-200">
                        {requests.length > 99 ? '99+' : requests.length}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('kelola grup.members.search_placeholder', 'Search members...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Loading State */}
          {isLoadingMembers && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-muted-foreground">{t('kelola grup.members.loading', 'Loading members...')}</div>
            </div>
          )}

          {/* Admins Section */}
          {!isLoadingMembers && admins.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4" />
                {t('kelola grup.sections.admins_title', 'Owner and Admin ({count})').replace('{count}', admins.length.toString())}
              </h3>
              <div className="rounded-lg border border-slate-200 dark:border-slate-900 overflow-hidden bg-white dark:bg-gray-800">
                {sortAdmins.map((member) => (
                  <div
                    key={member.id}
                    className="group flex items-center justify-between px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 border-b border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors last:border-b-0"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <Link href={'/profile/' + member.user.username?.replace(/^@/, '')}>
                          <UserAvatar
                            user={{
                              id: member.user.id,
                              name: member.user.name || "",
                              username: member.user.username || "",
                              avatar: member.user.avatar || null
                            }}
                            size="sm"
                          />
                        </Link>
                        {member.role === 'owner' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full border border-white dark:border-slate-900 flex items-center justify-center">
                            <Crown className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {member.role === 'admin' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-white dark:border-slate-900 flex items-center justify-center">
                            <Shield className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Desktop Layout: full name | role */}
                        <div className="hidden md:flex items-center gap-1.5 md:gap-2.5 mb-0.5">
                          <span className="font-semibold text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200" onClick={(e) => {
                            e.stopPropagation()
                            router.push('/profile/' + member.user.username?.replace(/^@/, ''))
                          }}>
                            {member.user.nickname ? member.user.nickname + " - " + member.user.name : member.user.name}
                          </span>
                          {member.role === 'owner' && (
                            <Badge variant="default" className="text-xs sm:text-xs md:text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 flex-shrink-0">
                              {t('kelola grup.roles.owner', 'Owner')}
                            </Badge>
                          )}
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs sm:text-xs md:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 flex-shrink-0">
                              {t('kelola grup.roles.admin', 'Admin')}
                            </Badge>
                          )}
                        </div>
                        <div className="hidden md:block">
                          <span className="text-xs sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
                            {(member.user.cityName && member.user.stateName) ? `${member.user.username} - ${member.user.cityName} - ${member.user.stateName}` : member.user.username}
                          </span>
                        </div>

                        {/* Mobile/Tablet Layout: full name | role */}
                        <div className="md:hidden flex items-center gap-1.5 sm:gap-2 mb-0.5">
                          <span className="font-semibold text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-200 truncate">
                            {member.user.nickname ? member.user.nickname + " - " + member.user.name : member.user.name}
                          </span>
                          {member.role === 'owner' && (
                            <Badge variant="default" className="text-xs sm:text-xs md:text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 flex-shrink-0">
                              {t('kelola grup.roles.owner', 'Owner')}
                            </Badge>
                          )}
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs sm:text-xs md:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 flex-shrink-0">
                              {t('kelola grup.roles.admin', 'Admin')}
                            </Badge>
                          )}
                        </div>
                        <div className="md:hidden space-y-0.5">
                          <div className="text-xs sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
                            {(member.user.cityName && member.user.stateName) ? `${member.user.username} - ${member.user.cityName} - ${member.user.stateName}` : member.user.username}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions untuk admin */}
                    <div className="flex gap-1 sm:gap-1 md:gap-1.5 flex-shrink-0">
                      {(isOwner && member.role === 'admin') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 sm:h-6 md:h-7 px-1.5 sm:px-2 md:px-2.5">
                              <MoreHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setModalRemoveOpen(true)
                                setTypeEvent("demote")
                                setMemberIdToRemove(member.user.id)
                              }}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              {t('kelola grup.actions_menu.demote_admin', 'Demote from Admin')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setModalRemoveOpen(true);
                                setTypeEvent("remove")
                                setMemberIdToRemove(member.user.id)
                              }}
                              className="text-red-600"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              {t('kelola grup.actions_menu.remove_member', 'Remove from Group')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members Section */}
          {!isLoadingMembers && regularMembers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('kelola grup.sections.members_title', 'Members ({count})').replace('{count}', regularMembers.length.toString())}
              </h3>
              <div className="rounded-lg border border-slate-200 dark:border-slate-900 overflow-hidden bg-white dark:bg-gray-800">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="group flex items-center justify-between px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 border-b border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors last:border-b-0"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <Link href={'/profile/' + member.user.username?.replace(/^@/, '')}>
                          <UserAvatar
                            user={{
                              id: member.user.id,
                              name: member.user.name || "",
                              username: member.user.username || "",

                              avatar: member.user.avatar || null
                            }}
                            size="sm"
                          />
                        </Link>
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Desktop Layout: full name */}
                        <div className="hidden md:flex items-center gap-1.5 md:gap-2.5 mb-0.5">
                          <span className="font-semibold text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200" onClick={(e) => {
                            e.stopPropagation()
                            router.push('/profile/' + member.user.username?.replace(/^@/, ''))
                          }}>
                            {member.user.nickname ? member.user.nickname + " - " + member.user.name : member.user.name}
                          </span>
                        </div>
                        <div className="hidden md:block">
                          <span className="text-xs sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
                            {(member.user.cityName && member.user.stateName) ? `${member.user.username} - ${member.user.cityName} - ${member.user.stateName}` : member.user.username}
                          </span>
                        </div>

                        {/* Mobile/Tablet Layout: full name */}
                        <div className="md:hidden flex items-center gap-1.5 sm:gap-2 mb-0.5">
                          <span className="font-semibold text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-200 truncate">
                            {member.user.nickname ? member.user.nickname + " - " + member.user.name : member.user.name}
                          </span>
                        </div>
                        <div className="md:hidden space-y-0.5">
                          <div className="text-xs sm:text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
                            {(member.user.cityName && member.user.stateName) ? `${member.user.username} - ${member.user.cityName} - ${member.user.stateName}` : member.user.username}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions untuk owner */}
                    <div className="flex gap-1 sm:gap-1 md:gap-1.5 flex-shrink-0">
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 sm:h-6 md:h-7 px-1.5 sm:px-2 md:px-2.5">
                              <MoreHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setModalRemoveOpen(true);
                                setTypeEvent("promote")
                                setMemberIdToRemove(member.user.id);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {t('kelola grup.actions_menu.make_admin', 'Make Admin')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setModalRemoveOpen(true)
                                setTypeEvent("remove")
                                setMemberIdToRemove(member.user.id)
                              }}
                              className="text-red-600"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              {t('kelola grup.actions_menu.remove_member', 'Remove from Group')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingMembers && filteredMembers.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground">
                {t('kelola grup.sections.no_search_results', 'No members match the search "{query}"').replace('{query}', searchQuery)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={modalRemoveOpen} onOpenChange={setModalRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('kelola grup.dialogs.member_action_title', 'Member Action')}</AlertDialogTitle>
            <AlertDialogDescription>
              {typeEvent === "demote" && t('kelola grup.dialogs.demote_confirmation', 'Are you sure you want to demote this member from admin?')}
              {typeEvent === "remove" && t('kelola grup.dialogs.remove_confirmation', 'Are you sure you want to remove this member from the group?')}
              {typeEvent === "promote" && t('kelola grup.dialogs.promote_confirmation', 'Are you sure you want to promote this member to admin?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('kelola grup.dialogs.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (typeEvent === "demote") {
                  handleDemoteFromAdmin(memberIdToRemove);
                } else if (typeEvent === "remove") {
                  handleRemoveMember(memberIdToRemove);
                } else if (typeEvent === "promote") {
                  handlePromoteToAdmin(memberIdToRemove);
                }
                setModalRemoveOpen(false);
              }}
              className={`
                ${typeEvent === "demote"
                  ? "border border-red-300 dark:border-red-600 text-white hover:text-red-700 bg-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transform duration-300 hover:scale-105"
                  : typeEvent === "remove"
                    ? "border border-red-300 dark:border-red-600 text-white hover:text-red-700 bg-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transform duration-300 hover:scale-105"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-108"}
              `}
            >
              {typeEvent === "demote" && t('kelola grup.dialogs.demote_button', 'Demote from Admin')}
              {typeEvent === "remove" && t('kelola grup.dialogs.remove_button', 'Remove from Group')}
              {typeEvent === "promote" && t('kelola grup.dialogs.promote_button', 'Make Admin')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openDialogRequest} onOpenChange={setOpenDialogRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="mb-3">{t('kelola grup.sections.request_join')}</DialogTitle>
          </DialogHeader>
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-40 md:min-h-60 gap-3">
              <BellOff size={60} className="text-slate-600 dark:text-slate-300" />
              <span className="font-medium text-slate-700 dark:text-slate-300 text-center text-sm w-full md:w-[80%]">{t('kelola grup.sections.no_request_join')}</span>
            </div>
          ) : (
            requests.map((request) => {
              const getAvatarForFriend = (friend: RequestJoin) => {
                if (friend.user?.avatar && friend.user?.avatar.trim() !== '') {
                  return { ...friend, avatar: friend.user?.avatar }
                }
                return friend
              };

              return (
                <div key={request.id} className="flex justify-between gap-1.5">
                  <div className="flex items-center gap-3">
                    <Link href={'/profile/' + request.user?.username?.replace(/^@/, '')}>
                      <UserAvatar
                        user={getAvatarForFriend(request)}
                        size="sm"
                      />
                    </Link>
                    <div>
                      <Link href={'/profile/' + request.user?.username?.replace(/^@/, '')} className="font-medium text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 line-clamp-1">
                        {request.user?.name}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1 overflow-hidden text-ellipsis break-all">
                        {request.user?.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingRequestId === request.id}
                      className="border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <UserMinus className="h-4 w-4 mr-1" />
                      )}
                      <span className="hidden sm:block">{t('kelola grup.actions.reject')}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id, request.user_id)}
                      disabled={processingRequestId === request.id}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-lg shadow-sm hover:shadow-md dark:text-white transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-1" />
                      )}
                      <span className="hidden sm:block">
                        {t('kelola grup.actions.accept')}
                      </span>
                    </Button>
                  </div>
                </div>
              )
            }))}
        </DialogContent>
      </Dialog>

      <Dialog
        modal={!openQrFullScren}
        open={openDialogQr}
        onOpenChange={handleOpenChange}
      >
        <DialogContent
          className="!max-w-sm rounded-2xl p-6"
        >
          <DialogHeader>
            {/* Header dengan avatar dan nama grup */}
            <div className="flex flex-col items-center -mt-16">
              <Avatar className="h-20 w-20 shadow-lg ring-4 ring-slate-400 dark:ring-slate-600">
                <AvatarImage
                  className="object-cover"
                  src={
                    group.photo_path
                      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path}`
                      : ""
                  }
                  alt={group.name}
                />
                <AvatarFallback className="bg-black/30 dark:bg-white/20 text-white font-semibold text-2xl backdrop-blur-sm">
                  {getAvatarFallback(group.name)}
                </AvatarFallback>
              </Avatar>
              <DialogTitle>
                <h2 className="text-center text-2xl font-bold text-slate-800 dark:text-white my-2">
                  {group.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                  {t('kelola grup.invite.scanqr_to_join')}
                </p>
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* QR Code dan link */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-none dark:ring-2 dark:ring-slate-700/50">
              <QRCodeCanvas
                value={inviteLink || ""}
                size={200}
                level="H"
                bgColor="transparent"
                fgColor={document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#1f2937'}
                includeMargin={true}
              />
              <button
                onClick={() => {
                  setOpenQrFullScren(true);
                }}
                className="absolute -top-2 -right-2 p-2 rounded-lg bg-white/80 dark:bg-slate-800 backdrop-blur-sm
                            text-gray-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900/20 dark:ring dark:ring-slate-700/50
                            hover:scale-105 transition-all shadow-sm cursor-pointer"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center max-w-[16rem] break-all">
              {inviteLink || ''}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {openQrFullScren && (
        <div className="fixed inset-0 !z-[9999] flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 p-6">
          {/* Background Pattern (Subtle) */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-teal-600 blur-3xl"></div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setOpenQrFullScren(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:scale-110 transition-all duration-200 z-10"
          >
            <X className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          {/* Main Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md flex flex-col items-center"
          >
            {/* Avatar with Glow */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-400 blur-xl opacity-50 animate-pulse"></div>

            </div>

            {/* QR Code with Logo in Center */}
            <div className="relative p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl ring-8 ring-white/50 dark:ring-slate-700/50">
              <QRCodeCanvas
                value={inviteLink || ""}
                size={qrSize}
                level="H"
                bgColor="transparent"
                fgColor={document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#1f2937'}
                includeMargin={false}
              />
            </div>

            {/* Qurani Branding */}
          </motion.div>
        </div>
      )}
    </>
  )
}
