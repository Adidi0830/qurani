"use client"

import React, { useEffect, useState, Suspense, useCallback, useMemo, memo, useRef, ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  User,
  ArrowLeft,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  UserPlus,
  UserMinus,
  UserX,
  UserRoundCog,
  UserLock,
  CheckCircle,
  Check,
  Users,
  MoreVertical,
  Users2,
  FileText,
  Globe,
  Search,
  UserSearch,
  MapPinned,
  FlagIcon,
  AlertCircle,
  Loader2,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { usersApi } from "@/lib/api"
import { UserProfile } from "@/types/database.types"
import { Database } from "@/types/database"
import { getInitials } from "@/utils/helpers/get-initials"
import { useI18n } from "@/components/providers/i18n-provider"
import { fetchStates } from "@/utils/api/states/fetch"
import { fetchCities } from "@/utils/api/city/fetch"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"
import { ClientCache } from "@/utils/cache/client-cache"
import { useGlobalPresence } from "@/components/providers/presence-provider"
import { OnlineBadge } from "@/components/ui/online-indicator"
import { getRecapsByReciterId } from "@/utils/api/recaps/fetch"
import { IRecap } from "@/types/recap"
import { updateRecapParaf } from "@/utils/api/recaps/insert"
import { useParafStore } from "@/stores/parafStore"
import { acceptFriendRequest, type GetFriendData, getFriendsData, getFriendshipStatus, rejectOrCancelFriendRequest, sendFriendRequest, unfriend } from "@/utils/api/friends"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useFriendStatusSync } from "@/hooks/use-friend-status-sync"
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { generateId } from "@/lib/generateId"
import { createReport } from "@/utils/api/reports/insert"
import { SkeletonDetailPage } from "@/components/ui/skeletons"

type FriendStatus = "friends" | "pending_sent" | "pending_received" | "not_friends" | null;

const baseButton = "flex items-center justify-center gap-2 text-sm font-medium rounded-xl transition-all duration-300 shadow-sm hover:shadow-md w-10 lg:w-36 focus:outline-none focus:ring-2 focus:ring-offset-1";

