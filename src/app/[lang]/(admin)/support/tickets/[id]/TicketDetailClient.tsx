"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SkeletonDetailPage } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowLeft,
    Send,
    Paperclip,
    AlertCircle,
    Clock,
    Plus,
    Trash2,
    MessageSquare,
    StickyNote,
    ChevronDown,
    X,
    Image,
    Loader2,
    Check,
    CheckCircle,
    Bell,
    Layers,
    ListChecks,
    PanelRight,
    Edit,
    Save,
    UserCheck,
    Tag,
    RefreshCw,
} from "lucide-react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNowStrict, format, parseISO } from "date-fns"


import {
    type TicketListItem,
    type TicketReply,
    fetchTicketRepliesPage
} from "@/utils/api/tickets/fetch"
import { createTicketReply } from "@/utils/api/tickets/insert"
import { updateTicketStatus, updateTicketPriority } from "@/utils/api/tickets/update"
import { uploadMultipleAttachments } from "@/utils/api/tickets/upload"
import { useAuth } from "@/hooks/use-auth"
// import { createClient } from "@/utils/supabase/client"
import { type RegularUser } from "@/utils/api/users/fetch-users"
import { cn } from "@/lib/utils"

type DetailTab = "reply" | "note" | "reminder" | "others" | "task"

interface Note {
    id: string
    content: string
    author: string
    date: string
}

interface Reminder {
    id: string
    title: string
    date: string
    dueAt?: string
    notifyEmail: boolean
    staff: string
    ticketId?: string
    ticketSubject?: string
    ticketNumber?: string
    createdAt?: string
}

interface Task {
    id: string
    title: string
    status: "pending" | "in_progress" | "completed"
    assignee: string
    dueDate: string
}

interface TicketDetailClientProps {
    ticketId: string
    backUrl?: string
    initialTicket: TicketListItem | null
    initialReplies: TicketReply[]
    initialRelatedTickets: TicketListItem[]
    initialUsers: RegularUser[]
}

// Extend TicketListItem with replies for local state compatibility if needed, or manage separately
// The existing code expected `TicketWithReplies` which has `replies: TicketReply[]` embedded.
// We can reconstruct that structure or adapt the state.
// Let's reconstruct it to minimize churn in render logic.
type TicketState = TicketListItem & { replies: TicketReply[] }
type RelatedMatchSource = "Department" | "Contact"
type RelatedTicketItem = TicketListItem & { relatedBy: RelatedMatchSource[] }


