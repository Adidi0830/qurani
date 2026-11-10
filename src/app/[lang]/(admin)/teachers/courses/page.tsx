"use client"

import { type ElementType, type ReactNode, useEffect, useMemo, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useI18n } from "@/components/providers/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import {
    BadgeCheck,
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronsUpDown,
    Eye,
    Filter,
    Globe2,
    GraduationCap,
    Loader2,
    Megaphone,
    MoreHorizontal,
    Package,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
    UploadCloud,
    Users,
    X,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"

const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
const PAGE_SIZE = 10

type CourseStatus = "published" | "unpublished" | "draft" | "archived"
type StatusFilter = "all" | CourseStatus
type VerifyFilter = "all" | "verified" | "unverified"
type CourseAction = "publish" | "unpublish" | "verify" | "unverify" | "feature" | "unfeature"
type SourceType = "api" | "dummy"

class ApiActionError extends Error {
    status: number

    constructor(status: number) {
        super(`HTTP ${status}`)
        this.status = status
    }
}

type SyllabusTopic = {
    order: number
    title: string
    duration?: number
}

type SyllabusModule = {
    order: number
    title: string
    description?: string | null
    duration?: number
    topics?: SyllabusTopic[]
}

type AdminCourse = {
    id: number | string
    title: string
    categoryId?: number | null
    categoryName: string
    trainerId?: number | null
    trainerName: string
    trainerAvatar: string
    trainerUsername?: string
    organizationId?: number | null
    organizationName?: string | null
    description?: string | null
    shortDescription?: string | null
    thumbnail?: string | null
    level: number
    mode: number
    courseType: string
    language?: string | null
    city?: string | null
    countryCode?: string | null
    duration: number
    totalSessions: number
    syllabus: SyllabusModule[]
    hourlyRate: number
    sessionPrice?: number | null
    packagePrice?: number | null
    discountPrice?: number | null
    currency: string
    isFree: boolean
    maxStudents?: number | null
    minStudents?: number | null
    hasCertificate: boolean
    learningOutcomes: string[]
    requirements: string[]
    targetAudience?: string | null
    skills: string[]
    tags: string[]
    status: CourseStatus
    isPublished: boolean
    isVerified: boolean
    isFeatured: boolean
    rating: number
    students: number
    totalOrders: number
    totalRevenue: number
    createdAt?: string | null
    updatedAt?: string | null
    source: SourceType
}

type TrainerFilterItem = {
    id: string
    name: string
    avatar: string
    totalCourses: number
    username: string
}

type TrainerProfile = {
    id: number
    name: string
    avatar: string
    username: string
}

type SortField = "title" | "trainerName" | "totalSessions" | "packagePrice" | "students" | "totalRevenue"

const LEVEL_LABEL: Record<number, string> = {
    1: "Pemula",
    2: "Menengah",
    3: "Lanjutan",
    4: "Ahli",
}

const MODE_LABEL: Record<number, string> = {
    1: "Online",
    2: "Offline",
    3: "Hybrid",
}