// Simplified button components
const UnfollowButton = memo(({ onClick, disabled, t }: {
  onClick: () => void;
  disabled: boolean;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}) => (
  <Button
    size="sm"
    variant="outline"
    onClick={onClick}
    disabled={disabled}
    className={`${baseButton} border border-red-400/70 dark:border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
  >
    <UserMinus />
    <span className="hidden lg:block">{t('profile_detail.unfollow')}</span>
  </Button>
));
UnfollowButton.displayName = 'UnfollowButton';

const CancelRequestButton = memo(({ onClick, disabled, t }: {
  onClick: () => void;
  disabled: boolean;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}) => (
  <Button
    size="sm"
    variant="outline"
    onClick={onClick}
    disabled={disabled}
    className={`${baseButton} bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-gray-100`}
  >
    <UserRoundCog />
    <span className="hidden lg:block">{t('profile_detail.requested')}</span>
  </Button>
));
CancelRequestButton.displayName = 'CancelRequestButton';

const FollowButton = memo(({ onClick, disabled, t }: {
  onClick: () => void;
  disabled: boolean;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}) => (
  <Button
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={`${baseButton} bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-white`}
  >
    <UserPlus />
    <span className="hidden lg:block">
      {t('profile_detail.follow')}
    </span>
  </Button>
));
FollowButton.displayName = 'FollowButton';

const AcceptButton = memo(({ onClick, disabled, t }: {
  onClick: () => void;
  disabled: boolean;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}) => (
  <Button
    size="sm"
    variant="default"
    onClick={onClick}
    disabled={disabled}
    className={`${baseButton} bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-white`}
  >
    <UserPlus />
    <span className="hidden lg:block">
      {t('profile_detail.accept')}
    </span>
  </Button>
));
AcceptButton.displayName = 'AcceptButton';

// Memoized friend item component
const FriendItem = memo(({
  friend,
  status,
  currentUser,
  onAction,
  onUnfollowClick,
  isSubmitting,
  t
}: {
  friend: GetFriendData;
  status: FriendStatus;
  currentUser: string;
  onAction: (friendId: string, action: 'send' | 'accept' | 'reject') => void;
  onUnfollowClick: (userId: string, userName: string) => void;
  isSubmitting: string | null;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}) => {
  const getAvatarForFriend = useCallback((friend: GetFriendData) => {
    // Return friend with avatar if exists
    if (friend.avatar && friend.avatar.trim() !== '') {
      return { ...friend, avatar: friend.avatar }
    }
    return friend
  }, []);

  return (
    <div className="flex justify-between items-center gap-2 border p-3 md:p-5 rounded-xl bg-white dark:bg-gray-900/20 border-gray-200 dark:border-blue-800/40 transition-all hover:shadow-xl hover:-translate-y-0.5 animate-in slide-in-from-top-2 fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href={'/profile/' + friend.username?.replace(/^@/, '')}>
          <UserAvatar
            user={getAvatarForFriend(friend)}
            size="sm"
          />
        </Link>
        <div>
          <div className="flex items-center gap-0.5 mb-0.5">
            <Link href={'/profile/' + friend.username?.replace(/^@/, '')} className="font-medium text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 line-clamp-1">
              {friend.nickname ? `${friend.nickname} - ${friend.name}` : friend.name}
            </Link>
            {friend.isVerify && (
              <Image src="/icons/verified.webp" alt="verified icon" width={13} height={13} />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 overflow-hidden text-ellipsis break-all">
            {(friend.cityName && friend.stateName && friend.countryName) ? `${friend.username} - ${friend.cityName} - ${friend.stateName} - ${friend.countryName}` : friend.username}
          </p>

        </div>
      </div>
      {currentUser !== friend.id && (
        <div className="flex items-center gap-2">
          {(status === "friends" || status === "pending_sent") && (
            <UnfollowButton
              onClick={() => onUnfollowClick(friend.id, friend.name || 'Unknown')}
              disabled={isSubmitting === friend.id}
              t={t}
            />
          )}
          {status === "pending_received" && (
            <AcceptButton
              onClick={() => onAction(friend.id, 'accept')}
              disabled={isSubmitting === friend.id}
              t={t}
            />
          )}
          {status === "not_friends" && (
            <FollowButton
              onClick={() => onAction(friend.id, 'send')}
              disabled={isSubmitting === friend.id}
              t={t}
            />
          )}
          {!status && (
            <FollowButton
              onClick={() => onAction(friend.id, 'send')}
              disabled={isSubmitting === friend.id}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
});
FriendItem.displayName = 'FriendItem';

const tabVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

type TabType = 'profile' | 'deposits' | 'friends' | 'following';

interface ProfileItemProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  color: string;
  fullWidth?: boolean;
  delay?: number;
}

const ProfileItem = ({ icon, label, value, color, fullWidth = false, delay = 0 }: ProfileItemProps) => {
  const colorVariants: Record<string, { bg: string; text: string; ring: string; iconBg: string }> = {
    green: { bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', text: 'text-green-700', ring: 'ring-green-200', iconBg: 'from-green-500 to-emerald-500' },
    blue: { bg: 'bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20', text: 'text-blue-700', ring: 'ring-blue-200', iconBg: 'from-blue-500 to-sky-500' },
    sky: { bg: 'bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20', text: 'text-sky-700', ring: 'ring-sky-200', iconBg: 'from-sky-500 to-cyan-500' },
    pink: { bg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20', text: 'text-pink-700', ring: 'ring-pink-200', iconBg: 'from-pink-500 to-rose-500' },
    purple: { bg: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20', text: 'text-purple-700', ring: 'ring-purple-200', iconBg: 'from-purple-500 to-violet-500' },
    amber: { bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20', text: 'text-amber-700', ring: 'ring-amber-200', iconBg: 'from-amber-500 to-yellow-500' },
    rose: { bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20', text: 'text-rose-700', ring: 'ring-rose-200', iconBg: 'from-rose-500 to-pink-500' },
    indigo: { bg: 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20', text: 'text-indigo-700', ring: 'ring-indigo-200', iconBg: 'from-indigo-500 to-blue-500' },
    teal: { bg: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20', text: 'text-teal-700', ring: 'ring-teal-200', iconBg: 'from-teal-500 to-cyan-500' },
    gray: { bg: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-800/20', text: 'text-gray-600', ring: 'ring-gray-200', iconBg: 'from-gray-400 to-slate-400' },
  };

  const colors = colorVariants[color] || colorVariants.gray;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 120 }}
      className={`${fullWidth ? 'sm:col-span-2 lg:col-span-3' : ''} group`}
    >
      <div className={`
        relative p-5 rounded-2xl ${colors.bg} border border-transparent
        ring-1 ${colors.ring} backdrop-blur-sm
        transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
        dark:ring-${color}-800/50
      `}>
        {/* Gradient Icon Circle */}
        <div className={`
          absolute -top-3 left-5 w-10 h-10 rounded-full
          bg-gradient-to-br ${colors.iconBg} p-2 shadow-md
          ring-4 ring-white dark:ring-gray-900
          transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12
        `}>
          <div className="w-full h-full flex items-center justify-center text-white">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 ml-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className={`mt-1 font-semibold text-lg ${colors.text} dark:text-${color}-300 break-words`}>
            {value || <span className="italic text-gray-400">—</span>}
          </p>
        </div>

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/10 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
};

function UserProfileContent() {
  const params = useParams()
  const router = useRouter()
  const { userId: currentUserId, profile: currentProfile } = useAuth()
  const { t } = useI18n()

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [showFullscreenAvatar, setShowFullscreenAvatar] = useState(false)
  const [recaps, setRecaps] = useState<IRecap[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [checkedStatus, setCheckedStatus] = useState<string | null>()
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const recentChangesRef = useRef<Set<string>>(new Set())
  const [userId, setUserId] = useState<string>()
  const [friendsData, setFriendsData] = useState<{
    friends: GetFriendData[]
    pendingSent: GetFriendData[]
    pendingReceived: GetFriendData[]
    followers: GetFriendData[]
  }>({
    friends: [],
    pendingSent: [],
    pendingReceived: [],
    followers: []
  })
  const [unfollowDialog, setUnfollowDialog] = useState<{
    isOpen: boolean
    userId: string | null
    userName: string
  }>({
    isOpen: false,
    userId: null,
    userName: ''
  })
  const [cancelRequest, setCancelRequest] = useState<{
    isOpen: boolean
    userId: string | null
    userName: string
  }>({
    isOpen: false,
    userId: null,
    userName: ''
  })
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const userName = params?.id as string
  const isOwnProfile = currentUserId === userId
  const { isOnline } = useGlobalPresence()
  // Create statusMap by checking friendship status from current user's perspective
  const [statusMap, setStatusMap] = useState<Record<string, FriendStatus>>({});

  // Paraf dialog state
  const [isParafDialogOpen, setIsParafDialogOpen] = useState(false)
  const [selectedRecapForParaf, setSelectedRecapForParaf] = useState<string | null>(null)
  const [isUpdatingParaf, setIsUpdatingParaf] = useState<boolean>(false)
  const { parafStatuses, setParafStatus, loadParafStatuses } = useParafStore()

  // Memoize toast messages to prevent recreation
  const toastMessages = useMemo(() => ({
    friendRequestSent: t('search.messages.friend_request_sent', "Friend request sent"),
    friendRequestAccepted: t('search.messages.friend_request_accepted', "Friend request accepted"),
    friendRequestRejected: t('search.messages.friend_request_rejected', "Friend request rejected"),
    searchFailed: t('search.messages.search_failed', "Failed to search users. Please try again."),
    loadMoreFailed: t('search.messages.load_more_failed', "Failed to load more users. Please try again."),
    networkError: t('search.messages.network_error', "Network error. Please check your internet connection."),
    timeoutError: t('search.messages.timeout_error', "Request timeout. Please try again."),
    configError: t('search.messages.config_error', "Configuration error. Please contact support."),
  }), [t])

  const tabs = [
    { id: 'profile', label: t('profile.personal_info'), icon: User },
    { id: 'deposits', label: t('profile_detail.recitation'), icon: BookOpen },
    { id: 'friends', label: t('profile_detail.follower'), icon: Users },
    { id: 'following', label: t('profile_detail.following'), icon: Users2 },
  ];

  // Batch check friendship statuses to reduce API calls
  const batchCheckFriendshipStatus = useCallback(async (currentUserId: string, friendIds: string[]) => {
    if (friendIds.length === 0) return {};

    try {
      const supabase = createClient();

      // Get all friend requests in one query - simplified approach
      const { data: requests, error } = await supabase
        .from("friend_requests")
        .select("*")
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

      if (error) {
        console.warn("Supabase error (likely RLS / 42501):", error);
        return {};
      }

      // Process the results
      const statusMap: Record<string, FriendStatus> = {};

      friendIds.forEach(friendId => {
        const sentToFriend = requests?.some((req: Database['public']['Tables']['friend_requests']['Row']) =>
          req.requester_id === currentUserId && req.recipient_id === friendId
        );
        const receivedFromFriend = requests?.some((req: Database['public']['Tables']['friend_requests']['Row']) =>
          req.requester_id === friendId && req.recipient_id === currentUserId
        );

        if (sentToFriend && receivedFromFriend) {
          statusMap[friendId] = "friends";
        } else if (sentToFriend && !receivedFromFriend) {
          statusMap[friendId] = "pending_sent";
        } else if (!sentToFriend && receivedFromFriend) {
          statusMap[friendId] = "pending_received";
        } else {
          statusMap[friendId] = "not_friends";
        }
      });

      return statusMap;
    } catch (error) {
      console.error("Error batch checking friendship status:", error);
      return {};
    }
  }, []);

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!currentUserId) return;

      // Get all friend IDs from all categories
      const allFriendIds = [
        ...friendsData.friends.map(friend => friend.id),
        ...friendsData.pendingSent.map(friend => friend.id),
        ...friendsData.pendingReceived.map(friend => friend.id)
      ];

      if (allFriendIds.length === 0) return;

      const newStatusMap = await batchCheckFriendshipStatus(currentUserId, allFriendIds);
      setStatusMap(newStatusMap);
    };

    fetchStatuses();
  }, [currentUserId, friendsData, batchCheckFriendshipStatus]);



  useEffect(() => {
    const checkMutualFollow = async () => {
      if (!currentUserId || !userId) return
      try {
        const data = await getFriendshipStatus(currentUserId, userId)
        setCheckedStatus(data)
      } catch (error) {
        console.error("Gagal memeriksa status pertemanan:", error)
        setCheckedStatus(null)
      }
    }

    checkMutualFollow()
  }, [currentUserId, userId])

  const fetchRecaps = useCallback(async (userId: string) => {
    try {
      // Choose the appropriate fetch function based on mode
      const res = await getRecapsByReciterId(userId)

      if (!res.success) {
        toast.error(res.message)
        return
      }

      const data = res.data as IRecap[]

      // Set data immediately without waiting for date calculations
      setRecaps(data)

    } catch (error) {
      console.error("Error fetching recaps:", error)
      toast.error("Gagal memuat data hasil setoran")
    }
  }, [])

  useEffect(() => {
    // Early return if no user
    if (!userId) return

    fetchRecaps(userId)
  }, [fetchRecaps, userId])

  // Reset to first page when recaps change
  useEffect(() => {
    setCurrentPage(1)
  }, [recaps])

  // Load paraf statuses from database when recaps are fetched
  useEffect(() => {
    if (recaps && recaps.length > 0) {
      const statusesFromDB: { [key: string]: boolean } = {}
      recaps.forEach(recap => {
        if (recap.id) {
          statusesFromDB[recap.id] = recap.paraf || false
        }
      })
      loadParafStatuses(statusesFromDB)
    }
  }, [recaps, loadParafStatuses])

  const fetchFriends = useCallback(async () => {
    if (!userId) return

    try {
      // Only show loading on initial load
      if (!hasInitiallyLoaded) {
        setIsLoading(true)
      }

      const data = await getFriendsData(userId)
      setFriendsData(data)

      // Mark as initially loaded
      if (!hasInitiallyLoaded) {
        setHasInitiallyLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching friends:', error)
      // Only show error toast on initial load to avoid spam
      if (!hasInitiallyLoaded) {
        toast.error('error while fetching data')
      }
    } finally {
      if (!hasInitiallyLoaded) {
        setIsLoading(false)
      }
    }
  }, [userId, hasInitiallyLoaded])

  useEffect(() => {
    if (userId && !hasInitiallyLoaded) {
      fetchFriends()
    }
  }, [userId, hasInitiallyLoaded, fetchFriends])

  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t('notifikasi.baru_saja', 'Baru saja')
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('notifikasi.menit_yang_lalu', 'menit yang lalu')}`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('notifikasi.jam_yang_lalu', 'jam yang lalu')}`
    return `${Math.floor(diffInSeconds / 86400)} ${t('notifikasi.hari_yang_lalu', 'hari yang lalu')}`
  }, [t])

  // Function to optimize memorization range display
  const optimizeMemorizationDisplay = useCallback((memorization: string) => {
    // Check if the text contains a range pattern like "surah:start - surah:end"
    const rangePattern = /^([^:]+):(\d+)\s*-\s*([^:]+):(\d+)$/
    const match = memorization.match(rangePattern)

    if (match) {
      const [, startSurah, startVerse, endSurah, endVerse] = match

      // If both surah names are the same, optimize the display
      if (startSurah.trim().toLowerCase() === endSurah.trim().toLowerCase()) {
        return `${startSurah.trim()}: ${startVerse}-${endVerse}`
      }

      // If different surahs, keep the original format
      return memorization
    }

    // If it doesn't match the pattern, return as is
    return memorization
  }, [])

  // Memoized cache keys
  const cacheKeys = useMemo(() => ({
    userProfile: `user_profile_${userName}`,
    states: 'states_data',
    cities: (stateId: string) => `cities_${stateId}`
  }), [userName])

  // Optimized data loading with caching and parallel execution
  const loadAllData = useCallback(async () => {
    if (!userName) {
      setError(t('profile.username_required', 'Username is required'))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Check cache first for user profile
      const cachedProfile = ClientCache.get(cacheKeys.userProfile) as UserProfile | null
      if (cachedProfile) {
        setUserProfile(cachedProfile)
        setUserId(cachedProfile.id) // Set userId from cached profile

        // Show cached data immediately, then update in background
        setIsLoading(false)
      }

      // Check cache for states
      const statesData = ClientCache.get(cacheKeys.states) as ProvinceData[] | null

      // Parallel data fetching
      const promises: Promise<{ type: string; data: UserProfile | ProvinceData[] }>[] = []

      // Fetch user profile if not cached
      if (!cachedProfile) {
        promises.push(
          (async () => {
            // 1. Try fetching by ID directly first
            const detailRes = await usersApi.getById(userName);
            // usersApi.getById returns { success, data, error } from apiRequest
            if (detailRes.success && detailRes.data && (detailRes.data.id || detailRes.data.userId)) {
              console.log(`[Profile] Successfully loaded profile by ID: ${userName}`);
              ClientCache.set(cacheKeys.userProfile, detailRes.data, 300000);
              setUserId(detailRes.data.id || detailRes.data.userId);
              return { type: 'profile', data: detailRes.data };
            }

            console.log(`[Profile] getById did not return valid data for (${userName}), falling back to search...`);

            // 2. Fallback: search by username
            const res = await usersApi.search({ keyword: userName.replace(/^@/, '') });
            // usersApi.search returns { success, data, error } from apiRequest
            // res.data is the actual payload (array or paginated object)
            const payload = res.data;

            let users: any[] = [];
            if (Array.isArray(payload)) {
              users = payload;
            } else if (payload?.items && Array.isArray(payload.items)) {
              users = payload.items;
            } else if (payload?.data && Array.isArray(payload.data)) {
              users = payload.data;
            }

            const cleanTarget = userName.toLowerCase().replace('@', '');
            const targetUser = users.find((u: any) =>
              u.username?.toLowerCase().replace('@', '') === cleanTarget
            );

            if (targetUser) {
              const userIdToFetch = targetUser.userId || targetUser.id;
              console.log(`[Profile] Found user via search: ${targetUser.username} (${userIdToFetch}), fetching detail...`);

              if (userIdToFetch) {
                const detail2 = await usersApi.getById(userIdToFetch);
                if (detail2.success && detail2.data) {
                  ClientCache.set(cacheKeys.userProfile, detail2.data, 300000);
                  setUserId(detail2.data.id || detail2.data.userId);
                  return { type: 'profile', data: detail2.data };
                }
              }
            }

            console.log(`[Profile] User ${userName} not found.`);
            throw new Error(t('profile.user_not_found', 'User Not Found'));
          })()
        )
      }

      // Fetch states if not cached
      if (!statesData) {
        promises.push(
          fetchStates().then(result => {
            if (result.success) {
              const data = result.data || []
              ClientCache.set(cacheKeys.states, data, 3600000) // 1 hour cache
              return { type: 'states', data }
            }
            return { type: 'states', data: [] }
          })
        )
      }

      // Execute parallel requests
      const results = await Promise.allSettled(promises)

      let profileData = cachedProfile
      let currentStatesData = statesData || []

      // Process results
      let profileFetchError: string | null = null
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.type === 'profile') {
            profileData = result.value.data as UserProfile
            setUserProfile(profileData)
            setUserId(profileData.id) // Set userId from fetched profile
          } else if (result.value.type === 'states') {
            currentStatesData = result.value.data as ProvinceData[]
            // Provinces data updated in cache
          }
        } else if (result.status === 'rejected') {
          // Capture the actual error message from fetch
          profileFetchError = result.reason?.message || null
        }
      })

      if (!profileData) {
        throw new Error(profileFetchError || t('profile.user_not_found', 'User Not Found'))
      }

      // Update location info with proper names
      if (profileData?.stateId && currentStatesData.length > 0) {
        // Fetch cities for the state
        if (profileData?.cityId && profileData?.stateId) {
          const cityKey = cacheKeys.cities(profileData.stateId.toString())
          let citiesData = ClientCache.get(cityKey) as CityData[] | null

          if (!citiesData) {
            try {
              const cityResult = await fetchCities(profileData.stateId)
              if (cityResult.success) {
                citiesData = cityResult.data || []
                ClientCache.set(cityKey, citiesData, 1800000) // 30 minutes cache
              }
            } catch (error) {
              console.error("Error loading cities:", error)
              citiesData = []
            }
          }
        }
      }

    } catch (error) {
      console.error("Error loading profile data:", error)
      setError(t('profile.error_fetching_profile', 'An error occurred while fetching user profile'))
      const cachedUserProfile = ClientCache.get(cacheKeys.userProfile) as UserProfile | null
      if (!cachedUserProfile) {
        toast.error(t('profile.failed_load_profile', 'Failed to load user profile'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [userName, cacheKeys, t])

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Handle keyboard events for fullscreen modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showFullscreenAvatar && event.key === 'Escape') {
        setShowFullscreenAvatar(false)
      }
    }

    if (showFullscreenAvatar) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showFullscreenAvatar])

  const handleBack = () => {
    router.back()
  }

  const handleAvatarClick = () => {
    if (getAvatarSource()) {
      setShowFullscreenAvatar(true)
    }
  }


  const getAvatarSource = useCallback(() => {
    if (userProfile?.avatar && userProfile.avatar !== null && userProfile.avatar !== '') {
      return userProfile.avatar
    }

    return null
  }, [userProfile?.avatar])

  const initial = useMemo(() =>
    userProfile?.name ? getInitials(userProfile.name) : '?',
    [userProfile?.name]
  )

  // Preload avatar image for better performance
  useEffect(() => {
    const avatarUrl = getAvatarSource()
    if (avatarUrl) {
      const img = new window.Image()
      img.src = avatarUrl
      img.onload = () => setImageLoadError(false)
      img.onerror = () => setImageLoadError(true)
    }
  }, [getAvatarSource])

  useEffect(() => {
    const updatePageSize = () => {
      if (window.innerWidth < 768) {
        // Mobile (sm)
        setItemsPerPage(5)
      } else {
        // Laptop/desktop
        setItemsPerPage(10)
      }
    }

    // Jalankan pertama kali
    updatePageSize()

    // Jalankan ulang kalau window di-resize
    window.addEventListener("resize", updatePageSize)
    return () => window.removeEventListener("resize", updatePageSize)
  }, [])

  // Handle status changes from other pages/tabs
  const handleStatusChange = useCallback((friendId: string, status: string) => {
    // Update statusMap instead of users array
    setStatusMap(prevMap => ({
      ...prevMap,
      [friendId]: status as FriendStatus
    }))
  }, [])

  // Setup cross-tab status synchronization
  const { broadcastStatusChange } = useFriendStatusSync({
    userId: currentUserId,
    onStatusChange: handleStatusChange,
    enabled: !!currentUserId
  })

  // Clear recent changes after a delay
  const clearRecentChange = useCallback((userId: string) => {
    setTimeout(() => {
      recentChangesRef.current.delete(userId)
    }, 3000) // Clear after 3 seconds
  }, [])

  const handleAction = useCallback(async (targetUserId: string, action: 'send' | 'accept' | 'reject' | 'unfoll') => {
    if (!currentUserId) return

    setIsSubmitting(targetUserId)
    try {
      let result

      // Add retry mechanism for friend actions
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          switch (action) {
            case 'send':
              result = await sendFriendRequest(currentUserId, targetUserId)
              if (result.status === "success") {
                toast.success(toastMessages.friendRequestSent)

                // Track this change to prevent real-time overwrites
                recentChangesRef.current.add(targetUserId)
                clearRecentChange(targetUserId)

                // Update statusMap for instant UI feedback
                setStatusMap(prevMap => ({
                  ...prevMap,
                  [targetUserId]: "pending_sent"
                }))

                // Update checkedStatus if this is the profile user
                if (targetUserId === userId) {
                  setCheckedStatus("pending_sent")
                }

                // Broadcast status change to other pages
                broadcastStatusChange(targetUserId, "pending_sent")
              }
              break
            case 'accept':
              result = await acceptFriendRequest(targetUserId, currentUserId)
              if (result.status === "success") {
                toast.success(toastMessages.friendRequestAccepted)

                // Track this change to prevent real-time overwrites
                recentChangesRef.current.add(targetUserId)
                clearRecentChange(targetUserId)

                // Update statusMap for instant UI feedback
                setStatusMap(prevMap => ({
                  ...prevMap,
                  [targetUserId]: "friends"
                }))

                // Update checkedStatus if this is the profile user
                if (targetUserId === userId) {
                  setCheckedStatus("friends")
                }

                // Broadcast status change to other pages
                broadcastStatusChange(targetUserId, "friends")
              }
              break
            case 'reject':
              result = await rejectOrCancelFriendRequest(targetUserId, currentUserId)
              if (result.status === "success") {
                toast.success(toastMessages.friendRequestRejected)

                // Track this change to prevent real-time overwrites
                recentChangesRef.current.add(targetUserId)
                clearRecentChange(targetUserId)

                // Update statusMap for instant UI feedback
                setStatusMap(prevMap => ({
                  ...prevMap,
                  [targetUserId]: "not_friends"
                }))

                // Update checkedStatus if this is the profile user
                if (targetUserId === userId) {
                  setCheckedStatus("not_friends")
                }

                // Broadcast status change to other pages
                broadcastStatusChange(targetUserId, "not_friends")
              }
              break
            case 'unfoll':
              result = await unfriend(currentUserId, targetUserId)
              if (result.status === "success") {
                toast.success(toastMessages.friendRequestRejected)

                // Track this change to prevent real-time overwrites
                recentChangesRef.current.add(targetUserId)
                clearRecentChange(targetUserId)

                // Update statusMap for instant UI feedback
                setStatusMap(prevMap => ({
                  ...prevMap,
                  [targetUserId]: "not_friends"
                }))

                // Update checkedStatus if this is the profile user
                if (targetUserId === userId) {
                  setCheckedStatus("not_friends")
                }

                // Broadcast status change to other pages
                broadcastStatusChange(targetUserId, "not_friends")
              }
              break
          }
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            throw error; // Re-throw if max retries reached
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      // No need to refresh since we updated local state immediately
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error)

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Network error')) {
          toast.error(toastMessages.networkError)
        } else if (error.message.includes('timeout')) {
          toast.error(toastMessages.timeoutError)
        } else if (error.message.includes('Missing Supabase')) {
          toast.error(toastMessages.configError)
        } else {
          const actionText = action === 'send' ? 'send' : action === 'accept' ? 'accept' : 'reject'
          toast.error(t('search.messages.action_failed', `Failed to ${actionText} request`))
        }
      } else {
        const actionText = action === 'send' ? 'send' : action === 'accept' ? 'accept' : 'reject'
        toast.error(t('search.messages.action_failed', `Failed to ${actionText} request`))
      }
    } finally {
      setIsSubmitting(null)
    }
  }, [currentUserId, toastMessages, t, broadcastStatusChange, clearRecentChange, userId])

  // Handler untuk membuka dialog unfollow
  const handleUnfollowClick = useCallback((userId: string, userName: string) => {
    setUnfollowDialog({
      isOpen: true,
      userId,
      userName
    })
  }, [])

  // Handler untuk membuka dialog cancel request
  const handleRequestClick = useCallback((userId: string, userName: string) => {
    setCancelRequest({
      isOpen: true,
      userId,
      userName
    })
  }, [])

  // Handler untuk membatalkan unfollow
  const handleUnfollowCancel = useCallback(() => {
    setUnfollowDialog({ isOpen: false, userId: null, userName: '' })
  }, [])

  // Handler untuk konfirmasi unfollow
  const handleUnfollowConfirm = useCallback(async () => {
    if (!unfollowDialog.userId) return

    try {
      await handleAction(unfollowDialog.userId, 'unfoll')
      setUnfollowDialog({ isOpen: false, userId: null, userName: '' })
    } catch {
      // Error handling sudah ada di handleAction
    }
  }, [unfollowDialog.userId, handleAction])

  // Handler untuk konfirmasi cancel request
  const handleCancelRequestConfirm = useCallback(async () => {
    if (!cancelRequest.userId) return

    try {
      await handleAction(cancelRequest.userId, 'reject')
      setCancelRequest({ isOpen: false, userId: null, userName: '' })
    } catch {
      // Error handling sudah ada di handleAction
    }
  }, [cancelRequest.userId, handleAction])

  // Handler untuk cancel request dialog
  const handleRequestCancel = useCallback(() => {
    setCancelRequest({ isOpen: false, userId: null, userName: '' })
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return dateString
    const day = date.getDate().toString().padStart(2, "0")
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  // Format date with hour - Indonesian format (DD MMM YYYY, HH:MM)
  const formatDateWithHour = (date: string) => {
    const dt = new Date(date)
    if (Number.isNaN(dt.getTime())) return date
    const day = dt.getDate().toString().padStart(2, "0")
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const month = months[dt.getMonth()]
    const year = dt.getFullYear()
    const jam = dt.toLocaleTimeString('id-ID', {
      hour: "2-digit",
      minute: "2-digit"
    })

    return `${day} ${month} ${year}, ${jam}`
  }

  // Pagination for recaps (similar to admin/users)
  const totalRecaps = recaps.length
  const totalPages = Math.ceil(totalRecaps / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecaps = recaps.slice(startIndex, endIndex)
  const startItem = totalRecaps > 0 ? startIndex + 1 : 0

  // Safe avatar source getter to prevent duplicate requests to username path
  const safeGetAvatarSource = useCallback(() => {
    if (!userProfile) return null;

    // Check both avatar and image fields
    const imgSource = userProfile.avatar || (userProfile as any).image;

    if (!imgSource || imgSource.trim() === '') return null;

    // If it's already a full URL or data URI, return as is
    if (imgSource.startsWith('http') || imgSource.startsWith('data:')) {
      return imgSource;
    }

    // If it's a relative path, prepend API URL
    // Ensure we don't return just the username which causes recursive fetch
    if (imgSource === userProfile.username || imgSource === userProfile.nickname) {
      return null;
    }

    const apiUrl = process.env.NEXT_PUBLIC_MYQURANI_API_URL || '';
    const normalizedPath = imgSource.replace(/\\/g, '/');
    return `${apiUrl}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  }, [userProfile]);
  const endItem = Math.min(endIndex, totalRecaps)

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFollwers, setFilterFollowers] = useState<GetFriendData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // State untuk search following
  const [searchQueryFollowing, setSearchQueryFollowing] = useState('');
  const [filteredFollowing, setFilteredFollowing] = useState<GetFriendData[]>([]);
  const [hasSearchedFollowing, setHasSearchedFollowing] = useState(false);

  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false)
  const [openDialogReport, setOpenDialogReport] = useState<boolean>(false)
  const [dataReport, setDataReport] = useState({
    violation: "",
    title: "",
    detail: "",
    evidence: null as File | null,
    type: "",
    user_id: ""
  })


  // Handler untuk melakukan pencarian friends
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilterFollowers([]);
      setHasSearched(false);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const filtered = friendsData.followers.filter((friend) => {
      const fullName = (friend.name || '').toLowerCase();
      const username = (friend.username || '').toLowerCase().replace(/^@/, '');
      return fullName.includes(query) || username.includes(query);
    });

    setFilterFollowers(filtered);
    setHasSearched(true);
  }, [searchQuery, friendsData.followers]);

  // Handler untuk melakukan pencarian following
  const handleSearchFollowing = useCallback(() => {
    if (!searchQueryFollowing.trim()) {
      setFilteredFollowing([]);
      setHasSearchedFollowing(false);
      return;
    }

    const query = searchQueryFollowing.trim().toLowerCase();
    const filtered = friendsData.pendingSent.filter((friend) => {
      const fullName = (friend.name || '').toLowerCase();
      const username = (friend.username || '').toLowerCase().replace(/^@/, '');
      return fullName.includes(query) || username.includes(query);
    });

    setFilteredFollowing(filtered);
    setHasSearchedFollowing(true);
  }, [searchQueryFollowing, friendsData.pendingSent]);

  // Handler untuk keydown (Enter) - friends
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // Handler untuk keydown (Enter) - following
  const handleKeyDownFollowing = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchFollowing();
    }
  }, [handleSearchFollowing]);

  // Reset filtered friends ketika search query kosong
  useEffect(() => {
    if (!searchQuery.trim() && hasSearched) {
      setFilterFollowers([]);
      setHasSearched(false);
    }
  }, [searchQuery, hasSearched]);

  // Reset filtered following ketika search query kosong
  useEffect(() => {
    if (!searchQueryFollowing.trim() && hasSearchedFollowing) {
      setFilteredFollowing([]);
      setHasSearchedFollowing(false);
    }
  }, [searchQueryFollowing, hasSearchedFollowing]);

  const handleChangeReport = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDataReport((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChangeReport = (value: string) => {
    setDataReport((prev) => ({ ...prev, violation: value }));
  };

  const handleFileChangereport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDataReport((prev) => ({ ...prev, evidence: file }));
      const label = document.getElementById("file-label");
      if (label) label.textContent = file.name;
    }
  };

  const handleOpenDialogReport = (userId: string) => {
    setOpenDialogReport(true)
    setDataReport((prev) => ({
      ...prev,
      user_id: userId,
      type: "user"
    }))
  }

  const handleCloseDialogReport = () => {
    setOpenDialogReport(false)
    setDataReport({
      violation: "",
      title: "",
      detail: "",
      evidence: null,
      type: "",
      user_id: ""
    })
  }

  const handleSendReport = async () => {
    const supabase = await createClient();

    setIsLoadingReport(true)
    try {
      // 🪣 1️⃣ Jika ada file, upload dulu ke Supabase Storage
      let evidenceUrl = null

      if (dataReport.evidence) {
        const file = dataReport.evidence;
        const fileExt = file.name.split(".").pop();
        const fileName = `${generateId()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("report_evidence")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error("Upload failed:", uploadError.message);
          return { success: false, message: "Gagal mengunggah bukti laporan" };
        }

        // Dapatkan URL publik
        const { data: publicUrlData } = supabase.storage
          .from("report_evidence")
          .getPublicUrl(filePath);

        evidenceUrl = publicUrlData.publicUrl;
      }

      // 📨 2️⃣ Kirim data laporan ke server
      const result = await createReport({
        violation: dataReport.violation,
        title: dataReport.title,
        detail: dataReport.detail,
        evidence: evidenceUrl,
        type: dataReport.type,
        user_id: userProfile?.id,
      })

      if (result.success) {
        toast.success(t("success"))
      } else {
        toast.error(t("error"))
        console.log("err:", result.message)
      }
    } catch {
      toast.error(t("error"))
    } finally {
      setDataReport({
        violation: "",
        title: "",
        detail: "",
        evidence: null,
        type: "",
        user_id: ""
      })
      setIsLoadingReport(false)
      setOpenDialogReport(false);
    }
  }

  const [isMonitored, setIsMonitored] = useState(false);

  useEffect(() => {
    const checkMonitoring = async () => {
      if (!currentUserId || !userProfile?.id) {
        setIsMonitored(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_monitoring_records')
          .select('*')
          .eq('user_monitoring_id', currentUserId)
          .eq('user_id', userProfile.id);

        if (error) {
          console.error('Error checking monitoring:', error);
          setIsMonitored(false);
          return;
        }

        setIsMonitored(data && data.length > 0);
      } catch (err) {
        console.error('Unexpected error:', err);
        setIsMonitored(false);
      }
    };

    checkMonitoring();
  }, [currentUserId, userProfile?.id]);

  // Paraf functions
  const handleParafClick = (recapId: string, currentParafStatus: boolean) => {
    // Only allow giving paraf if not already given
    if (currentParafStatus) return

    setSelectedRecapForParaf(recapId)
    setIsParafDialogOpen(true)
  }

  const handleParafConfirm = async () => {
    if (!selectedRecapForParaf || !currentUserId || !currentProfile) return
    setIsUpdatingParaf(true)

    // Prepare signed_by data from currentProfile (only fields available from useAuth)
    const signedByData: UserProfile = {
      id: currentProfile.id,
      name: currentProfile.name,
      username: currentProfile.username,
      avatar: currentProfile.avatar,
      email: currentProfile.email,
      // Other fields will be null/undefined, but that's okay for optimistic update
      // Server will return full data after update
      nickname: null,
      bio: null,
      hp: null,
      gender: null,
      dob: null,
      job: null,
      countryName: null,
      stateName: null,
      cityName: null,
      countryId: null,
      stateId: null,
      cityId: null,
      role: null,
      isBlocked: null,
      isVerify: false,
      timezone: null,
      auth: '',
      created: null,
    }

    const signedAt = new Date().toISOString()

    // Store original values for revert
    const originalRecap = recaps.find(r => r.id === selectedRecapForParaf)
    const originalParaf = originalRecap?.paraf || false
    const originalSignedBy = originalRecap?.signed_by || null
    const originalSignedAt = originalRecap?.signed_at || null

    // Optimistic update (langsung ubah UI)
    setRecaps(prevRecaps =>
      prevRecaps.map(recap =>
        recap.id === selectedRecapForParaf
          ? {
            ...recap,
            paraf: true,
            signed_by: signedByData,
            signed_at: signedAt
          }
          : recap
      )
    )

    // Update paraf status in store
    setParafStatus(selectedRecapForParaf, true)

    try {
      // Kirim update ke server
      await updateRecapParaf(selectedRecapForParaf, true, currentUserId)

      // Re-fetch recaps to get complete signed_by data from server
      if (userId) {
        await fetchRecaps(userId)
      }

      toast.success(t("hasil-setoran.signature_success", "Paraf berhasil diberikan"))
    } catch (error) {
      console.error("Gagal memperbarui paraf:", error)

      // Revert perubahan jika gagal
      setRecaps(prevRecaps =>
        prevRecaps.map(recap =>
          recap.id === selectedRecapForParaf
            ? {
              ...recap,
              paraf: originalParaf,
              signed_by: originalSignedBy,
              signed_at: originalSignedAt
            }
            : recap
        )
      )

      // Revert paraf status in store
      setParafStatus(selectedRecapForParaf, false)

      toast.error(t("hasil-setoran.signature_failed", "Gagal memberikan paraf"))
    } finally {
      setIsParafDialogOpen(false)
      setIsUpdatingParaf(false)
      setSelectedRecapForParaf(null)
    }
  }

  const handleParafCancel = () => {
    setIsParafDialogOpen(false)
    setSelectedRecapForParaf(null)
  }

  // Show optimized loading with skeleton if no cached data
  if (isLoading) {
    return (
      <div className="min-h-screen transition-colors">
        <div className="max-w-7xl mx-auto animate-pulse">
          {/* Header Back + Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>

          {/* Profil Header Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex flex-col items-center">
              {/* Avatar Skeleton */}
              <div className="relative mb-4">
                <div className="h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-700 ring-4 ring-gray-100 dark:ring-gray-700"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 ring-4 ring-white dark:ring-gray-800"></div>
              </div>

              {/* Nama & Username */}
              <div className="h-7 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2"></div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>

              {/* Statistik */}
              <div className="grid grid-cols-3 gap-8 w-full max-w-sm mb-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="h-8 w-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg mb-1"></div>
                    <div className="h-4 w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>

              {/* Tombol Aksi */}
              <div className="flex gap-3 w-full max-w-xs justify-center">
                <div className="h-12 flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 px-4 py-4 flex items-center justify-center gap-2"
                >
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg hidden sm:block"></div>
                </div>
              ))}
            </div>

            {/* Tab Content: Profile Tab */}
            <div className="p-6 space-y-6">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>

              {/* Profile Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`relative p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/40 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm ${i === 7 ? 'sm:col-span-2 lg:col-span-3' : ''
                      }`}
                  >
                    <div className="absolute -top-3 left-5 w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 p-2 shadow-md ring-4 ring-white dark:ring-gray-900"></div>
                    <div className="mt-6 ml-2 space-y-2">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="h-5 w-32 bg-gray-300 dark:bg-gray-500 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6 relative">
            <User className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t('profile.user_not_found', 'User Not Found')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || t('profile.user_not_found_desc', 'The user you are looking for does not exist or has been removed.')}
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', 'Back')}
          </Button>
        </div>
      </div>
    )
  }




  if (userProfile)

    return (
      <>
        <div className="min-h-screen transition-colors">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-3 sm:mb-6">
              <button
                onClick={handleBack}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('profile.user_profile', 'User Profile')}
              </h1>
            </div>
            {/* Header Profil */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex flex-col items-center">
                <div className="relative group mb-4">
                  <div
                    className="relative cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={handleAvatarClick}
                  >
                    <Avatar className={`h-32 w-32 ring-4 ring-slate-200 dark:ring-slate-700 transition-all duration-500 ${safeGetAvatarSource()
                      ? 'group-hover:ring-emerald-300 dark:group-hover:ring-emerald-600 group-hover:shadow-2xl group-hover:shadow-emerald-500/25'
                      : ''
                      }`}>
                      {isLoading ? (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <>
                          {safeGetAvatarSource() ? (
                            <>
                              <AvatarImage
                                src={safeGetAvatarSource() || undefined}
                                alt={userProfile.name || 'User'}
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={() => {
                                  // console.error('Main avatar image failed to load')
                                  setImageLoadError(true)
                                }}
                                onLoad={() => {
                                  setImageLoadError(false)
                                }}
                              />
                              {imageLoadError && (
                                <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center rounded-full">
                                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t('profile.img_error', 'IMG ERROR')}</span>
                                </div>
                              )}
                            </>
                          ) : null}
                          <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 text-white shadow-lg">
                            {initial}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    {userId && <OnlineBadge isOnline={isOnline(userId)} size="lg" />}

                  </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center break-words">
                  {userProfile.nickname
                    ? `${userProfile.nickname} - ${userProfile.name}`
                    : userProfile.name}
                  {userProfile.isVerify && (
                    <Image
                      src="/icons/verified.webp"
                      alt="verified icon"
                      width={20}
                      height={20}
                      className="ml-1 inline align-middle mb-1"
                    />
                  )}
                </h1>


                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {userProfile.username}
                </p>

                {/* Statistik */}
                <div className="grid grid-cols-3 gap-8 w-full max-w-sm mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {recaps.length}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {t('profile_detail.recitation')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {friendsData.followers.length}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {t('profile_detail.follower')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {friendsData.pendingSent.length}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {t('profile_detail.following')}
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex gap-3 w-full max-w-xs justify-center">
                  {isOwnProfile && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push('/profile?edit=true')}
                      className="flex-1 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600 transition-all duration-200 py-5"
                    >
                      {t('profile.edit_profile')}
                    </Button>
                  )}
                  {(checkedStatus === 'friends' && !isOwnProfile) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => userId && handleUnfollowClick(userId, userProfile?.name || t('search.unknown', 'Unknown'))}
                      disabled={isSubmitting === userId || !userId}
                      className="border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-800 dark:hover:text-red-500 rounded-lg text-sm flex-1 py-5"
                    >
                      {t('profile_detail.unfollow')}
                    </Button>
                  )}
                  {(checkedStatus === 'pending_sent' && !isOwnProfile) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => userId && handleRequestClick(userId, userProfile?.name || t('search.unknown', 'Unknown'))}
                      className="border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-800 dark:hover:text-red-500 rounded-lg text-sm flex-1 py-5"
                    >
                      {t('profile_detail.unfollow')}
                    </Button>
                  )}
                  {(checkedStatus === 'not_friends' && !isOwnProfile) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => userId && handleAction(userId, 'send')}
                      disabled={isSubmitting === userId || !userId}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-md shadow-sm hover:shadow-md transition-all duration-200 py-5"
                    >
                      {t('profile_detail.follow')}
                    </Button>
                  )}
                  {(checkedStatus === 'pending_received' && !isOwnProfile) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => userId && handleAction(userId, 'accept')}
                      disabled={isSubmitting === userId}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-md shadow-sm hover:shadow-md transition-all duration-200 py-5"
                    >
                      {t('profile_detail.follow')}
                    </Button>
                  )}
                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 animate-in fade-in-0 zoom-in-95 duration-150"
                      >
                        <DropdownMenuItem
                          onSelect={() => handleOpenDialogReport(userProfile.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                        >
                          <FlagIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          {t('report.report')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigasi Tab */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-6">
              <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`
                      flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 relative flex items-center justify-center gap-2
                      ${activeTab === tab.id
                          ? "text-green-600 dark:text-teal-400"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}
                    `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:block">{tab.label}</span>
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 dark:bg-teal-400"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Isi Tab */}
              <div className="p-6 min-h-96">
                <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div
                      key="profile"
                      variants={tabVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            {t('profile_detail.profile_detail')}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                          <ProfileItem icon={<MapPin className="w-5 h-5" />} label={t('profile.city')} value={userProfile.cityName} color="rose" delay={0.35} />
                          <ProfileItem icon={<MapPinned className="w-5 h-5" />} label={t('profile.province')} value={userProfile.stateName} color="indigo" delay={0.4} />
                          <ProfileItem icon={<Globe className="w-5 h-5" />} label={t('profile.country')} value={userProfile.countryName} color="indigo" delay={0.45} />
                        </div>

                        {/* Bio – Full Width Premium Card */}
                        <div className="mt-8">
                          <ProfileItem
                            icon={<FileText className="w-6 h-6" />}
                            label="Bio"
                            value={userProfile.bio || "-"}
                            color="teal"
                            fullWidth
                            delay={0.5}
                          />
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {activeTab === 'deposits' && (
                    <motion.div
                      key="deposits"
                      variants={tabVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {(isMonitored || isOwnProfile) && (
                        <div>
                          {paginatedRecaps.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                              {/* Ilustrasi Animasi */}
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                                className="relative mb-8"
                              >
                                {/* Efek blur hijau lembut di belakang */}
                                <div className="absolute inset-0 blur-xl bg-gradient-to-br from-green-400 to-emerald-400 opacity-20 rounded-full"></div>

                                {/* Lingkaran utama dengan gradien hijau halus */}
                                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                                  <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                  >
                                    {/* Ikon dengan warna hijau yang konsisten */}
                                    <BookOpen className="w-12 h-12 text-green-600 dark:text-green-400" />
                                  </motion.div>
                                </div>
                              </motion.div>

                              {/* Judul Utama */}
                              <motion.h3
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
                              >
                                {t('profile.notification_recipients.no_recitation')}
                              </motion.h3>

                              {/* Deskripsi */}
                              <motion.p
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
                              >
                                {t('profile.notification_recipients.no_recitation_desc')}
                              </motion.p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                  {t('profile_detail.recitation_history')}
                                  <span className="text-sm font-medium">
                                    ({recaps.length})
                                  </span>
                                </h4>
                              </div>

                              {/* Enhanced Recitation Card */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {paginatedRecaps.map((recap) => {
                                  const hasConclusion = recap.conclusion?.trim();
                                  const conclusionKey = hasConclusion
                                    ? `notifikasi.${recap.conclusion?.toLowerCase().replace(/\s+/g, '_')}`
                                    : null;

                                  const handleProfileClick = (username?: string) => {
                                    if (username) {
                                      router.push(`/profile/${username.replace(/^@/, '')}`);
                                    }
                                  };

                                  return (
                                    <article
                                      key={recap.id}
                                      className={`
                                    group relative overflow-hidden rounded-xl border p-3 sm:p-4
                                    bg-white dark:bg-gray-900/20 border-gray-200 dark:border-blue-800/40
                                    transition-all hover:shadow-xl hover:-translate-y-0.5 
                                    animate-in slide-in-from-top-2 fade-in duration-500 hover:bg-slate-100/90 dark:hover:bg-slate-900
                                  `}
                                    >
                                      {/* Header: Time + Signature Badge */}
                                      <header className="flex items-center justify-between mb-2">
                                        <time
                                          className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium"
                                          dateTime={recap.created_at}
                                        >
                                          {getTimeAgo(recap.created_at!)}
                                        </time>

                                        {recap.id && (parafStatuses[recap.id] || recap.paraf) ? (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <div
                                                className="cursor-pointer flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 transition-transform group-hover:scale-110"
                                              >
                                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                              </div>
                                            </PopoverTrigger>

                                            <PopoverContent className="bg-white dark:bg-slate-900 shadow-lg rounded-xl p-4 w-64 border border-slate-200 dark:border-slate-700">
                                              <div className="flex items-center gap-3">
                                                <Link
                                                  href={`/profile/${recap.signed_by?.username?.replace(/^@/, '')}`}
                                                  className="relative flex justify-center items-center"
                                                >
                                                  <div className="inline-block rounded-full ring-4 ring-slate-100 dark:ring-slate-700">
                                                    <UserAvatar
                                                      user={{
                                                        id: recap.signed_by?.id || '',
                                                        name: recap.signed_by?.name || null,
                                                        username: recap.signed_by?.username || null,
                                                        avatar: recap.signed_by?.avatar || null,
                                                      }}
                                                      size="md"
                                                    />
                                                  </div>
                                                </Link>
                                                <div className="flex flex-col">
                                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                    {recap.signed_by?.name || 'unknown'}
                                                  </span>
                                                  <span className="text-sm text-slate-500">
                                                    @{recap.signed_by?.username?.replace(/^@/, '') || 'unknown'}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                                                <p className="text-xs text-slate-500">
                                                  {t("profile_detail.signed_on")}
                                                </p>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                  {formatDateWithHour(recap.signed_at!)}
                                                </p>
                                              </div>
                                            </PopoverContent>

                                          </Popover>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 w-6 p-0 rounded-full border-2 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-600"
                                            onClick={() => recap.id && handleParafClick(recap.id, parafStatuses[recap.id] || false)}
                                            title={t("hasil-setoran.click_to_give_signature")}
                                          >
                                            <Check className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                          </Button>
                                        )}
                                      </header>

                                      {/* Body: Recap Message */}
                                      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <p className="break-words hyphens-auto">
                                          {/* Recitation Type */}
                                          <span className="">
                                            {t('notifikasi.recap_completed_message', 'Recitation')}
                                          </span>{' '}

                                          <span className="font-bold capitalize">
                                            {recap.recitation_type || 'tahfidz'}
                                          </span>{' '}

                                          {/* Memorization Range */}
                                          <span className="font-bold text-purple-600 dark:text-purple-400">
                                            {optimizeMemorizationDisplay(recap.memorization || '')}
                                          </span>{' '}

                                          <span className="text-slate-600 dark:text-slate-400">
                                            {t('notifikasi.kepada_penguji', 'to')}
                                          </span>{' '}

                                          {/* Examiner Name */}
                                          <button
                                            onClick={() => handleProfileClick(String(recap.examiner?.username))}
                                            className={`
                                          font-bold text-blue-600 dark:text-blue-400 
                                          hover:text-blue-700 dark:hover:text-blue-300 
                                          rounded-sm transition-all
                                        `}
                                            aria-label={`Lihat profil ${recap.examiner?.name || 'penguji'}`}
                                          >
                                            {recap.examiner?.name || t('notifikasi.tidak_diketahui', 'Unknown')}
                                          </button>

                                          {/* Conclusion (if exists) */}
                                          {hasConclusion && (
                                            <>
                                              {' '}
                                              <span className="text-slate-600 dark:text-slate-400">
                                                {t('notifikasi.dengan_hasil', 'with result')}
                                              </span>{' '}
                                              <span
                                                className="font-bold text-emerald-600 dark:text-emerald-400"
                                              >
                                                {t(conclusionKey!, recap.conclusion)}
                                              </span>
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    </article>
                                  )
                                })}
                              </div>
                              {/* Pagination */}
                              {totalPages > 1 && (
                                <div className="flex flex-col-reverse gap-3 items-center pt-4">
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('profile.pagination.showing', 'Menampilkan {start} - {end} dari {total} setoran')
                                      .replace('{start}', startItem.toString())
                                      .replace('{end}', endItem.toString())
                                      .replace('{total}', totalRecaps.toString())}
                                  </div>
                                  <div className="flex items-center flex-wrap space-x-1">
                                    {/* Previous Button */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                      disabled={currentPage === 1}
                                      className="p-2"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    {/* Page Numbers */}
                                    {(() => {
                                      const pages = [] as React.ReactNode[]
                                      const showPages = 3
                                      let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
                                      const endPageLocal = Math.min(totalPages, startPage + showPages - 1)
                                      if (endPageLocal - startPage + 1 < showPages) {
                                        startPage = Math.max(1, endPageLocal - showPages + 1)
                                      }
                                      if (startPage > 1) {
                                        pages.push(
                                          <Button
                                            key={1}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(1)}
                                            className="px-3 py-2"
                                          >
                                            1
                                          </Button>
                                        )
                                        if (startPage > 2) {
                                          pages.push(
                                            <span key="ellipsis1" className="px-0.5 text-gray-500">...</span>
                                          )
                                        }
                                      }
                                      for (let i = startPage; i <= endPageLocal; i++) {
                                        pages.push(
                                          <Button
                                            key={i}
                                            variant={currentPage === i ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setCurrentPage(i)}
                                            className={`px-3 py-2 ${currentPage === i ? 'bg-gradient-to-r from-emerald-600 to-teal-600 dark:text-white' : ''}`}
                                          >
                                            {i}
                                          </Button>
                                        )
                                      }
                                      if (endPageLocal < totalPages) {
                                        if (endPageLocal < totalPages - 1) {
                                          pages.push(
                                            <span key="ellipsis2" className="px-0.5 text-gray-500">...</span>
                                          )
                                        }
                                        pages.push(
                                          <Button
                                            key={totalPages}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="px-3 py-2"
                                          >
                                            {totalPages}
                                          </Button>
                                        )
                                      }
                                      return pages
                                    })()}
                                    {/* Next Button */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                      disabled={currentPage === totalPages}
                                      className="p-2"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                        </div>
                      )}

                      {(!isMonitored && !isOwnProfile) && (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                          {/* Ilustrasi Animasi */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                            className="relative mb-8"
                          >
                            {/* Efek blur hijau lembut di belakang */}
                            <div className="absolute inset-0 blur-xl bg-gradient-to-br from-green-400 to-emerald-400 opacity-20 rounded-full"></div>

                            {/* Lingkaran utama dengan gradien hijau halus */}
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              >
                                {/* Ikon dengan warna hijau yang konsisten */}
                                <UserLock className="w-12 h-12 text-green-600 dark:text-green-400" />
                              </motion.div>
                            </div>
                          </motion.div>

                          {/* Judul Utama */}
                          <motion.h3
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
                          >
                            {t('profile_detail.not_notification_recepient')}
                          </motion.h3>

                          {/* Deskripsi */}
                          <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
                          >
                            {t('profile_detail.not_notification_recepient_desc')}
                          </motion.p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'friends' && (
                    <motion.div
                      key="friends"
                      variants={tabVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {friendsData.followers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                          {/* Ilustrasi Animasi */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                            className="relative mb-8"
                          >
                            {/* Efek blur hijau lembut di belakang */}
                            <div className="absolute inset-0 blur-xl bg-gradient-to-br from-green-400 to-emerald-400 opacity-20 rounded-full"></div>

                            {/* Lingkaran utama dengan gradien hijau halus */}
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              >
                                {/* Ikon dengan warna hijau yang konsisten */}
                                <UserX className="w-12 h-12 text-green-600 dark:text-green-400" />
                              </motion.div>
                            </div>
                          </motion.div>

                          {/* Judul Utama */}
                          <motion.h3
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
                          >
                            {t('profile_detail.no_data_title')}
                          </motion.h3>

                          {/* Deskripsi */}
                          <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
                          >
                            {t('profile_detail.user_not_follower')}
                          </motion.p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                          {/* Judul & Jumlah Teman */}
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            {t('profile_detail.follower')}
                            <span className="text-sm font-medium">
                              ({hasSearched ? filterFollwers.length : friendsData.followers.length})
                            </span>
                          </h4>

                          {/* Search Bar */}
                          <div className="flex items-center w-full sm:w-96">
                            <div
                              className="
                              relative flex flex-1 sm:w-72 md:w-80 
                              focus-within:[&>button]:bg-gradient-to-r 
                              focus-within:[&>button]:from-emerald-500 
                              focus-within:[&>button]:to-teal-500 
                              focus-within:[&>button]:text-white
                              focus-within:[&>button_svg]:text-white
                              transition-all duration-300
                            "
                            >
                              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />

                              <Input
                                placeholder={t('profile_detail.search_placeholder', 'Cari nama atau username...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="
                                pl-10 pr-4 h-10 text-sm 
                                rounded-l-xl rounded-r-none 
                                border border-r-0 border-gray-200 dark:border-gray-700 
                                bg-white/70 dark:bg-gray-800/40 
                                focus:!border-emerald-400 dark:focus:border-emerald-500 
                                outline-none !ring-0 transition-all duration-300
                              "
                              />

                              <button
                                onClick={handleSearch}
                                aria-label={t('profile_detail.search_button', 'Search')}
                                className="
                                group rounded-r-xl px-4 py-2 text-sm font-medium
                                text-gray-600 dark:text-gray-300
                                bg-gray-200 dark:bg-gray-700 
                                hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 
                                hover:text-white 
                                transition-all duration-300 
                                flex items-center gap-1
                              "
                              >
                                <Search className="h-4 w-4 group-hover:text-white transition-all duration-300" />
                                <span className="group-hover:text-white transition-all duration-300 hidden sm:inline">
                                  {t('profile_detail.search_button', 'Cari')}
                                </span>
                              </button>
                            </div>

                          </div>
                        </div>
                      )}



                      {/* No results message */}
                      {hasSearched && filterFollwers.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                          {/* Ilustrasi Animasi */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                            className="relative mb-8"
                          >
                            {/* Efek blur hijau lembut di belakang */}
                            <div className="absolute inset-0 blur-xl bg-gradient-to-br from-green-400 to-emerald-400 opacity-20 rounded-full"></div>

                            {/* Lingkaran utama dengan gradien hijau halus */}
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              >
                                {/* Ikon dengan warna hijau yang konsisten */}
                                <UserX className="w-12 h-12 text-green-600 dark:text-green-400" />
                              </motion.div>
                            </div>
                          </motion.div>

                          {/* Judul Utama */}
                          <motion.h3
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
                          >
                            {t('profile_detail.no_search_results')}
                          </motion.h3>

                          {/* Deskripsi */}
                          <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
                          >
                            {t('profile_detail.no_search_results_desc')}
                          </motion.p>
                        </div>

                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-5">
                        {(hasSearched ? filterFollwers : friendsData.followers)
                          .sort((a, b) => {
                            const order = ["friends", "pending_sent", "pending_received", "not_friends"];
                            const myId = currentUserId;

                            // 1) Jika a adalah current user, dia harus paling atas
                            if (a.id === myId && b.id !== myId) return -1;
                            if (b.id === myId && a.id !== myId) return 1;

                            // 2) Dapatkan status (fallback ke "not_friends")
                            const statusA = statusMap[a.id] || "not_friends";
                            const statusB = statusMap[b.id] || "not_friends";

                            // 3) Bandingkan berdasarkan prioritas status
                            const diff = order.indexOf(statusA) - order.indexOf(statusB);
                            if (diff !== 0) return diff;

                            // 4) Jika status sama, urutkan alfabet berdasarkan nama (A → Z)
                            return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
                          })
                          .map((friend) => {
                            const status = statusMap[friend.id];
                            return (
                              <FriendItem
                                key={friend.id}
                                friend={friend}
                                status={status}
                                currentUser={currentUserId || ''}
                                onAction={handleAction}
                                onUnfollowClick={handleUnfollowClick}
                                isSubmitting={isSubmitting}
                                t={t}
                              />
                            );
                          })}

                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'following' && (
                    <motion.div
                      key="following"
                      variants={tabVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {friendsData.pendingSent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                            className="relative mb-8"
                          >
                            {/* Efek blur hijau lembut di belakang */}
                            <div className="absolute inset-0 blur-xl bg-gradient-to-br from-green-400 to-emerald-400 opacity-20 rounded-full"></div>

                            {/* Lingkaran utama dengan gradien hijau halus */}
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              >
                                {/* Ikon dengan warna hijau yang konsisten */}
                                <UserX className="w-12 h-12 text-green-600 dark:text-green-400" />
                              </motion.div>
                            </div>
                          </motion.div>

                          {/* Judul Utama */}
                          <motion.h3
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
                          >
                            {t('profile_detail.no_data_title')}
                          </motion.h3>

                          {/* Deskripsi */}
                          <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
                          >
                            {t('profile_detail.user_not_following')}
                          </motion.p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                          {/* Judul & Jumlah Following */}
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            {t('profile_detail.following')}
                            <span className="text-sm font-medium">
                              ({hasSearchedFollowing ? filteredFollowing.length : friendsData.pendingSent.length})
                            </span>
                          </h4>

                          {/* Search Bar */}
                          <div className="flex items-center w-full sm:w-96">
                            <div
                              className="
                              relative flex flex-1 sm:w-72 md:w-80 
                              focus-within:[&>button]:bg-gradient-to-r 
                              focus-within:[&>button]:from-emerald-500 
                              focus-within:[&>button]:to-teal-500 
                              focus-within:[&>button]:text-white
                              focus-within:[&>button_svg]:text-white
                              transition-all duration-300
                            "
                            >
                              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />

                              <Input
                                placeholder={t('profile_detail.search_placeholder', 'Cari nama atau username...')}
                                value={searchQueryFollowing}
                                onChange={(e) => setSearchQueryFollowing(e.target.value)}
                                onKeyDown={handleKeyDownFollowing}
                                className="
                                pl-10 pr-4 h-10 text-sm 
                                rounded-l-xl rounded-r-none 
                                border border-r-0 border-gray-200 dark:border-gray-700 
                                bg-white/70 dark:bg-gray-800/40 
                                focus:!border-emerald-400 dark:focus:border-emerald-500 
                                outline-none !ring-0 transition-all duration-300
                              "
                              />

                              <button
                                onClick={handleSearchFollowing}
                                aria-label={t('profile_detail.search_button', 'Search')}
                                className="
                                group rounded-r-xl px-4 py-2 text-sm font-medium
                                text-gray-600 dark:text-gray-300
                                bg-gray-200 dark:bg-gray-700 
                                hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 
                                hover:text-white 
                                transition-all duration-300 
                                flex items-center gap-1
                              "
                              >
                                <Search className="h-4 w-4 group-hover:text-white transition-all duration-300" />
                                <span className="group-hover:text-white transition-all duration-300 hidden sm:inline">
                                  {t('profile_detail.search_button', 'Cari')}
                                </span>
                              </button>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* No results message */}
                      {hasSearchedFollowing && filteredFollowing.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                          {/* Ilustrasi Animasi */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                            className="relative mb-8"
                          >
                            {/* Efek blur hijau lembut di belakang */}
                            <div className="absolute inset-0 blur-xl bg-gradient-to-br from-green-400 to-emerald-400 opacity-20 rounded-full"></div>

                            {/* Lingkaran utama dengan gradien hijau halus */}
                            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                              <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                              >
                                {/* Ikon dengan warna hijau yang konsisten */}
                                <UserX className="w-12 h-12 text-green-600 dark:text-green-400" />
                              </motion.div>
                            </div>
                          </motion.div>

                          {/* Judul Utama */}
                          <motion.h3
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2"
                          >
                            {t('profile_detail.no_search_results', 'Tidak ada teman yang ditemukan')}
                          </motion.h3>

                          {/* Deskripsi */}
                          <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed"
                          >
                            {t('profile_detail.no_search_results_desc')}
                          </motion.p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-5">
                        {(hasSearchedFollowing ? filteredFollowing : friendsData.pendingSent)
                          .sort((a, b) => {
                            const order = ["friends", "pending_sent", "pending_received", "not_friends"];
                            const myId = currentUserId;

                            // 1) Jika a adalah current user, dia harus paling atas
                            if (a.id === myId && b.id !== myId) return -1;
                            if (b.id === myId && a.id !== myId) return 1;

                            // 2) Dapatkan status (fallback ke "not_friends")
                            const statusA = statusMap[a.id] || "not_friends";
                            const statusB = statusMap[b.id] || "not_friends";

                            // 3) Bandingkan berdasarkan prioritas status
                            const diff = order.indexOf(statusA) - order.indexOf(statusB);
                            if (diff !== 0) return diff;

                            // 4) Jika status sama, urutkan alfabet berdasarkan nama (A → Z)
                            return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
                          })
                          .map((friend) => {
                            const status = statusMap[friend.id];
                            return (
                              <FriendItem
                                key={friend.id}
                                friend={friend}
                                status={status}
                                currentUser={currentUserId || ''}
                                onAction={handleAction}
                                onUnfollowClick={handleUnfollowClick}
                                isSubmitting={isSubmitting}
                                t={t}
                              />
                            );
                          })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        {/* Alert Dialog untuk konfirmasi unfollow */}
        <AlertDialog open={unfollowDialog.isOpen} onOpenChange={(open) => !open && handleUnfollowCancel()}>
          <AlertDialogContent className="dark:bg-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('profile_detail.unfollow_confirm_title', 'Berhenti mengikuti pengguna')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('profile_detail.unfollow_confirm_message',
                  'Apakah Anda yakin ingin berhenti mengikuti {name}?'
                ).replace('{name}', unfollowDialog.userName)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row">
              <AlertDialogCancel
                className="cursor-pointer flex-1"
                onClick={handleUnfollowCancel}
              >
                {t('common.cancel', 'Batal')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleUnfollowConfirm}
              >
                <UserX className="h-4 w-4 mr-2" />
                {t('profile_detail.unfollow', 'Berhenti Mengikuti')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alert Dialog untuk konfirmasi requested */}
        <AlertDialog open={cancelRequest.isOpen} onOpenChange={(open) => !open && handleRequestCancel()}>
          <AlertDialogContent className="dark:bg-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('profile_detail.cancel_confirm_title', 'Batalkan permintaan pertemanan')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('profile_detail.cancel_confirm_message',
                  'Apakah Anda yakin ingin membatalkan permintaan pertemanan {name}?'
                ).replace('{name}', cancelRequest.userName)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row">
              <AlertDialogCancel
                className="cursor-pointer flex-1"
                onClick={handleRequestCancel}
              >
                {t('common.cancel', 'Batal')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelRequestConfirm}
              >
                <UserX className="h-4 w-4 mr-2" />
                {t('profile_detail.cancel_requested')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={openDialogReport}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setOpenDialogReport(true);
            } else {
              handleCloseDialogReport(); // otomatis reset dan tutup
            }
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {t('report.title')}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3 md:gap-5 mt-4 overflow-y-auto">
              {/* Jenis Pelanggaran */}
              <div className="space-y-2">
                <Label htmlFor="violation-type">{t('report.violation_type')}</Label>
                <Select onValueChange={handleSelectChangeReport}>
                  <SelectTrigger id="violation-type" className="w-full !ring-0 text-sm">
                    <SelectValue placeholder={t('report.violation_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="spam">{t('report.violation_options.spam')}</SelectItem>
                      <SelectItem value="harassment">{t('report.violation_options.harassment')}</SelectItem>
                      <SelectItem value="inappropriate">{t('report.violation_options.inappropriate')}</SelectItem>
                      <SelectItem value="scam">{t('report.violation_options.scam')}</SelectItem>
                      <SelectItem value="other">{t('report.violation_options.other')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Judul Laporan */}
              <div className="space-y-2">
                <Label htmlFor="report-title">{t('report.report_title')}</Label>
                <Input
                  id="report-title"
                  name="title"
                  placeholder={t('report.report_title_placeholder')}
                  onChange={handleChangeReport}
                  maxLength={100}
                  className="w-full !ring-0 text-sm"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {dataReport.title.length}/100 {t('report.char_count')}
                </p>
              </div>

              {/* Isi Laporan */}
              <div className="space-y-2">
                <Label htmlFor="report-description">{t('report.report_description')}</Label>
                <Textarea
                  id="report-description"
                  name="detail"
                  placeholder={t('report.report_description_placeholder')}
                  onChange={handleChangeReport}
                  maxLength={500}
                  className="min-h-24 resize-none !ring-0 text-sm"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {dataReport.detail.length}/500 {t('report.char_count')}
                </p>
              </div>

              {/* Unggah Bukti */}
              <div className="space-y-2">
                <Label htmlFor="evidence">{t('report.evidence_label')}</Label>

                <div className="group">
                  <Input
                    id="evidence"
                    name="evidence"
                    type="file"
                    accept="image/*,video/*,.pdf"
                    className="hidden"
                    onChange={handleFileChangereport}
                  />

                  <label
                    htmlFor="evidence"
                    id="file-label"
                    className={`
                    flex items-center justify-center w-full h-32 px-4 text-center
                    transition-all duration-200 ease-in-out
                    bg-white dark:bg-gray-800
                    border-2 border-dashed rounded-xl
                    border-gray-300 dark:border-gray-600
                    text-gray-600 dark:text-gray-400
                    cursor-pointer
                    hover:border-primary hover:bg-primary/5
                    focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2
                    group-hover:border-primary group-hover:bg-primary/5
                  `}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <svg
                        className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm font-medium">
                        {t('report.evidence_upload_text')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('report.evidence_hint')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div
                className="flex gap-2 items-start text-xs
              text-amber-800 dark:text-amber-200
              bg-amber-50 dark:bg-amber-900/30
              p-3 rounded-lg border border-amber-200 dark:border-amber-700"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <strong className="font-medium">
                    {t('report.warning_title')}
                  </strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>{t('report.warning_items.one')}</li>
                    <li>{t('report.warning_items.two')}</li>
                    <li>{t('report.warning_items.three')}</li>
                  </ul>
                </div>
              </div>


              {/* Tombol Aksi */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCloseDialogReport}
                >
                  {t('report.button_cancel')}
                </Button>
                <Button
                  disabled={!dataReport.detail || !dataReport.title || !dataReport.violation || isLoadingReport}
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    handleSendReport()
                  }}
                >
                  {isLoadingReport && (
                    <div className="w-4 h-4 animate-spin rounded-full border-x-2 border-t-2 border-gray-300" />
                  )}
                  {t('report.button_send')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Paraf Confirmation Dialog */}
        <Dialog open={isParafDialogOpen} onOpenChange={setIsParafDialogOpen}>
          <DialogContent className="">
            <DialogHeader>
              <DialogTitle className="text-base md:text-xl font-bold text-slate-700 dark:text-slate-200">
                {t("hasil-setoran.signature_confirmation", "Konfirmasi Paraf")}
              </DialogTitle>
            </DialogHeader>

            <DialogFooter className="sm:gap-2 flex flex-row justify-center">
              <Button
                variant="outline"
                onClick={handleParafCancel}
                className="px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base border-none 
                          dark:bg-slate-500/50 hover:border-slate-300 bg-slate-200 dark:hover:border-slate-600 
                          text-slate-700 dark:text-slate-200 flex-1"
              >
                {t("hasil-setoran.cancel", "Batal")}
              </Button>
              <Button
                disabled={isUpdatingParaf}
                onClick={handleParafConfirm}
                className={`px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-base 
                  bg-gradient-to-r from-emerald-600 to-teal-600 
                  hover:from-emerald-700 hover:to-teal-700 text-white flex-1
                  ${isUpdatingParaf ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                {isUpdatingParaf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  t("hasil-setoran.signature_confirmation_button", "Berikan Paraf")
                )}
              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>
      </>
    )
}

function LoadingFallback() {
  return <SkeletonDetailPage showAvatar infoRows={6} />
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UserProfileContent />
    </Suspense>
  )
}