export default function TicketDetailClient({
    ticketId,
    backUrl = "/support/tickets",
    initialTicket,
    initialReplies,
    initialRelatedTickets,
    initialUsers
}: TicketDetailClientProps) {
    const router = useRouter()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { profile } = useAuth()


    const [notes, setNotes] = useState<Note[]>([])
    const [newNote, setNewNote] = useState("")
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [newReminder, setNewReminder] = useState({ title: "", date: "", notifyEmail: false, staff: "" })
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState({ title: "", assignee: "", dueDate: "" })

    // UI States for Responsive Layout (Simplified for 2-col)
    const [showInfoPanel, setShowInfoPanel] = useState(false) // For mobile toggling only
    const [textareaHeight, setTextareaHeight] = useState("auto")

    // Auto-resize textarea
    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextareaHeight("auto") // Reset height
        const newHeight = `${Math.max(80, e.target.scrollHeight)}px`
        setTextareaHeight(newHeight)
        setReplyContent(e.target.value)
    }

    useEffect(() => {
        const savedNotes = localStorage.getItem(`ticket_${ticketId}_notes`)
        const savedReminders = localStorage.getItem(`ticket_${ticketId}_reminders`)
        const savedTasks = localStorage.getItem(`ticket_${ticketId}_tasks`)
        if (savedNotes) setNotes(JSON.parse(savedNotes))
        if (savedReminders) setReminders(JSON.parse(savedReminders))
        if (savedTasks) setTasks(JSON.parse(savedTasks))
    }, [ticketId])

    const saveNotes = (newNotes: Note[]) => {
        setNotes(newNotes)
        localStorage.setItem(`ticket_${ticketId}_notes`, JSON.stringify(newNotes))
    }

    const saveReminders = (newReminders: Reminder[]) => {
        setReminders(newReminders)
        localStorage.setItem(`ticket_${ticketId}_reminders`, JSON.stringify(newReminders))
        window.dispatchEvent(new Event("ticket-reminder-updated"))
    }

    const saveTasks = (newTasks: Task[]) => {
        setTasks(newTasks)
        localStorage.setItem(`ticket_${ticketId}_tasks`, JSON.stringify(newTasks))
    }

    const [activeTab, setActiveTab] = useState<DetailTab>("reply")
    const [replyContent, setReplyContent] = useState("")

    // Initialize ticket state with SSR data, also load cached replies
    const [ticket, setTicket] = useState<TicketState | null>(() => {
        if (!initialTicket) return null;

        // Try to load cached replies from localStorage
        if (typeof window !== 'undefined') {
            const cachedReplies = localStorage.getItem(`ticket_replies_${ticketId}`);
            if (cachedReplies) {
                try {
                    const parsed = JSON.parse(cachedReplies);
                    // Merge: API replies first, then cached (dedupe by id)
                    const merged = [...initialReplies];
                    parsed.forEach((cachedReply: any) => {
                        if (!merged.some((r: any) => r.id === cachedReply.id)) {
                            merged.push(cachedReply);
                        }
                    });
                    // Sort by date
                    merged.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    return { ...initialTicket, replies: merged };
                } catch (e) {
                    console.error('Failed to parse cached replies:', e);
                }
            }
        }
        return { ...initialTicket, replies: initialReplies };
    })

    const [ticketStatus, setTicketStatus] = useState(initialTicket?.status || "Open")
    const [ticketPriority, setTicketPriority] = useState(initialTicket?.priority || "Medium")
    const [showSaveSuccess, setShowSaveSuccess] = useState(false)

    // Split loading states - Initial is false because we have SSR data
    const [isTicketLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const [relatedTickets, setRelatedTickets] = useState<RelatedTicketItem[]>(() =>
        initialRelatedTickets.map((item) => ({ ...item, relatedBy: [] }))
    )
    const [isLoadingRelated, setIsLoadingRelated] = useState(false)

    // Admin list for assignee
    const [adminUsers, setAdminUsers] = useState<{ id: string; name: string; email: string; role?: string }[]>([])
    const [selectedAssignee, setSelectedAssignee] = useState<{ id: string; name: string; email: string } | null>(null)
    const [assigneeSearch, setAssigneeSearch] = useState("")
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
    const [isSavingAssignee, setIsSavingAssignee] = useState(false)
    const assigneeDropdownRef = useRef<HTMLDivElement>(null)



    // Tags
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")

    // Hydrate local storage fields
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedTags = JSON.parse(localStorage.getItem(`ticket_${ticketId}_tags`) || '[]')
                if (Array.isArray(savedTags) && savedTags.length > 0) setTags(savedTags)

                const savedAssignee = JSON.parse(localStorage.getItem(`ticket_${ticketId}_assignee`) || 'null')
                if (savedAssignee) setSelectedAssignee(savedAssignee)
            } catch (e) {
                console.warn('Hydration error:', e)
            }
        }
    }, [ticketId, initialTicket])


    // Pagination State
    const [repliesLimit] = useState(20)
    const [repliesOffset, setRepliesOffset] = useState(20) // We already loaded 0-20
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMoreReplies, setHasMoreReplies] = useState(initialReplies.length >= 20) // Simple heuristic

    // Save replies to localStorage when they change
    useEffect(() => {
        if (ticket?.replies && ticket.replies.length > 0) {
            localStorage.setItem(`ticket_replies_${ticketId}`, JSON.stringify(ticket.replies));
        }
    }, [ticket?.replies, ticketId]);

    // Attachment states
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [filePreviews, setFilePreviews] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)


    // Realtime subscription (Supabase removed to fully use API)
    /*
    useEffect(() => {
        let supabase
        try {
            supabase = createClient()
        } catch (error) {
            console.error("Failed to init realtime client:", error)
            return
        }
        const channel = supabase
            .channel(`ticket-${ticketId}-replies`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "ticket_replies",
                    filter: `ticket_id=eq.${ticketId}`,
                },
                (payload) => {
                    console.log("🔔 New reply for ticket:", ticketId, payload)
                    // Optimization: Append reply directly instead of refetching
                    const newReply = payload.new as TicketReply
                    setTicket(prev => {
                        if (!prev) return null
                        // Check if already exists to avoid dupes
                        // Compare by: ID (for real replies) OR (message + author + recent time) for optimistic replies
                        const existingIndex = prev.replies.findIndex(r => {
                            // Match by real ID
                            if (r.id === newReply.id) return true
                            // Match by content + author (for optimistic replies with temp ID)
                            // Extended time window to 60 seconds to handle upload delays
                            const rTime = new Date(r.date).getTime()
                            const newTime = new Date(newReply.date).getTime()
                            const isRecent = Math.abs(newTime - rTime) < 60000 // 60 seconds for upload time
                            if (isRecent && r.message === newReply.message && r.author === newReply.author) {
                                console.log("🔄 Found matching optimistic reply, will replace")
                                return true
                            }
                            return false
                        })

                        if (existingIndex !== -1) {
                            // Replace optimistic reply with real one from database
                            const updatedReplies = [...prev.replies]
                            updatedReplies[existingIndex] = newReply
                            console.log("✅ Replaced optimistic reply with real reply:", newReply.id)
                            return { ...prev, replies: updatedReplies }
                        }

                        // No match found, prepend as new (latest first)
                        return { ...prev, replies: [newReply, ...prev.replies] }
                    })
                }
            )
            .subscribe()

        return () => {
            supabase?.removeChannel(channel)
        }
    }, [ticketId]) // Removed loadTicketon mount
    */

    // Scroll to bottom on mount ONLY
    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty deps ensures this runs once on mount

    const handleLoadMoreReplies = async () => {
        setIsLoadingMore(true)
        try {
            // Note: To mimic "load older", we might need to adjust query. 
            // Current assumption: replies are sorted ASC (oldest top). 
            // "Load More" usually means loading *next page* of replies? 
            // The user request said "header cepat + replies paginated".
            // If we want "infinite scroll" downwards, we fetch next offset.
            // If we want "load previous" (like Slack), it's different.
            // Typically tickets are linear timeline. 
            // Let's assume standard "Show more" at bottom or "Load older" at top?
            // Usually ticket system shows OLDEST first.

            const result = await fetchTicketRepliesPage(parseInt(ticketId), repliesLimit, repliesOffset)
            if (result.success && result.data) {
                if (result.data.length < repliesLimit) {
                    setHasMoreReplies(false)
                }

                setTicket(prev => {
                    if (!prev) return null
                    // Use Map to dedupe
                    const combined = [...prev.replies, ...result.data!]
                    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())
                    // Sort just in case
                    unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    return { ...prev, replies: unique }
                })
                setRepliesOffset(prev => prev + repliesLimit)
            } else {
                setHasMoreReplies(false)
            }
        } catch (err) {
            console.error("Error loading more replies", err)
        } finally {
            setIsLoadingMore(false)
        }
    }


    const filteredUsers = adminUsers.filter(user =>
        user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(assigneeSearch.toLowerCase())
    )



    // Load saved assignee
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`ticket_${ticketId}_assignee`)
            if (saved) setSelectedAssignee(JSON.parse(saved))
        } catch { }
    }, [ticketId])

    const getStatusConfig = (status: string) => {
        // Perfex Style: Often simple badges or text colors
        const config: Record<string, { label: string; className: string; bgClass: string; icon: React.ReactNode }> = {
            Open: {
                label: 'Open',
                className: 'text-red-700 dark:text-red-400',
                bgClass: 'bg-red-500',
                icon: <AlertCircle className="w-3.5 h-3.5" />
            },
            "In Progress": {
                label: 'In Progress',
                className: 'text-yellow-700 dark:text-yellow-400',
                bgClass: 'bg-yellow-500',
                icon: <Clock className="w-3.5 h-3.5" />
            },
            Answered: {
                label: 'Answered',
                className: 'text-blue-700 dark:text-blue-400',
                bgClass: 'bg-blue-500',
                icon: <MessageSquare className="w-3.5 h-3.5" />
            },
            "On Hold": {
                label: 'On Hold',
                className: 'text-gray-700 dark:text-gray-400',
                bgClass: 'bg-gray-500',
                icon: <Clock className="w-3.5 h-3.5" />
            },
            Closed: {
                label: 'Closed',
                className: 'text-green-700 dark:text-green-400',
                bgClass: 'bg-green-500',
                icon: <CheckCircle className="w-3.5 h-3.5" />
            },
        }
        return config[status] || { label: status, className: 'text-gray-700', bgClass: 'bg-gray-500', icon: null }
    }



    const resolveTimezone = () => {
        const isValidTimezone = (tz: string) => {
            try {
                new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date())
                return true
            } catch {
                return false
            }
        }

        let cachedTimezone = ""
        try {
            const raw = localStorage.getItem('myqurani_user_profile_v2')
            if (raw) {
                const parsed = JSON.parse(raw)
                cachedTimezone = String(parsed?.timezone || "").trim()
            }
        } catch {
            // no-op
        }

        const fromProfile = String(profile?.timezone || "").trim()
        const preferred = cachedTimezone || fromProfile
        if (preferred && isValidTimezone(preferred)) return preferred
        if (fromProfile && isValidTimezone(fromProfile)) return fromProfile
        return "UTC"
    }

    const userTimezone = resolveTimezone()

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return "-"
        try {
            let dateStr = dateString
            if (!dateStr.includes('Z') && !dateStr.includes('+')) {
                if (dateStr.includes(' ')) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z'
                } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
                    dateStr = dateStr + ':00Z'
                }
            }
            const date = new Date(dateStr)
            if (Number.isNaN(date.getTime())) return dateString

            // Timezone-aware formatting — shows time in viewer's own timezone + abbreviation
            return new Intl.DateTimeFormat('en-GB', {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: userTimezone,
                timeZoneName: "short",  // WIB / BST / GMT / EST dll
            }).format(date)
        } catch {
            return dateString
        }
    }

    const formatRelativeTime = (dateString: string | null) => {
        if (!dateString) return "-"
        try {
            let dateStr = dateString
            if (!dateStr.includes('Z') && !dateStr.includes('+')) {
                if (dateStr.includes(' ')) {
                    dateStr = dateStr.replace(' ', 'T') + 'Z'
                } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
                    dateStr = dateStr + ':00Z'
                }
            }
            const date = parseISO(dateStr)
            if (Number.isNaN(date.getTime())) return dateString

            return formatDistanceToNowStrict(date, { addSuffix: true })
        } catch {
            return dateString
        }
    }

    const isUserMessage = (author: string) => {
        if (!ticket) return false
        return author.toLowerCase() === (ticket.contact || '').toLowerCase()
    }

    // File picker handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        // Max 2 files
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        const validFiles = files.filter(f => allowedTypes.includes(f.type))

        if (validFiles.length !== files.length) {
            alert("Only image files (jpg, png, gif, webp) are allowed")
        }

        const totalFiles = [...selectedFiles, ...validFiles].slice(0, 2)
        setSelectedFiles(totalFiles)

        // Generate previews
        totalFiles.forEach((file, index) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                setFilePreviews(prev => {
                    const newPreviews = [...prev]
                    newPreviews[index] = e.target?.result as string
                    return newPreviews
                })
            }
            reader.readAsDataURL(file)
        })

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
        setFilePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleSendMessage = async () => {
        if ((!replyContent.trim() && selectedFiles.length === 0) || !ticket) return
        setIsSending(true)

        const authorName = profile?.name || "Admin"
        const messageContent = replyContent.trim()
        let attachmentUrls: string[] = []

        try {
            // Upload attachments first if any
            if (selectedFiles.length > 0) {
                setIsUploading(true)
                const uploadResult = await uploadMultipleAttachments(selectedFiles, ticket.id)
                setIsUploading(false)

                if (!uploadResult.success) {
                    console.error("Upload errors:", uploadResult.errors)
                    alert("Failed to upload some files: " + (uploadResult.errors?.join(", ") || "Unknown error"))
                }

                if (uploadResult.urls) {
                    attachmentUrls = uploadResult.urls
                }
            }

            const attachmentsJson = attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null

            const optimisticReply = {
                id: Date.now(),
                ticket_id: ticket.id,
                author: authorName,
                message: messageContent || (attachmentUrls.length > 0 ? "📎 Attachment" : ""),
                date: new Date().toISOString(),
                attachments: attachmentsJson
            }

            setTicket(prev => prev ? { ...prev, replies: [optimisticReply, ...prev.replies] } : prev)
            setReplyContent("")
            setSelectedFiles([])
            setFilePreviews([])


            // Use client-side API to send reply
            const { ticketsApi, getStoredAuth } = await import('@/lib/api')
            const auth = getStoredAuth()

            let replySuccess = false
            let apiError: string | null = null

            // Deteksi tiket Supabase (ID kecil) vs MyQurani (18 digit snowflake ID)
            const isSupabaseTicket = ticket.id < 1_000_000;

            if (auth?.accessToken && !isSupabaseTicket) {
                console.log('[Reply] Sending reply to ticket:', ticket.id)
                console.log('[Reply] User roles:', auth.roles)
                console.log('[Reply] User name:', auth.name)
                try {
                    const replyResult = await ticketsApi.replyTicket(
                        ticket.id,
                        { name: authorName, message: messageContent || "📎 Attachment" },
                        auth.accessToken
                    )
                    console.log('[Reply] API response:', replyResult)

                    if (replyResult?.success === false || replyResult?.error) {
                        apiError = replyResult?.message || replyResult?.error || 'Unknown error'
                        console.warn('[Reply] API returned error (expected for Supabase tickets):', apiError)
                    } else {
                        replySuccess = true
                    }
                } catch (apiErr: any) {
                    // API threw an error (400, 403, etc.) — expected for Supabase-only tickets
                    apiError = apiErr?.message || 'API request failed'
                    console.warn('[Reply] API failed (non-critical for Supabase tickets):', apiError)

                    // If it's "Access denied", the API might have still saved the reply
                    // This happens when API returns 403 but data is saved (backend bug)
                    if (apiError?.includes('Access denied') || apiError?.includes('403')) {
                        console.log('[Reply] Access denied - will refresh to check if saved')
                    }
                }
            }

            // Jika API gagal (termasuk tiket Supabase yg tidak ada di MyQurani),
            // simpan reply ke Supabase sebagai fallback
            if (!replySuccess) {
                try {
                    const sbResult = await createTicketReply({
                        ticket_id: ticket.id,
                        author: authorName,
                        message: messageContent || (attachmentUrls.length > 0 ? "📎 Attachment" : ""),
                        attachments: attachmentsJson || undefined,
                        isFromAdmin: true
                    })
                    if (sbResult.success) {
                        replySuccess = true
                        console.log('[Reply] Saved to Supabase successfully')
                    } else {
                        apiError = sbResult.error || 'Supabase save failed'
                        console.error('[Reply] Supabase save failed:', apiError)
                    }
                } catch (serverErr: any) {
                    apiError = serverErr?.message || 'Server action failed'
                    console.error('[Reply] Server action failed:', apiError)
                }
            }

            // Show appropriate feedback
            if (replySuccess) {
                showSuccessToast()
            } else if (apiError) {
                // Don't show alert for "Access denied" - might be backend issue
                // Just log it and refresh to see actual state
                if (!apiError.includes('Access denied')) {
                    console.warn('[Reply] Reply may have failed:', apiError)
                }
            }

            // Refresh ticket from server to sync actual state
            // This handles cases where API returns error but data was saved
            // Refresh ticket logic removed to prevent redundant requests as per user request
            // We rely on optimistic updates and manual refresh if needed
            /*
            setTimeout(async () => {
                try {
                    const { fetchTicketById } = await import('@/utils/api/tickets/fetch')
                    const refreshResult = await fetchTicketById(ticket.id)
                    if (refreshResult.success && refreshResult.data) {
                        console.log('[Reply] Refreshed ticket, replies:', refreshResult.data.replies?.length)
                        setTicket(refreshResult.data)
                    }
                } catch (refreshErr) {
                    console.error('[Reply] Failed to refresh ticket:', refreshErr)
                }
            }, 1000)
            */

            // Update status if needed
            const newStatus = ticketStatus === "Open" ? "Answered" : ticketStatus
            if (newStatus !== ticketStatus) {
                await updateTicketStatus(ticket.id, newStatus)

                setTicketStatus(newStatus)
            }
        } catch (error) {
            console.error("Error sending reply:", error)
            // Revert optimistic update by removing the last reply
            setTicket(prev => prev ? {
                ...prev,
                replies: prev.replies.slice(1)
            } : prev)
            setReplyContent(messageContent)
            alert('Failed to send reply. Please try again.')
        } finally {
            setIsSending(false)
            setIsUploading(false)
        }
    }



    const handlePriorityChange = async (newPriority: string) => {
        if (!ticket) return
        try {
            const result = await updateTicketPriority(ticket.id, newPriority)
            if (result.success) {
                setTicketPriority(newPriority)
                showSuccessToast()
            }
        } catch (error) {
            console.error("Error updating priority:", error)
        }
    }



    const handleAddNote = () => {
        if (!newNote.trim()) return
        const note: Note = { id: Date.now().toString(), content: newNote, author: profile?.name || "Admin", date: new Date().toISOString() }
        saveNotes([...notes, note])
        setNewNote("")
        showSuccessToast()
    }

    // Pure string parser — NO new Date(), NO timezone conversion.
    // Converts "2026-04-20T08:34" → "20 Apr 2026 08:34"
    const formatReminderDateForDisplay = (datetimeLocal: string): string => {
        const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        const m = datetimeLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
        if (!m) return datetimeLocal
        const [, yr, mo, dy, hr, mn] = m
        const monthName = MONTHS[parseInt(mo, 10) - 1] ?? mo
        return `${dy} ${monthName} ${yr} ${hr}:${mn}`
    }

    const handleAddReminder = () => {
        if (!newReminder.title.trim() || !newReminder.date) return
        const createdAt = new Date().toISOString()
        // Store the date as a pre-formatted display string (no timezone conversion ever)
        const reminder: Reminder = {
            id: Date.now().toString(),
            title: newReminder.title,
            date: formatReminderDateForDisplay(newReminder.date),
            dueAt: newReminder.date,
            notifyEmail: newReminder.notifyEmail,
            staff: newReminder.staff,
            ticketId: String(ticketId),
            ticketSubject: ticket?.subject || "",
            ticketNumber: ticket?.ticket_number || `#${ticketId}`,
            createdAt,
        }
        saveReminders([...reminders, reminder])
        setNewReminder({ title: "", date: "", notifyEmail: false, staff: "" })
        showSuccessToast()
    }

    const handleDeleteReminder = (reminderId: string) => {
        saveReminders(reminders.filter(r => r.id !== reminderId))
        showSuccessToast()
    }

    const handleAddTask = () => {
        if (!newTask.title.trim()) return
        const task: Task = { id: Date.now().toString(), title: newTask.title, status: "pending", assignee: newTask.assignee || profile?.name || "Admin", dueDate: newTask.dueDate }
        saveTasks([...tasks, task])
        setNewTask({ title: "", assignee: "", dueDate: "" })
        showSuccessToast()
    }

    const handleUpdateTaskStatus = (taskId: string, status: Task["status"]) => {
        saveTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
        showSuccessToast()
    }

    const handleDeleteTask = (taskId: string) => {
        saveTasks(tasks.filter(t => t.id !== taskId))
        showSuccessToast()
    }

    const showSuccessToast = () => {
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 2000)
    }

    // ---- Helper to update cache ----
    const updateTicketCache = (updates: Partial<TicketState>) => {
        if (!ticket) return;
        try {
            const cacheKey = `ticket_cache_${ticket.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                localStorage.setItem(cacheKey, JSON.stringify({ ...parsed, ...updates }));
            } else {
                localStorage.setItem(cacheKey, JSON.stringify({ ...ticket, ...updates }));
            }
        } catch (e) {
            console.warn('Failed to update ticket cache', e);
        }
    };



    // ---- Tags ----
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault()
            const raw = tagInput.trim()
            const tag = raw.startsWith('#') ? raw : `#${raw}`
            if (!tags.includes(tag)) {
                const next = [...tags, tag]
                setTags(next)
                localStorage.setItem(`ticket_${ticketId}_tags`, JSON.stringify(next))
            }
            setTagInput('')
        }
        if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
            const next = tags.slice(0, -1)
            setTags(next)
            localStorage.setItem(`ticket_${ticketId}_tags`, JSON.stringify(next))
        }
    }

    const removeTag = (tag: string) => {
        const next = tags.filter(t => t !== tag)
        setTags(next)
        localStorage.setItem(`ticket_${ticketId}_tags`, JSON.stringify(next))
    }

    const handleSelectAssignee = async (user: { id: string; name: string; email: string }) => {
        if (!ticket) return;
        setIsSavingAssignee(true);
        try {
            const { ticketsApi } = await import('@/lib/api');
            const result = await ticketsApi.assignTicket(ticket.id, user.id);
            if (result.success !== false) {
                setSelectedAssignee(user);
                localStorage.setItem(`ticket_${ticketId}_assignee`, JSON.stringify(user));
                updateTicketCache({ assignee: user.name } as any);
                setShowAssigneeDropdown(false);
                showSuccessToast();
            } else {
                alert(result.message || 'Failed to assign ticket');
            }
        } catch (e: any) {
            console.error('[Assignee] Failed to assign:', e);
            alert(e.message || 'Failed to assign ticket');
        } finally {
            setIsSavingAssignee(false);
        }
    }

    // ---- Assignee: load admin users from API ----
    useEffect(() => {
        const loadAdmins = async () => {
            try {
                const { ticketsApi, getStoredAuth } = await import('@/lib/api')
                const auth = getStoredAuth()
                if (!auth?.accessToken) return
                // Fetch via Qurani users endpoint filtered by admin role
                const res = await fetch(`${process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com'}/api/v1/Users?role=admin&pageSize=100`, {
                    headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: 'application/json' }
                })
                if (!res.ok) return
                const json = await res.json()
                const list: any[] = json?.data?.items || json?.data || json?.items || []
                if (Array.isArray(list)) {
                    setAdminUsers(list.map((u: any) => ({
                        id: String(u.id || u.userId),
                        name: u.name || u.username || u.email || 'Admin',
                        email: u.email || '',
                        role: u.role || 'admin',
                    })))
                }
            } catch (e) {
                console.warn('[Assignee] Failed to load admins:', e)
            }
        }
        loadAdmins()
    }, [])

    // Close assignee dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
                setShowAssigneeDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])



    // ---- Load Related Tickets via Qurani API ----
    const loadRelatedTickets = async () => {
        if (!ticket) return
        setIsLoadingRelated(true)
        try {
            const { ticketsApi, getStoredAuth } = await import('@/lib/api')
            const auth = getStoredAuth()
            if (!auth?.accessToken) return

            const API = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com'
            // Fetch tickets from Qurani API, filter by same department or contact
            const params = new URLSearchParams({ PageSize: '50', Page: '1' })
            const res = await fetch(`${API}/api/v1/tickets?${params}`, {
                headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: 'application/json' }
            })
            if (!res.ok) return
            const json = await res.json()
            const raw: any[] = json?.data?.items || json?.data || json?.items || []
            if (!Array.isArray(raw)) return

            const normalize = (v: any) => String(v || '').trim().toLowerCase()
            const related = raw
                .filter((t: any) => String(t.id) !== String(ticket.id))
                .map((t: any) => {
                    let score = 0
                    const relatedBy: RelatedMatchSource[] = []
                    if (t.department && normalize(t.department) === normalize(ticket.department)) {
                        score += 5
                        relatedBy.push("Department")
                    }
                    if ((t.name || t.email) && normalize(t.name || t.email) === normalize(ticket.contact)) {
                        score += 4
                        relatedBy.push("Contact")
                    }
                    return { t, score, relatedBy }
                })
                .filter(x => x.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 8)
                .map(x => ({
                    id: x.t.id,
                    ticket_number: x.t.ticketKey || `#${x.t.id}`,
                    subject: x.t.subject || 'No Subject',
                    contact: x.t.name || x.t.email || 'Unknown',
                    department: String(x.t.department || ''),
                    project: null,
                    service: x.t.service || null,
                    priority: x.t.priorityName || 'Medium',
                    status: x.t.statusName || 'Open',
                    last_reply: x.t.lastReply || null,
                    submitted_date: x.t.date || new Date().toISOString(),
                    body: null,
                    relatedBy: x.relatedBy,
                } as RelatedTicketItem))

            setRelatedTickets(related)
        } catch (e) {
            console.warn('[Related] Failed:', e)
        } finally {
            setIsLoadingRelated(false)
        }
    }

    // Auto-load related tickets when tab is switched to "others"
    useEffect(() => {
        if (activeTab === 'others' && relatedTickets.length === 0) {
            loadRelatedTickets()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    // If ticket is not loaded or not found, show loading/error state
    // This guard ensures that `ticket` is not null for the rest of the component
    if (!ticket) {
        if (isTicketLoading) {
            return (
                <SkeletonDetailPage infoRows={4} />
            )
        }

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ticket not found</h3>
                    <button onClick={() => window.location.href = backUrl} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg">Back to List</button>
                </div>
            </div>
        )
    }


    const statusConfig = getStatusConfig(ticketStatus)

    // -- Render Helpers --
    const renderTabs = () => (
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pt-2 sticky top-0 z-10">
            {[
                { key: "reply", label: "Add Reply", icon: <Edit className="w-4 h-4" /> },
                { key: "note", label: "Notes", icon: <StickyNote className="w-4 h-4" />, count: notes.length },
                { key: "reminder", label: "Reminders", icon: <Bell className="w-4 h-4" />, count: reminders.length },
                { key: "others", label: "Related Tickets", icon: <Layers className="w-4 h-4" /> },
                { key: "task", label: "Tasks", icon: <ListChecks className="w-4 h-4" />, count: tasks.length },
            ].map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as DetailTab)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 rounded-t-md hover:bg-gray-50 dark:hover:bg-gray-800",
                        activeTab === tab.key
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-gray-50 dark:bg-gray-800"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )

    const renderReplyTab = () => (
        <div className="space-y-6">
            {/* 1. Reply Editor (Top) */}
            <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reply to Ticket</h3>
                    <div className="flex items-center gap-2">
                        {/* Presets or Macros could go here */}
                    </div>
                </div>
                <div className="p-0">
                    {notes.length > 0 && (
                        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900">
                            <p className="text-xs text-yellow-700 font-semibold mb-1">Latest Note:</p>
                            <div className="text-xs text-yellow-800 dark:text-yellow-200 line-clamp-1">{notes[notes.length - 1].content}</div>
                        </div>
                    )}
                    <textarea
                        value={replyContent}
                        onChange={handleTextareaInput}
                        placeholder="Enter your reply here..."
                        className="w-full min-h-[80px] p-4 text-sm bg-white dark:bg-gray-950 border-0 focus:ring-0 placeholder-gray-400 resize-none font-sans"
                        style={{ height: textareaHeight }}
                    />
                    {/* File Previews */}
                    {filePreviews.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2 flex-wrap">
                                {filePreviews.map((preview, index) => (
                                    <div key={index} className="relative group">
                                        <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-md">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 rounded px-1 truncate">
                                            {(selectedFiles[index]?.size / 1024 / 1024).toFixed(1)} MB
                                        </div>
                                    </div>
                                ))}
                                {selectedFiles.length < 2 && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="text-[10px] mt-1">Add</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={selectedFiles.length >= 2}
                                className={cn(
                                    "transition-colors p-1 rounded",
                                    selectedFiles.length >= 2
                                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                        : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                )}
                                title={selectedFiles.length >= 2 ? "Max 2 files" : "Attach Files (max 2)"}
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            {selectedFiles.length > 0 && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    {selectedFiles.length}/2 files
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={ticketStatus}
                                onChange={(e) => setTicketStatus(e.target.value)}
                                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-1.5 px-3 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Answered">Answered</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Closed">Closed</option>
                            </select>
                            <button
                                onClick={handleSendMessage}
                                disabled={(!replyContent.trim() && selectedFiles.length === 0) || isSending || isUploading}
                                className={cn(
                                    "text-white text-sm font-medium px-4 py-1.5 rounded-md shadow-sm transition-all flex items-center gap-2",
                                    (!replyContent.trim() && selectedFiles.length === 0) || isSending || isUploading
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                )}
                            >
                                {isUploading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                ) : isSending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Reply</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 2. Conversation History */}
            <div className="space-y-6 pb-10">
                {/* Original Ticket Body */}
                {ticket.body && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold border border-blue-200 dark:border-blue-800">
                                {ticket.contact.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">{ticket.contact}</span>
                                    <span className="text-xs text-gray-500">opened this ticket</span>
                                </div>
                                <span className="text-xs text-gray-400">{formatDateTime(ticket.submitted_date)}</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {ticket.body}
                            </div>
                        </div>
                    </div>
                )}

                {/* History Timeline Look */}
                <div className="relative pl-5 border-l-2 border-gray-100 dark:border-gray-800 ml-5 space-y-8">
                    {ticket.replies.map((reply) => {
                        const isUser = isUserMessage(reply.author)
                        return (
                            <div key={reply.id} className="relative">
                                <div className={cn(
                                    "absolute -left-[29px] top-0 w-8 h-8 rounded-full border-4 border-white dark:border-gray-950 flex items-center justify-center text-xs font-bold",
                                    isUser
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-emerald-600 text-white"
                                )}>
                                    {reply.author.charAt(0).toUpperCase()}
                                </div>

                                <div className={cn(
                                    "rounded-[8px] border overflow-hidden",
                                    isUser
                                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                                        : "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-900 shadow-sm"
                                )}>
                                    <div className={cn(
                                        "px-4 py-2 text-xs flex justify-between items-center border-b",
                                        isUser
                                            ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
                                            : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
                                    )}>
                                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                                            {reply.author === 'Staff' ? 'Support Team' : reply.author} <span className="font-normal text-gray-500 ml-1">{isUser ? "(Client)" : "(Staff)"}</span>
                                        </div>
                                        <div className="text-gray-400">{formatDateTime(reply.date)}</div>
                                    </div>
                                    <div className="p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {/* Only show message if it's not just "📎 Attachment" placeholder */}
                                        {reply.message && reply.message !== "📎 Attachment" && reply.message}

                                        {/* Attachments Display */}
                                        {reply.attachments && (() => {
                                            try {
                                                const urls = JSON.parse(reply.attachments) as string[]
                                                if (urls.length === 0) return null
                                                return (
                                                    <div className={`flex flex-wrap gap-2 ${reply.message && reply.message !== "📎 Attachment" ? 'mt-3' : ''}`}>
                                                        {urls.map((url, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setLightboxImage(url)}
                                                                className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors shadow-sm hover:shadow-md"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={`Attachment ${idx + 1}`}
                                                                    loading="lazy"
                                                                    className="w-[100px] h-[100px] object-cover bg-gray-100 dark:bg-gray-800"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )
                                            } catch {
                                                return null
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Load More Button */}
                {hasMoreReplies && (
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={handleLoadMoreReplies}
                            disabled={isLoadingMore}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
                        >
                            {isLoadingMore ? <div className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div> : <ChevronDown className="w-3 h-3" />}
                            Load more replies
                        </button>
                    </div>
                )}
            </div>
            <div ref={messagesEndRef}></div>
        </div>
    )

    // --- Main Render ---
    return (
        <>
            <div className="flex flex-col h-screen bg-gray-100/50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">

                {showSaveSuccess && (
                    <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <Check className="w-4 h-4" /> Saved Successfully
                    </div>
                )}

                {/* HEADER */}
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6 flex-shrink-0 relative z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.location.href = backUrl} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                #{ticket.id} <span className="font-normal text-gray-400">|</span> {ticket.subject}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mobile Info Toggle */}
                        <button
                            className="lg:hidden p-2 text-gray-500"
                            onClick={() => setShowInfoPanel(!showInfoPanel)}
                        >
                            <PanelRight className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* BODY (2-Columns) */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* LEFT: MAIN CONTENT */}
                    <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-950 relative overflow-hidden">

                        {/* Horizontal Tabs */}
                        {renderTabs()}

                        {/* Tab Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-black/20 scroll-smooth">
                            <div className="max-w-4xl mx-auto">

                                {activeTab === 'reply' && renderReplyTab()}

                                {activeTab === 'note' && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Add an internal note..."
                                                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm h-24 resize-none bg-white dark:bg-gray-900"
                                            />
                                            <button onClick={handleAddNote} className="h-24 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 transition-colors">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {notes.map(note => (
                                                <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                                                    <div className="flex justify-between mb-2">
                                                        <span className="font-bold text-sm text-yellow-800 dark:text-yellow-500">{note.author}</span>
                                                        <span className="text-xs text-yellow-600 dark:text-yellow-600">{formatDateTime(note.date)}</span>
                                                    </div>
                                                    <p className="text-sm text-yellow-900 dark:text-yellow-100">{note.content}</p>
                                                </div>
                                            ))}
                                            {notes.length === 0 && <p className="text-center text-gray-400 py-8">No internal notes yet.</p>}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'reminder' && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader className="pb-3"><CardTitle className="text-base">Add Reminder</CardTitle></CardHeader>
                                            <CardContent className="space-y-3">
                                                <Input value={newReminder.title} onChange={e => setNewReminder({ ...newReminder, title: e.target.value })} placeholder="Reminder title..." />
                                                <div className="flex gap-3">
                                                    <Input type="datetime-local" value={newReminder.date} onChange={e => setNewReminder({ ...newReminder, date: e.target.value })} className="flex-1" />
                                                    <Input value={newReminder.staff} onChange={e => setNewReminder({ ...newReminder, staff: e.target.value })} placeholder="Staff..." className="flex-1" />
                                                </div>
                                                <button onClick={handleAddReminder} className="w-full bg-emerald-600 text-white py-2 rounded-md text-sm font-medium hover:bg-emerald-700">Create Reminder</button>
                                            </CardContent>
                                        </Card>
                                        {reminders.map(rem => (
                                            <div key={rem.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Bell className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-sm">{rem.title}</p>
                                                        <p className="text-xs text-gray-500">{formatDateTime(rem.date)} • {rem.staff}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteReminder(rem.id)}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'task' && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="New task..." className="flex-1" />
                                            <button onClick={handleAddTask} className="px-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"><Plus className="w-5 h-5" /></button>
                                        </div>
                                        <div className="space-y-2">
                                            {tasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg group">
                                                    <input type="checkbox" checked={task.status === 'completed'} onChange={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                    <span className={cn("flex-1 text-sm font-medium", task.status === 'completed' && "line-through text-gray-400")}>{task.title}</span>
                                                    <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'others' && (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 px-3 py-2.5 text-sm flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p>
                                                Menampilkan tiket lain dengan Department ({ticket.department || "-"}) atau Contact ({ticket.contact || "-"}) yang sama.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {isLoadingRelated ? (
                                                <div className="col-span-2 space-y-3 py-4">
                                                    {[...Array(2)].map((_, i) => (
                                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 animate-pulse">
                                                            <Skeleton className="h-3 w-24" />
                                                            <Skeleton className="h-4 w-full" />
                                                            <Skeleton className="h-3 w-3/4" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : relatedTickets.length > 0 ? (
                                                relatedTickets.map(t => (
                                                    <div key={t.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg cursor-default">
                                                        <div className="flex justify-between text-xs mb-2">
                                                            <span className="font-mono text-gray-500">{t.ticket_number || `#${t.id}`}</span>
                                                            <span className={cn("px-2 py-0.5 rounded-full", getStatusConfig(t.status).bgClass, "bg-opacity-20 text-gray-700")}>{t.status}</span>
                                                        </div>
                                                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{t.subject}</h4>
                                                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[11px] text-gray-500">Related via:</span>
                                                            {t.relatedBy.length > 0 ? (
                                                                t.relatedBy.map((source) => (
                                                                    <span
                                                                        key={source}
                                                                        className={cn(
                                                                            "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                                                            source === "Department" && "bg-blue-50 text-blue-700 border border-blue-200",
                                                                            source === "Contact" && "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                        )}
                                                                    >
                                                                        {source}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-[11px] text-gray-400">-</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 mb-1">
                                                            {t.contact || "Unknown"} · {t.department || "-"}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{formatDateTime(t.submitted_date)}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="col-span-2 text-center text-gray-500 text-sm py-8">No related tickets found.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </main>

                    {/* RIGHT SIDEBAR (Ticket Info) */}
                    <aside className={cn(
                        "w-[320px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto transition-transform duration-300 absolute lg:static inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none",
                        showInfoPanel ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                    )}>
                        <div className="p-4 space-y-6">

                            {/* Mobile Close Button */}
                            <div className="lg:hidden flex justify-end mb-2">
                                <button onClick={() => setShowInfoPanel(false)}><X className="w-5 h-5 text-gray-500" /></button>
                            </div>

                            {/* STATUS & PRIORITY */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-3 space-y-4">
                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</span>
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm",
                                        statusConfig.className
                                    )}>
                                        {statusConfig.icon}
                                        <span className="font-semibold">{statusConfig.label}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</span>
                                    <div className="inline-flex w-full rounded-md bg-gray-100 dark:bg-gray-900 p-0.5 gap-1">
                                        {(["Low", "Medium", "High"] as const).map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => handlePriorityChange(level)}
                                                className={cn(
                                                    "flex-1 px-2 py-1.5 text-xs font-medium rounded-md border border-transparent transition-colors",
                                                    ticketPriority === level
                                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border-gray-200 dark:border-gray-700"
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                                                )}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* DETAILS */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-3 space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</h4>
                                <dl className="text-xs">
                                    <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-x-3 py-1.5">
                                        <dt className="text-gray-500">Department</dt>
                                        <dd className="font-medium text-gray-900 dark:text-gray-100 text-right justify-self-end min-w-0 truncate">{ticket.department || "-"}</dd>
                                    </div>

                                </dl>
                            </div>

                            {/* TAGS */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-3 space-y-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</h4>
                                <div className="flex flex-wrap items-center gap-1.5 min-h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                                    {tags.map((tag) => (
                                        <span key={tag} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[11px] rounded-md flex items-center gap-1">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-red-500"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                    <input
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder={tags.length > 0 ? "Tambah tag..." : "Type tag and press Enter..."}
                                        className="h-6 flex-1 min-w-[120px] border-0 bg-transparent text-xs outline-none placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* ASSIGNEE */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                                    Assignee
                                    {isSavingAssignee && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
                                </h4>
                                <div className="relative" ref={assigneeDropdownRef}>
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                    >
                                        {selectedAssignee ? (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                    {selectedAssignee.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm truncate flex-1">{selectedAssignee.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><UserCheck className="w-3 h-3" /></div>
                                                <span className="text-sm text-gray-400 italic flex-1">Unassigned</span>
                                            </>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </div>

                                    {showAssigneeDropdown && (
                                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 flex flex-col">
                                            <div className="p-2 sticky top-0 bg-white dark:bg-gray-900 border-b z-10">
                                                <input
                                                    type="text"
                                                    placeholder="Search staff..."
                                                    value={assigneeSearch}
                                                    onChange={(e) => setAssigneeSearch(e.target.value)}
                                                    className="w-full text-xs p-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-700"
                                                />
                                            </div>
                                            <div className="overflow-y-auto p-1 flex-1">
                                                {adminUsers.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) || u.email.toLowerCase().includes(assigneeSearch.toLowerCase())).map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => handleSelectAssignee(user)}
                                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm rounded"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="truncate flex-1">
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                                                            <p className="text-[10px] text-gray-500">{user.role}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {adminUsers.length === 0 && (
                                                    <div className="p-3 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Loading admins...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </aside>

                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Full size"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    )
}