const STATUS_CFG: Record<CourseStatus, { label: string; dot: string; cls: string }> = {
    published: {
        label: "Published",
        dot: "bg-emerald-500",
        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    unpublished: {
        label: "Unpublished",
        dot: "bg-gray-400",
        cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    draft: {
        label: "Draft",
        dot: "bg-amber-500",
        cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    archived: {
        label: "Archived",
        dot: "bg-rose-500",
        cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
}

const DUMMY_COURSES: AdminCourse[] = dummyData.trainerPackages.map((tp, idx) => ({
    id: tp.id,
    title: tp.name,
    categoryId: 1,
    categoryName: tp.category,
    trainerId: tp.trainerId,
    trainerName: tp.trainerName,
    trainerAvatar: tp.trainerAvatar,
    organizationId: null,
    organizationName: null,
    description: tp.description,
    shortDescription: tp.description,
    thumbnail: `https://images.unsplash.com/photo-${1609599006353 + idx}?auto=format&fit=crop&w=600&q=80`,
    level: 1,
    mode: 1,
    courseType: tp.sessions > 1 ? "package" : "private",
    language: "id",
    city: "Jakarta",
    countryCode: "ID",
    duration: 60,
    totalSessions: tp.sessions,
    syllabus: [],
    hourlyRate: tp.basePrice,
    sessionPrice: tp.basePrice,
    packagePrice: tp.totalPrice,
    discountPrice: null,
    currency: "IDR",
    isFree: tp.basePrice === 0,
    maxStudents: 1,
    minStudents: 1,
    hasCertificate: false,
    learningOutcomes: [],
    requirements: [],
    targetAudience: "Semua",
    skills: [],
    tags: ["package", "tahsin"],
    status: tp.status === "active" ? "published" : "draft",
    isPublished: tp.status === "active",
    isVerified: true,
    isFeatured: idx === 0,
    rating: 4.8,
    students: tp.totalOrders,
    totalOrders: tp.totalOrders,
    totalRevenue: tp.totalRevenue,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-05-20T10:00:00Z",
    source: "dummy"
}))

function formatRupiah(n?: number | null) {
    const value = Number(n || 0)
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? null
}

function toNumber(value: unknown, fallback = 0) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : fallback
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function normalizeName(value: unknown) {
    return String(value || "").trim().toLowerCase()
}

function getFallbackAvatar(_seed?: unknown): string {
    return ""
}

function unwrapList(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload
    if (!payload || typeof payload !== "object") return []
    const record = payload as Record<string, any>
    const candidates = [record.data, record.items, record.results, record.courses, record.value]
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate
        if (candidate && typeof candidate === "object" && Array.isArray(candidate.items)) return candidate.items
    }
    return []
}

function mapApiTrainer(raw: any): TrainerProfile | null {
    if (!raw || raw.id == null) return null

    const username = raw.username || raw.userName || ""
    const name = raw.userName || raw.name || `Guru #${raw.id}`

    if (/^guru\d+$/.test(username)) return null
    if (!username || String(username).trim() === "") return null
    if (String(username).includes("Guru -") || String(name).includes("Guru -")) return null

    return {
        id: toNumber(raw.id),
        name,
        avatar: raw.userImage || raw.avatar || getFallbackAvatar(raw.id),
        username,
    }
}

function enrichCoursesWithTrainers(courses: AdminCourse[], trainerProfiles: TrainerProfile[]) {
    if (trainerProfiles.length === 0) {
        return courses.map(course => ({
            ...course,
            trainerAvatar: course.trainerAvatar || getFallbackAvatar(course.trainerId ?? course.trainerName),
        }))
    }

    const trainersById = new Map(trainerProfiles.map(trainer => [String(trainer.id), trainer]))
    const trainersByName = new Map(trainerProfiles.map(trainer => [normalizeName(trainer.name), trainer]))

    return courses.map((course) => {
        const directMatch = (
            trainersById.get(String(course.trainerId ?? "")) ||
            trainersByName.get(normalizeName(course.trainerName))
        )

        // Dummy courses: hanya update jika ada direct match — jangan override dengan trainer random dari API
        if (course.source === "dummy") {
            if (!directMatch) {
                // Pertahankan data trainer asli dari dummy JSON
                return {
                    ...course,
                    trainerAvatar: course.trainerAvatar || getFallbackAvatar(course.trainerId ?? course.trainerName),
                }
            }
            // Ada direct match: update avatar saja, pertahankan trainerName dari dummy
            return {
                ...course,
                trainerAvatar: directMatch.avatar || course.trainerAvatar,
                trainerUsername: directMatch.username || course.trainerUsername,
            }
        }

        // API courses: update sesuai trainer profile yang ditemukan
        if (!directMatch) {
            return {
                ...course,
                trainerAvatar: course.trainerAvatar || getFallbackAvatar(course.trainerId ?? course.trainerName),
            }
        }

        return {
            ...course,
            trainerId: directMatch.id,
            trainerName: directMatch.name,
            trainerAvatar: directMatch.avatar,
            trainerUsername: directMatch.username,
        }
    })
}

function normalizeStatus(raw: any): CourseStatus {
    const text = String(raw?.status ?? "").toLowerCase()
    const isPublished = raw?.isPublished ?? raw?.published ?? raw?.isActive
    if (text.includes("archive")) return "archived"
    if (text.includes("draft")) return "draft"
    if (text.includes("unpublish") || text.includes("inactive")) return "unpublished"
    if (text.includes("publish") || text.includes("active")) return "published"
    return isPublished ? "published" : "unpublished"
}

function mapApiCourse(raw: any): AdminCourse | null {
    if (!raw || raw.id == null) return null
    const packagePrice = raw.packagePrice ?? raw.totalPrice ?? raw.price ?? raw.sessionPrice ?? raw.hourlyRate ?? 0
    const trainerId = raw.trainerId ?? raw.instructorId ?? raw.teacherId ?? raw.createdByTrainerId ?? null
    const rating = toNumber(raw.rating ?? raw.averageRating ?? raw.avgRating, 0)

    return {
        id: raw.id,
        title: raw.title || raw.name || `Course #${raw.id}`,
        categoryId: raw.categoryId ?? raw.category?.id ?? null,
        categoryName: raw.categoryName || raw.category?.name || `Kategori ${raw.categoryId ?? "-"}`,
        trainerId,
        trainerName: raw.trainerName || raw.instructorName || raw.teacherName || raw.trainer?.userName || raw.trainer?.name || `Guru #${trainerId ?? "-"}`,
        trainerAvatar: raw.trainerAvatar || raw.trainer?.userImage || raw.trainer?.avatar || getFallbackAvatar(trainerId ?? raw.trainerName ?? raw.id),
        trainerUsername: raw.trainer?.username || raw.trainer?.userName || raw.trainerUsername || "",
        organizationId: raw.organizationId ?? raw.organization?.id ?? null,
        organizationName: raw.organizationName || raw.organization?.name || null,
        description: raw.description ?? null,
        shortDescription: raw.shortDescription ?? null,
        thumbnail: raw.thumbnail ?? raw.imageUrl ?? raw.coverImage ?? null,
        level: toNumber(raw.level, 1),
        mode: toNumber(raw.mode, 1),
        courseType: raw.courseType || raw.type || "course",
        language: raw.language ?? null,
        city: raw.city ?? raw.location ?? null,
        countryCode: raw.countryCode ?? null,
        duration: toNumber(raw.duration, 15),
        totalSessions: toNumber(raw.totalSessions ?? raw.sessions, 1),
        syllabus: Array.isArray(raw.syllabus) ? raw.syllabus : [],
        hourlyRate: toNumber(raw.hourlyRate, 0),
        sessionPrice: raw.sessionPrice == null ? null : toNumber(raw.sessionPrice),
        packagePrice: toNumber(packagePrice),
        discountPrice: raw.discountPrice == null ? null : toNumber(raw.discountPrice),
        currency: raw.currency || "IDR",
        isFree: Boolean(raw.isFree === true || raw.isFree === 1 || Number(packagePrice) === 0),
        maxStudents: raw.maxStudents == null ? null : toNumber(raw.maxStudents),
        minStudents: raw.minStudents == null ? null : toNumber(raw.minStudents),
        hasCertificate: Boolean(raw.hasCertificate === true || raw.hasCertificate === 1),
        learningOutcomes: toStringArray(raw.learningOutcomes),
        requirements: toStringArray(raw.requirements),
        targetAudience: raw.targetAudience ?? null,
        skills: toStringArray(raw.skills),
        tags: toStringArray(raw.tags),
        status: normalizeStatus(raw),
        isPublished: normalizeStatus(raw) === "published",
        isVerified: Boolean(raw.isVerified === true || raw.isVerified === 1 || raw.verified === true),
        isFeatured: Boolean(raw.isFeatured === true || raw.isFeatured === 1 || raw.featured === true),
        rating,
        students: toNumber(raw.students ?? raw.totalStudents ?? raw.enrolledCount, 0),
        totalOrders: toNumber(raw.totalOrders ?? raw.orders, 0),
        totalRevenue: toNumber(raw.totalRevenue ?? raw.revenue, 0),
        createdAt: raw.createdAt ?? null,
        updatedAt: raw.updatedAt ?? null,
        source: "api",
    }
}

async function postCourseAction(path: string, body?: unknown) {
    const token = getClientToken()
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) throw new ApiActionError(response.status)
}

function getActionFallbackMessage(error: unknown, fallback: string) {
    if (error instanceof ApiActionError && (error.status === 401 || error.status === 403)) {
        return "API menolak akses. Kemungkinan akun yang dipakai masih role member, jadi aksi admin butuh akun admin."
    }

    return fallback
}

function StatusBadge({ course }: { course: AdminCourse }) {
    const { t } = useI18n()
    const cfg = STATUS_CFG[course.status]
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {t(`billing.courses.status.${course.status}`, cfg.label)}
        </span>
    )
}

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
            {children}
        </span>
    )
}

