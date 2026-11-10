"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Input } from "@/components/ui/input"
import { GroupInfoHeader } from "./group-info-header"
import {
    Users,
    Globe,
    Settings,
    Crown,
    Search,
} from "lucide-react"
import { GroupDetail } from "@/types/grup"
import { useGroupMutations } from "@/hooks/use-grup-data"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState, useCallback, useMemo } from "react"
import { useI18n } from "@/components/providers/i18n-provider"
import Link from "next/link"

interface GrupDetailProps {
    group: GroupDetail
    userRole: "owner" | "admin" | "member"
    onUpdate: (group: GroupDetail) => void
}

export function GrupDetail({ group, userRole }: GrupDetailProps) {
    const { t } = useI18n()
    const router = useRouter()
    const { userId } = useAuth()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [showLeaveDialog, setShowLeaveDialog] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // SWR mutations
    const { leaveGroup: leaveGroupMutation } = useGroupMutations(userId)

    // Filter and sort members with memoization
    const filteredMembers = useMemo(() => {
        return group.grup_members.filter(member => {
            if (!searchQuery) return true
            const fullName = member.user?.name || ""
            const username = member.user?.username || ""
            return fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                username.toLowerCase().includes(searchQuery.toLowerCase())
        })
    }, [group.grup_members, searchQuery])

    const { regularMembers, sortAdmins } = useMemo(() => {
        const admins = filteredMembers.filter(member =>
            member.role === 'owner' || member.role === 'admin'
        )
        const regularMembers = filteredMembers.filter(member =>
            member.role === 'member'
        )

        const sortAdmins = [...admins].sort((a, b) => {
            if (a.role === 'owner' && b.role !== 'owner') return -1
            if (a.role !== 'owner' && b.role === 'owner') return 1
            if (a.role === 'admin' && b.role === 'member') return -1
            if (a.role === 'member' && b.role === 'admin') return 1
            return 0
        })

        return { regularMembers, sortAdmins }
    }, [filteredMembers])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleLeaveGroup = useCallback(async () => {
        try {
            await leaveGroupMutation(group.id)
            toast.success(t('grup detail.toast.leave_success', 'Successfully left the group'))
            setShowLeaveDialog(false)
            router.push('/grup')
            // SWR automatically updates cache across all pages
        } catch (error) {
            console.error('Error leaving group:', error)
            toast.error(t('grup detail.toast.leave_error', 'An error occurred while leaving the group'))
        }
    }, [leaveGroupMutation, group.id, t, router])

    // Format date with abbreviated month and full year - Indonesian format (DD MMM YYYY)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const formatDate = useCallback((dateString: string, compact = false) => {
        try {
            const date = new Date(dateString)
            if (Number.isNaN(date.getTime())) return 'Tanggal tidak valid'
            const day = date.getDate().toString().padStart(2, "0")
            const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
            const month = months[date.getMonth()]
            const year = date.getFullYear()
            return `${day} ${month} ${year}`
        } catch {
            return 'Tanggal tidak valid'
        }
    }, [])


    // getAvatarFallback function removed - now handled by UserAvatar component

    return (
        <div className="space-y-4">
            {/* Group Information Header */}
            <GroupInfoHeader
                group={group}
                userRole={userRole}
                isOwner={false} // Hide edit options as requested
                onMembersDeleted={() => router.refresh()}
            />

            {/* Group Statistics and Quick Actions */}
            {/* Mobile: Three square cards in one row without scroll */}
            <div className="sm:hidden">
                <div className="grid grid-cols-3 gap-2">
                    {/* Total Members Card */}
                    <Card className="aspect-square dark:bg-gray-800 bg-white shadow-md hover:shadow-lg transition-transform duration-300 rounded-2xl hover:scale-[1.02]">
                        <CardContent className="p-2 h-full flex flex-col items-center justify-center text-center gap-1">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full shadow-sm">
                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-[9px] text-muted-foreground leading-tight">
                                    {t('grup detail.stats.total_members', 'Total Members')}
                                </p>
                                <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                    {group.grup_members.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Group Type Card */}
                    <Card className="aspect-square dark:bg-gray-800 bg-white shadow-md hover:shadow-lg transition-transform duration-300 rounded-2xl hover:scale-[1.02]">
                        <CardContent className="p-2 h-full flex flex-col items-center justify-center text-center gap-1">
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-full shadow-sm">
                                <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-[9px] text-muted-foreground leading-tight">
                                    {t('grup detail.stats.group_type', 'Group Type')}
                                </p>
                                <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                    {group.type === 'private'
                                        ? t('kelola grup.group_info.private', 'Private')
                                        : group.type === 'public' ? t('kelola grup.group_info.public', 'Public') : t('kelola grup.group_info.secret', 'Secret')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Created Date Card */}
                    <Card className="aspect-square dark:bg-gray-800 bg-white shadow-md hover:shadow-lg transition-transform duration-300 rounded-2xl hover:scale-[1.02]">
                        <CardContent className="p-2 h-full flex flex-col items-center justify-center text-center gap-1">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-full shadow-sm">
                                <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-[9px] text-muted-foreground leading-tight">
                                    {t('grup detail.stats.created', 'Created')}
                                </p>
                                <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                    {formatDate(group.created_at, true)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Desktop: Grid layout (unchanged) */}
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Statistics Cards */}
                <Card className="dark:bg-gray-800 bg-white shadow-md hover:shadow-lg transition-transform duration-300 rounded-2xl hover:scale-[1.02] py-2">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full shadow-sm flex-shrink-0">
                            <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t('grup detail.stats.total_members', 'Total Members')}
                            </p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {group.grup_members.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 bg-white shadow-md hover:shadow-lg transition-transform duration-300 rounded-2xl hover:scale-[1.02] py-2">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full shadow-sm flex-shrink-0">
                            <Globe className="h-7 w-7 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t('grup detail.stats.group_type', 'Group Type')}
                            </p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {group.type === 'private'
                                    ? t('kelola grup.group_info.private', 'Private')
                                    : group.type === 'public' ? t('kelola grup.group_info.public', 'Public') : t('kelola grup.group_info.secret', 'Secret')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 bg-white shadow-md hover:shadow-lg transition-transform duration-300 rounded-2xl hover:scale-[1.02] py-2">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full shadow-sm flex-shrink-0">
                            <Settings className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t('grup detail.stats.created', 'Created')}
                            </p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {formatDate(group.created_at)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Members Section */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-4">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            {t('grup detail.members.title', 'Members')}
                        </CardTitle>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {group.grup_members.length} {group.grup_members.length === 1 ? t('grup detail.members.member_singular', 'member') : t('grup detail.members.member_plural', 'members')}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder={t('grup detail.members.search_placeholder', 'Search members...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Admins Section */}
                    {sortAdmins.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                {t('grup detail.members.owner', 'Owner')} {t('grup detail.members.and', 'dan')} {t('grup detail.members.admin', 'Admin')} ({sortAdmins.length})
                            </h3>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-900 overflow-hidden bg-white dark:bg-gray-900 md:dark:bg-gray-800">
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
                                                            id: member.user?.id || "",
                                                            name: member.user?.name || "",
                                                            username: member.user?.username || "",
                                                            avatar: member.user?.avatar || null
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
                                                        <Settings className="w-2 h-2 text-white" />
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
                                                            {t('grup detail.members.owner', 'Owner')}
                                                        </Badge>
                                                    )}
                                                    {member.role === 'admin' && (
                                                        <Badge variant="secondary" className="text-xs sm:text-xs md:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 flex-shrink-0">
                                                            {t('grup detail.members.admin', 'Admin')}
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
                                                            {t('grup detail.members.owner', 'Owner')}
                                                        </Badge>
                                                    )}
                                                    {member.role === 'admin' && (
                                                        <Badge variant="secondary" className="text-xs sm:text-xs md:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 flex-shrink-0">
                                                            {t('grup detail.members.admin', 'Admin')}
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Members Section */}
                    {regularMembers.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {t('grup detail.members.members_text', 'Members')} ({regularMembers.length})
                            </h3>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-900 overflow-hidden bg-white dark:bg-gray-900 md:dark:bg-gray-800">
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
                                                            id: member.user?.id || "",
                                                            name: member.user?.name || "",
                                                            username: member.user?.username || "",
                                                            avatar: member.user?.avatar || null
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredMembers.length === 0 && searchQuery && (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <div className="text-muted-foreground">
                                {t('grup detail.search.no_members_match', 'No members match the search')} &quot;{searchQuery}&quot;
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Leave Group Button for Members */}
            {/* {userRole === "member" && (
                <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 py-0">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:gap-0 items-center justify-between">
                            <div className="w-full">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                    {t('grup detail.leave_group.title', 'Leave Group')}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('grup detail.leave_group.description', 'You can leave this group at any time. This action cannot be undone.')}
                                </p>
                            </div>
                            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        className="flex items-center gap-2 w-full sm:w-auto bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {t('grup detail.leave_group.leave_group', 'Leave Group')} 
                                    </Button>
                                    </AlertDialogTrigger>
                                <AlertDialogContent className="dark:bg-gray-800">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('grup detail.leave_group.dialog_title', 'Leave Group')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        {t('grup detail.leave_group.dialog_description_before', 'Are you sure you want to leave')} <strong>{group.name}</strong>? {t('grup detail.leave_group.dialog_description_after', 'This action cannot be undone and you\'ll need to be re-invited to join again.')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex flex-row">
                                        <AlertDialogCancel
                                        className="cursor-pointer flex-1"
                                        onClick={() => setShowLeaveDialog(false)}
                                        >
                                            {t('grup detail.leave_group.cancel', 'Cancel')}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                        className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
                                        onClick={handleLeaveGroup}

                                    >
                                        <LogOut className="h-4 w-4" />
                                        {t('grup detail.leave_group.leave', 'Leave')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            )} */}
        </div>
    )
}