function TrainerAvatar({ src, name, size = 32 }: { src: string; name: string; size?: number }) {
    const [hasError, setHasError] = useState(false)
    const initial = name.trim().charAt(0).toUpperCase() || "G"

    if (hasError || !src) {
        return (
            <div
                className="flex flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800"
                style={{ width: size, height: size }}
            >
                {initial}
            </div>
        )
    }

    return (
        <Image
            src={src}
            alt={name}
            width={size}
            height={size}
            className="flex-shrink-0 rounded-full object-cover ring-1 ring-gray-100 dark:ring-gray-800"
            style={{ width: size, height: size }}
            onError={() => setHasError(true)}
            unoptimized
        />
    )
}

function CourseDetailModal({ course, onClose }: { course: AdminCourse; onClose: () => void }) {
    const { t } = useI18n()
    const price = course.isFree ? t("billing.courses.free", "Free") : formatRupiah(course.discountPrice ?? course.packagePrice)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} aria-label={t("billing.courses.close", "Close")} />
            <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-950">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("billing.courses.detail.title", "Course Detail")}</h2>
                        <p className="text-xs text-gray-500">ID: {course.id}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5">
                    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-4">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                                {course.thumbnail ? (
                                    <Image src={course.thumbnail} alt={course.title} fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <BookOpen className="h-10 w-10 text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                                <p className="text-xs font-bold uppercase text-gray-400">{t("billing.courses.table.price", "Price")}</p>
                                <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">{price}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                    {t("billing.courses.detail.durationLine", "{{sessions}} sessions - {{duration}} minutes/session", { sessions: course.totalSessions, duration: course.duration })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <StatusBadge course={course} />
                                    {course.isVerified && <Pill className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Verified</Pill>}
                                    {course.isFeatured && <Pill className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Featured</Pill>}
                                    {course.hasCertificate && <Pill className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{t("billing.courses.certificate", "Certificate")}</Pill>}
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{course.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                    {course.description || course.shortDescription || t("billing.courses.detail.noDescription", "No description yet.")}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">{t("billing.courses.detail.category", "Category")}</p>
                                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{course.categoryName}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">{t("billing.courses.detail.level", "Level")}</p>
                                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{LEVEL_LABEL[course.level] ?? `Level ${course.level}`}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">{t("billing.courses.detail.mode", "Mode")}</p>
                                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{t(`billing.courses.mode.${course.mode}`, MODE_LABEL[course.mode] ?? `Mode ${course.mode}`)}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                                    <p className="text-[10px] font-bold uppercase text-gray-400">{t("billing.courses.detail.type", "Type")}</p>
                                    <p className="mt-1 text-sm font-bold capitalize text-gray-900 dark:text-white">{course.courseType || "-"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                                <TrainerAvatar src={course.trainerAvatar} name={course.trainerName} size={40} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{course.trainerName}</p>
                                    <p className="text-xs text-gray-500">{course.organizationName || course.city || t("billing.courses.teacherFallback", "Qurani Teacher")}</p>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    {course.rating > 0 ? course.rating.toFixed(1) : "-"}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <InfoList title={t("billing.courses.detail.learningOutcomes", "Learning Outcomes")} items={course.learningOutcomes} fallback={t("billing.courses.detail.noOutcomes", "No outcomes yet.")} />
                                <InfoList title={t("billing.courses.detail.requirements", "Requirements")} items={course.requirements} fallback={t("billing.courses.detail.noRequirements", "No special requirements.")} />
                            </div>

                            <div>
                                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">{t("billing.courses.detail.syllabus", "Syllabus")}</h4>
                                <div className="space-y-2">
                                    {course.syllabus.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">{t("billing.courses.detail.noSyllabus", "No syllabus yet.")}</div>
                                    ) : course.syllabus.map(module => (
                                        <div key={`${course.id}-${module.order}`} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{module.order}. {module.title}</p>
                                            {module.description && <p className="mt-1 text-xs text-gray-500">{module.description}</p>}
                                            {module.topics && module.topics.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {module.topics.map(topic => (
                                                        <Pill key={`${module.order}-${topic.order}`} className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                            {topic.title}
                                                        </Pill>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function InfoList({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
    return (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
            {items.length === 0 ? (
                <p className="text-xs text-gray-500">{fallback}</p>
            ) : (
                <ul className="space-y-2">
                    {items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function BulkActionModal({
    selectedCount,
    onClose,
    onApply,
    isActing,
}: {
    selectedCount: number
    onClose: () => void
    onApply: (action: "publish" | "unpublish") => void
    isActing: boolean
}) {
    const { t } = useI18n()
    const [action, setAction] = useState<"publish" | "unpublish" | null>(null)

    const options: Array<{ value: "publish" | "unpublish"; title: string; description: string; icon: ElementType; tone: string }> = [
        {
            value: "publish",
            title: t("billing.courses.actions.publish", "Publish"),
            description: t("billing.courses.bulk.publishDescription", "Make selected courses visible to users."),
            icon: UploadCloud,
            tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
        },
        {
            value: "unpublish",
            title: t("billing.courses.actions.unpublish", "Unpublish"),
            description: t("billing.courses.bulk.unpublishDescription", "Hide selected courses from users."),
            icon: X,
            tone: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
        },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-gray-900/55" onClick={onClose} aria-label={t("billing.courses.close", "Close")} />
            <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-950">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t("billing.courses.bulk.title", "Bulk Actions")}</h3>
                <p className="mt-1 text-xs text-gray-500">{t("billing.courses.bulk.selected", "{{count}} selected", { count: selectedCount })}</p>

                <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("billing.courses.bulk.chooseAction", "Choose action")}</p>
                    {options.map(option => {
                        const Icon = option.icon
                        const selected = action === option.value
                        return (
                            <button
                                key={option.value}
                                onClick={() => setAction(option.value)}
                                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${selected ? option.tone : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-900"}`}
                            >
                                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-white/80 dark:bg-gray-950/60" : "bg-gray-100 text-gray-500 dark:bg-gray-900"}`}>
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{option.title}</span>
                                    <span className="block text-xs text-gray-500">{option.description}</span>
                                </span>
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 dark:border-gray-600"}`}>
                                    {selected && <Check className="h-3.5 w-3.5" />}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="mt-5 flex gap-2">
                    <button
                        onClick={onClose}
                        className="h-10 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                        {t("billing.courses.cancel", "Cancel")}
                    </button>
                    <button
                        disabled={!action || isActing}
                        onClick={() => action && onApply(action)}
                        className="h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                    >
                        {isActing ? t("billing.courses.updating", "Updating...") : t("billing.courses.bulk.apply", "Apply")}
                    </button>
                </div>
            </div>
        </div>
    )
}

function TrainerFilterModal({
    trainers,
    selectedIds,
    onApply,
    onClose,
}: {
    trainers: TrainerFilterItem[]
    selectedIds: Set<string>
    onApply: (ids: Set<string>) => void
    onClose: () => void
}) {
    const { t } = useI18n()
    const [query, setQuery] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [tempSelected, setTempSelected] = useState<Set<string>>(new Set(selectedIds))

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [onClose])

    const filteredTrainers = useMemo(() => {
        const q = query.trim().toLowerCase()
        return trainers
            .filter(trainer => !q || trainer.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [query, trainers])

    const allSelected = filteredTrainers.length > 0 && filteredTrainers.every(trainer => tempSelected.has(trainer.id))

    function toggleAll() {
        setTempSelected(prev => {
            const next = new Set(prev)
            if (allSelected) filteredTrainers.forEach(trainer => next.delete(trainer.id))
            else filteredTrainers.forEach(trainer => next.add(trainer.id))
            return next
        })
    }

    function toggleTrainer(id: string) {
        setTempSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-gray-900/55 backdrop-blur-sm" onClick={onClose} aria-label={t("billing.courses.close", "Close")} />
            <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-950">
                <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("billing.courses.filter.title", "Filter by Teacher")}</h3>
                        <p className="text-xs text-gray-500">{t("billing.courses.filter.subtitle", "Choose one or more teachers")}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 dark:border-gray-700 dark:bg-gray-900">
                        <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                autoFocus
                                value={searchInput}
                                onChange={event => setSearchInput(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === "Enter") setQuery(searchInput)
                                }}
                                placeholder={t("billing.courses.filter.searchTeacher", "Search teacher name...")}
                                className="h-10 w-full bg-transparent py-2 pl-9 pr-3 text-sm text-gray-900 outline-none dark:text-white"
                            />
                        </div>
                        <button
                            onClick={() => setQuery(searchInput)}
                            className="inline-flex h-10 items-center gap-1.5 bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                        >
                            <Search className="h-4 w-4" />
                            {t("billing.courses.searchButton", "Cari")}
                        </button>
                    </div>
                </div>

                <div className="max-h-[46vh] overflow-y-auto p-2">
                    {filteredTrainers.length > 0 && (
                        <button onClick={toggleAll} className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                            <span>{allSelected ? t("billing.courses.filter.clearVisible", "Clear visible") : t("billing.courses.filter.selectVisible", "Select visible")}</span>
                            <span className="text-gray-400">{t("billing.courses.filter.selected", "{{count}} selected", { count: tempSelected.size })}</span>
                        </button>
                    )}

                    {filteredTrainers.map(trainer => {
                        const checked = tempSelected.has(trainer.id)
                        return (
                            <button
                                key={trainer.id}
                                onClick={() => toggleTrainer(trainer.id)}
                                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${checked ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                            >
                                <TrainerAvatar src={trainer.avatar} name={trainer.name} size={32} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{trainer.name}</p>
                                    <p className="text-[10px] text-gray-500">@{trainer.username}</p>
                                </div>
                                <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 dark:border-gray-600"}`}>
                                    {checked && <Check className="h-3.5 w-3.5" />}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <button
                        onClick={() => setTempSelected(new Set())}
                        className="h-10 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                    >
                        {t("billing.courses.reset", "Reset")}
                    </button>
                    <button
                        onClick={() => { onApply(tempSelected); onClose() }}
                        className="h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                        {t("billing.courses.applyWithCount", "Apply ({{count}})", { count: tempSelected.size })}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CourseActionMenu({
    course,
    isOpen,
    isActing,
    onToggle,
    onDetail,
    onAction,
}: {
    course: AdminCourse
    isOpen: boolean
    isActing: boolean
    onToggle: () => void
    onDetail: () => void
    onAction: (action: CourseAction) => void
}) {
    const { t } = useI18n()
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [openUpwards, setOpenUpwards] = useState(false)

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            if (rect.bottom + 220 > window.innerHeight) {
                setOpenUpwards(true)
            } else {
                setOpenUpwards(false)
            }
        }
    }, [isOpen])

    const items: Array<{ key: string; action?: CourseAction; label: string; icon: ElementType; tone: string }> = [
        { key: "detail", label: t("billing.courses.actions.detail", "Detail"), icon: Eye, tone: "text-emerald-700 dark:text-emerald-400" },
        {
            key: course.status === "published" ? "unpublish" : "publish",
            action: course.status === "published" ? "unpublish" : "publish",
            label: course.status === "published" ? t("billing.courses.actions.unpublish", "Unpublish") : t("billing.courses.actions.publish", "Publish"),
            icon: course.status === "published" ? X : UploadCloud,
            tone: "text-gray-700 dark:text-gray-300",
        },
        {
            key: course.isVerified ? "unverify" : "verify",
            action: course.isVerified ? "unverify" : "verify",
            label: course.isVerified ? t("billing.courses.actions.unverify", "Unverify") : t("billing.courses.actions.verify", "Verify"),
            icon: BadgeCheck,
            tone: "text-blue-700 dark:text-blue-400",
        },
        {
            key: course.isFeatured ? "unfeature" : "feature",
            action: course.isFeatured ? "unfeature" : "feature",
            label: course.isFeatured ? t("billing.courses.actions.unfeature", "Unfeature") : t("billing.courses.actions.feature", "Feature"),
            icon: Megaphone,
            tone: "text-amber-700 dark:text-amber-400",
        },
    ]

    return (
        <div className="relative inline-flex">
            <button
                ref={buttonRef}
                onClick={onToggle}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label={t("billing.courses.actions.open", "Open actions")}
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className={`absolute right-0 z-20 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-950 ${openUpwards ? "bottom-9" : "top-9"}`}>
                    {items.map(item => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.key}
                                disabled={isActing && item.key !== "detail"}
                                onClick={() => {
                                    if (item.key === "detail") onDetail()
                                    else if (item.action) onAction(item.action)
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-900 ${item.tone}`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function CombinedFilterDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { t } = useI18n()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const options = [
        { value: "all", label: t("billing.courses.filters.allCombined", "Semua") },
        { 
            group: t("billing.courses.filterGroup.publish", "Status Publish"), 
            items: [
                { value: "published", label: t("billing.courses.status.published", "Published") },
                { value: "unpublished", label: t("billing.courses.status.unpublished", "Unpublished") },
                { value: "draft", label: t("billing.courses.status.draft", "Draft") },
            ]
        },
        { 
            group: t("billing.courses.filterGroup.verify", "Status Verifikasi"), 
            items: [
                { value: "verified", label: t("billing.courses.filters.verified", "Verified") },
                { value: "unverified", label: t("billing.courses.filters.unverified", "Belum Verified") },
            ]
        }
    ]

    const selectedLabel = 
        value === "all" ? t("billing.courses.filters.allCombined", "Semua") :
        value === "published" ? t("billing.courses.status.published", "Published") :
        value === "unpublished" ? t("billing.courses.status.unpublished", "Unpublished") :
        value === "draft" ? t("billing.courses.status.draft", "Draft") :
        value === "verified" ? t("billing.courses.filters.verified", "Verified") :
        t("billing.courses.filters.unverified", "Belum Verified")

    return (
        <div className="relative inline-flex" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 min-w-[140px]"
            >
                {selectedLabel}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-11 z-20 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-950">
                    <button
                        onClick={() => { onChange("all"); setIsOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${value === "all" ? "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}
                    >
                        {t("billing.courses.filters.allCombined", "Semua")}
                    </button>
                    
                    <div className="px-4 py-1.5 mt-1 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-bold uppercase text-gray-400">{options[1].group as string}</span>
                    </div>
                    {(options[1].items as Array<{value: string, label: string}>).map(item => (
                        <button
                            key={item.value}
                            onClick={() => { onChange(item.value); setIsOpen(false) }}
                            className={`flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${value === item.value ? "text-emerald-600 font-semibold bg-emerald-50/50 dark:bg-emerald-900/10 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400"}`}
                        >
                            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            {item.label}
                        </button>
                    ))}

                    <div className="px-4 py-1.5 mt-1 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-bold uppercase text-gray-400">{options[2].group as string}</span>
                    </div>
                    {(options[2].items as Array<{value: string, label: string}>).map(item => (
                        <button
                            key={item.value}
                            onClick={() => { onChange(item.value); setIsOpen(false) }}
                            className={`flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${value === item.value ? "text-emerald-600 font-semibold bg-emerald-50/50 dark:bg-emerald-900/10 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400"}`}
                        >
                            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function PaketContent() {
    const { t } = useI18n()
    const [courses, setCourses] = useState<AdminCourse[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectedTrainerIds, setSelectedTrainerIds] = useState<Set<string>>(new Set())
    const [detailCourse, setDetailCourse] = useState<AdminCourse | null>(null)
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [showTrainerFilter, setShowTrainerFilter] = useState(false)
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const [combinedFilter, setCombinedFilter] = useState("all")
    const [sortField, setSortField] = useState<SortField>("totalRevenue")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isActing, setIsActing] = useState(false)

    useEffect(() => {
        let isMounted = true
        const token = getClientToken()
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        async function loadCourses() {
            setIsLoading(true)
            try {
                const [courseResponse, trainerResponse] = await Promise.all([
                    fetch(`${API_BASE}/api/v1/Courses?Page=1&PageSize=100`, { headers }),
                    fetch(`${API_BASE}/api/v1/Trainers`, { headers }),
                ])

                if (!courseResponse.ok) throw new Error(`HTTP ${courseResponse.status}`)

                const coursePayload = await courseResponse.json()
                const trainerPayload = trainerResponse.ok ? await trainerResponse.json() : []
                const trainerProfiles = unwrapList(trainerPayload).map(mapApiTrainer).filter((item): item is TrainerProfile => Boolean(item))
                const mapped = unwrapList(coursePayload).map(mapApiCourse).filter((item): item is AdminCourse => Boolean(item))

                if (!isMounted) return
                const mergedCourses = mapped.length > 0 ? [...mapped, ...DUMMY_COURSES] : DUMMY_COURSES
                const enrichedCourses = enrichCoursesWithTrainers(mergedCourses, trainerProfiles)

                if (enrichedCourses.length > 0) {
                    setCourses(enrichedCourses)
                } else {
                    setCourses(DUMMY_COURSES)
                }
            } catch (error) {
                console.error("Failed to load courses:", error)
                if (!isMounted) return
                setCourses(DUMMY_COURSES)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        loadCourses()
        return () => {
            isMounted = false
        }
    }, [])

    const trainers = useMemo<TrainerFilterItem[]>(() => {
        const map = new Map<string, TrainerFilterItem>()
        courses.forEach(course => {
            const id = String(course.trainerId ?? course.trainerName)
            const existing = map.get(id)
            if (existing) {
                existing.totalCourses += 1
                return
            }
            map.set(id, {
                id,
                name: course.trainerName,
                avatar: course.trainerAvatar,
                totalCourses: 1,
                username: String(course.trainerUsername || course.trainerName).toLowerCase().replace(/\s+/g, ''),
            })
        })
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
    }, [courses])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return courses
            .filter(course => {
                const searchable = [
                    course.title,
                    course.trainerName,
                    course.categoryName,
                    course.courseType,
                    course.city,
                    course.tags.join(" "),
                    course.skills.join(" "),
                ].join(" ").toLowerCase()

                const matchSearch = !q || searchable.includes(q)
                let matchCombined = true
                if (combinedFilter === "published") matchCombined = course.status === "published"
                else if (combinedFilter === "unpublished") matchCombined = course.status === "unpublished"
                else if (combinedFilter === "draft") matchCombined = course.status === "draft"
                else if (combinedFilter === "verified") matchCombined = course.isVerified === true
                else if (combinedFilter === "unverified") matchCombined = course.isVerified === false

                const trainerKey = String(course.trainerId ?? course.trainerName)
                const matchTrainer = selectedTrainerIds.size === 0 || selectedTrainerIds.has(trainerKey)
                return matchSearch && matchCombined && matchTrainer
            })
            .sort((a, b) => {
                let av: string | number = a[sortField] as string | number
                let bv: string | number = b[sortField] as string | number
                if (sortField === "packagePrice") {
                    av = a.discountPrice ?? a.packagePrice ?? 0
                    bv = b.discountPrice ?? b.packagePrice ?? 0
                }
                if (typeof av === "string" && typeof bv === "string") {
                    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
                }
                return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av)
            })
    }, [courses, search, combinedFilter, selectedTrainerIds, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const visibleIds = paged.map(course => String(course.id))
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))

    const stats = useMemo(() => {
        const published = courses.filter(course => course.status === "published").length
        const verified = courses.filter(course => course.isVerified).length
        const featured = courses.filter(course => course.isFeatured).length
        const revenue = courses.reduce((sum, course) => sum + course.totalRevenue, 0)
        return { total: courses.length, published, verified, featured, revenue }
    }, [courses])

    function updateCourses(ids: Array<string | number>, patch: Partial<AdminCourse>) {
        const idSet = new Set(ids.map(String))
        setCourses(prev => prev.map(course => idSet.has(String(course.id)) ? { ...course, ...patch } : course))
    }

    function toggleSelect(id: string | number) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            const key = String(id)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    function toggleVisibleSelection() {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (allVisibleSelected) visibleIds.forEach(id => next.delete(id))
            else visibleIds.forEach(id => next.add(id))
            return next
        })
    }

    async function handleSingleAction(course: AdminCourse, action: CourseAction) {
        setIsActing(true)
        const endpointMap = {
            publish: `/api/v1/Courses/${course.id}/publish`,
            unpublish: `/api/v1/Courses/${course.id}/unpublish`,
            verify: `/api/v1/Courses/${course.id}/verify`,
            unverify: `/api/v1/Courses/${course.id}/verify`,
            feature: `/api/v1/Courses/${course.id}/feature`,
            unfeature: `/api/v1/Courses/${course.id}/feature`,
        }
        const patchMap: Record<typeof action, Partial<AdminCourse>> = {
            publish: { status: "published", isPublished: true },
            unpublish: { status: "unpublished", isPublished: false },
            verify: { isVerified: true },
            unverify: { isVerified: false },
            feature: { isFeatured: true },
            unfeature: { isFeatured: false },
        }
        const bodyMap: Record<typeof action, unknown> = {
            publish: undefined,
            unpublish: undefined,
            verify: { isVerified: true, notes: null },
            unverify: { isVerified: false, notes: "Dibatalkan dari dashboard admin" },
            feature: { isFeatured: true },
            unfeature: { isFeatured: false },
        }

        updateCourses([course.id], patchMap[action])
        try {
            if (course.source === "api") await postCourseAction(endpointMap[action], bodyMap[action])
            showToast({
                type: "success",
                title: `Course "${course.title}" berhasil diperbarui`,
                message: course.source === "api" ? "Perubahan dikirim ke API Qurani." : "Mode dummy: perubahan disimpan di state halaman.",
                endpoint: endpointMap[action],
            })
        } catch (error) {
            console.error("Course action failed:", error)
            showToast({
                type: "info",
                title: `Course "${course.title}" diperbarui lokal`,
                message: getActionFallbackMessage(error, "API belum menerima aksi ini, jadi dashboard memakai fallback lokal untuk testing."),
                endpoint: endpointMap[action],
            })
        } finally {
            setIsActing(false)
        }
    }

    async function handleBulkAction(action: "publish" | "unpublish") {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return

        const endpoint = action === "publish" ? "/api/v1/Courses/bulk/publish" : "/api/v1/Courses/bulk/unpublish"
        const nextStatus = action === "publish" ? "published" : "unpublished"

        setIsActing(true)
        updateCourses(ids, { status: nextStatus, isPublished: action === "publish" })

        try {
            const apiIds = courses.filter(course => selectedIds.has(String(course.id)) && course.source === "api").map(course => course.id)
            if (apiIds.length > 0) await postCourseAction(endpoint, { courseIds: apiIds })
            showToast({
                type: "success",
                title: `${ids.length} course berhasil di${action === "publish" ? "publish" : "unpublish"}`,
                message: apiIds.length > 0 ? "Course API dikirim ke Qurani, dummy ikut diperbarui lokal." : "Mode dummy: bulk action siap untuk testing.",
                endpoint,
            })
        } catch (error) {
            console.error("Bulk action failed:", error)
            showToast({
                type: "info",
                title: `${ids.length} course diperbarui lokal`,
                message: getActionFallbackMessage(error, "API bulk belum menerima request, fallback lokal tetap aktif."),
                endpoint,
            })
        } finally {
            setShowBulkModal(false)
            setSelectedIds(new Set())
            setIsActing(false)
        }
    }

    function handleSort(field: SortField) {
        if (sortField === field) setSortDir(prev => prev === "asc" ? "desc" : "asc")
        else {
            setSortField(field)
            setSortDir("asc")
        }
        setPage(1)
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="ml-0.5 inline-block h-3 w-3 opacity-40" />
        return <span className="ml-0.5 inline-block text-emerald-500">{sortDir === "asc" ? "up" : "down"}</span>
    }

    function applySearch() {
        setSearch(searchInput.trim())
        setPage(1)
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950">
            <ToastContainer />

            {detailCourse && <CourseDetailModal course={detailCourse} onClose={() => setDetailCourse(null)} />}
            {showBulkModal && (
                <BulkActionModal
                    selectedCount={selectedIds.size}
                    isActing={isActing}
                    onClose={() => setShowBulkModal(false)}
                    onApply={handleBulkAction}
                />
            )}
            {showTrainerFilter && (
                <TrainerFilterModal
                    trainers={trainers}
                    selectedIds={selectedTrainerIds}
                    onApply={(ids) => { setSelectedTrainerIds(ids); setPage(1) }}
                    onClose={() => setShowTrainerFilter(false)}
                />
            )}

            <div className="mx-auto max-w-[1600px] space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("billing.courses.title", "Teacher Courses")}</h1>
                        </div>
                    </div>

                    <div />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard icon={Package} label={t("billing.courses.summary.total", "Total Course")} value={stats.total.toLocaleString("id-ID")} tone="indigo" />
                    <SummaryCard icon={UploadCloud} label={t("billing.courses.summary.published", "Published")} value={stats.published.toLocaleString("id-ID")} tone="emerald" />
                    <SummaryCard icon={ShieldCheck} label={t("billing.courses.summary.verified", "Verified")} value={stats.verified.toLocaleString("id-ID")} tone="blue" />
                    <SummaryCard icon={Sparkles} label={t("billing.courses.summary.featured", "Featured")} value={stats.featured.toLocaleString("id-ID")} tone="amber" />
                    <SummaryCard icon={GraduationCap} label={t("billing.courses.summary.revenue", "Revenue")} value={formatRupiah(stats.revenue)} tone="rose" />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                disabled={selectedIds.size === 0 || isActing}
                                onClick={() => setShowBulkModal(true)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                {t("billing.courses.bulk.title", "Bulk Actions")}
                            </button>
                            <CombinedFilterDropdown 
                                value={combinedFilter} 
                                onChange={value => { setCombinedFilter(value); setPage(1) }} 
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 dark:border-gray-700 dark:bg-gray-800 sm:w-[360px]">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={searchInput}
                                        onChange={event => setSearchInput(event.target.value)}
                                        onKeyDown={event => {
                                            if (event.key === "Enter") applySearch()
                                        }}
                                        placeholder={t("billing.courses.searchPlaceholder", "Search course...")}
                                        className="h-10 w-full bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none dark:bg-gray-800 dark:text-white"
                                    />
                                </div>
                                <button
                                    onClick={applySearch}
                                    className="inline-flex h-10 items-center gap-1.5 bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                                >
                                    <Search className="h-4 w-4" />
                                    {t("billing.courses.searchButton", "Search")}
                                </button>
                            </div>
                            <button
                                onClick={() => setShowTrainerFilter(true)}
                                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${selectedTrainerIds.size > 0
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    }`}
                            >
                                <Filter className="h-4 w-4" />
                                {t("billing.courses.filter.button", "Teacher Filter")}
                                {selectedTrainerIds.size > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] text-white">
                                        {selectedTrainerIds.size}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60">
                                    <th className="w-10 px-4 py-3 text-left">
                                        <button
                                            onClick={toggleVisibleSelection}
                                            className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${allVisibleSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"}`}
                                            aria-label="Pilih course di halaman ini"
                                        >
                                            {allVisibleSelected && <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </th>
                                    <th onClick={() => handleSort("title")} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {t("billing.courses.table.course", "Course")} <SortIcon field="title" />
                                    </th>
                                    <th onClick={() => handleSort("trainerName")} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {t("billing.courses.table.teacher", "Teacher")} <SortIcon field="trainerName" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">{t("billing.courses.table.info", "Info")}</th>
                                    <th onClick={() => handleSort("totalSessions")} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {t("billing.courses.table.sessions", "Sessions")} <SortIcon field="totalSessions" />
                                    </th>
                                    <th onClick={() => handleSort("packagePrice")} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {t("billing.courses.table.price", "Price")} <SortIcon field="packagePrice" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">{t("billing.courses.table.status", "Status")}</th>
                                    <th onClick={() => handleSort("students")} className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">
                                        {t("billing.courses.table.performance", "Performance")} <SortIcon field="students" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200">{t("billing.courses.table.actions", "Actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={9}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        <Skeleton className="h-4 w-48" />
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="h-5 w-16 rounded-full" />
                                                        <Skeleton className="h-4 w-20" />
                                                        <Skeleton className="h-4 w-24" />
                                                        <Skeleton className="h-4 w-16" />
                                                        <Skeleton className="h-4 w-20" />
                                                        <Skeleton className="h-4 w-16" />
                                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ) : paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-gray-400">
                                            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                            {t("billing.courses.empty", "No courses match the filters.")}
                                        </td>
                                    </tr>
                                ) : paged.map(course => {
                                    const isSelected = selectedIds.has(String(course.id))
                                    const displayPrice = course.isFree ? t("billing.courses.free", "Free") : formatRupiah(course.discountPrice ?? course.packagePrice)

                                    return (
                                        <tr key={course.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => toggleSelect(course.id)}
                                                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${isSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"}`}
                                                    aria-label={`Pilih ${course.title}`}
                                                >
                                                    {isSelected && <Check className="h-3.5 w-3.5" />}
                                                </button>
                                            </td>
                                            <td className="min-w-[260px] px-4 py-4">
                                                <button
                                                    onClick={() => setDetailCourse(course)}
                                                    className="line-clamp-1 text-left text-xs font-black text-gray-900 transition-colors hover:text-emerald-600 hover:underline dark:text-white dark:hover:text-emerald-400"
                                                >
                                                    {course.title}
                                                </button>
                                            </td>
                                            <td className="min-w-[170px] px-4 py-4">
                                                {course.trainerId ? (
                                                    <Link href={`/en/teachers/manage/${course.trainerId}`} className="inline-flex min-w-0 items-center gap-2 rounded-lg transition-colors hover:text-emerald-600">
                                                        <TrainerAvatar src={course.trainerAvatar} name={course.trainerName} size={32} />
                                                        <span className="truncate text-xs font-bold text-gray-900 hover:underline dark:text-white">{course.trainerName}</span>
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <TrainerAvatar src={course.trainerAvatar} name={course.trainerName} size={32} />
                                                        <span className="truncate text-xs font-bold text-gray-900 dark:text-white">{course.trainerName}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="min-w-[110px] px-4 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <Pill className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                        <Globe2 className="mr-1 h-3 w-3" /> {t(`billing.courses.mode.${course.mode}`, MODE_LABEL[course.mode] ?? `Mode ${course.mode}`)}
                                                    </Pill>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{t("billing.courses.sessionsCount", "{{count}} sessions", { count: course.totalSessions })}</p>
                                                <p className="text-[10px] text-gray-500">{t("billing.courses.minutesCount", "{{count}} min", { count: course.duration })}</p>
                                            </td>
                                            <td className="min-w-[125px] px-4 py-4">
                                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{displayPrice}</p>
                                                {course.discountPrice != null && !course.isFree && (
                                                    <p className="text-[10px] text-gray-400 line-through">{formatRupiah(course.packagePrice)}</p>
                                                )}
                                            </td>
                                            <td className="min-w-[150px] px-4 py-4">
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <StatusBadge course={course} />
                                                    <div className="flex gap-1">
                                                        <Pill className={course.isVerified ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}>
                                                            {course.isVerified ? "Verified" : "Unverified"}
                                                        </Pill>
                                                        {course.isFeatured && <Pill className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Featured</Pill>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="min-w-[130px] px-4 py-4">
                                                <div className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-white">
                                                    <Users className="h-3.5 w-3.5 text-blue-500" />
                                                    {t("billing.courses.studentsCount", "{{count}} students", { count: course.students })}
                                                </div>
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                    {course.rating > 0 ? course.rating.toFixed(1) : "-"} - {formatRupiah(course.totalRevenue)}
                                                </div>
                                            </td>
                                            <td className="min-w-[80px] px-4 py-4">
                                                <CourseActionMenu
                                                    course={course}
                                                    isOpen={openActionMenuId === String(course.id)}
                                                    isActing={isActing}
                                                    onToggle={() => setOpenActionMenuId(prev => prev === String(course.id) ? null : String(course.id))}
                                                    onDetail={() => { setDetailCourse(course); setOpenActionMenuId(null) }}
                                                    onAction={(action) => { handleSingleAction(course, action); setOpenActionMenuId(null) }}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-gray-500">
                            {t("billing.courses.pagination.showing", "Showing {{from}}-{{to}} of {{total}} data", {
                                from: filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length),
                                to: Math.min(page * PAGE_SIZE, filtered.length),
                                total: filtered.length,
                            })}
                            {selectedIds.size > 0 ? ` - ${t("billing.courses.pagination.selected", "{{count}} selected", { count: selectedIds.size })}` : ""}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                                <button
                                    key={pageNumber}
                                    onClick={() => setPage(pageNumber)}
                                    className={`h-8 min-w-[32px] rounded-lg border text-xs font-medium transition-colors ${pageNumber === page
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                        }`}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: string; tone: "indigo" | "emerald" | "blue" | "amber" | "rose" }) {
    const toneClass = {
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    }[tone]

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-2 flex items-center gap-2">
                <div className={`rounded-lg p-1.5 ${toneClass}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className="truncate text-2xl font-black text-gray-900 dark:text-white">{value}</p>
        </div>
    )
}

function SegmentedFilter({ value, items, onChange }: { value: string; items: Array<[string, string]>; onChange: (value: string) => void }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
            {items.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
            ))}
        </select>
    )
}

export default function PaketPage() {
    return (
                <PaketContent />
    )
}
