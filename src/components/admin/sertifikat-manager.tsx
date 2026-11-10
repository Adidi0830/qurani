"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Award,
  Search,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ShieldOff,
  LayoutGrid,
  BarChart3,
  List,
  Loader2,
  FileText,
  Calendar,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartPagination } from "@/components/ui/smart-pagination"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  useCertificates,
  useCertificateStatistics,
  useCertificateTemplates,
} from "@/hooks/use-certificates"
import {
  revokeCertificate,
  reinstateCertificate,
} from "@/services/api/certificates"
import type {
  CertificateDto,
  CertificateSearchParams,
} from "@/services/api/certificates"

// ============================================
// Helpers
// ============================================
type ActiveTab = "list" | "statistics" | "templates"
type StatusFilter = "all" | "active" | "revoked" | "expired"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    const day = d.getDate().toString().padStart(2, "0")
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return "—"
  }
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "—"
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return "Baru saja"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} bulan yang lalu`
    return `${Math.floor(diffInSeconds / 31536000)} tahun yang lalu`
  } catch { return "—" }
}

function statusBadge(cert: CertificateDto) {
  if (cert.isRevoked) {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 gap-1">
        <XCircle className="h-3 w-3" /> Dicabut
      </Badge>
    )
  }
  if (cert.isExpired) {
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800 gap-1">
        <Clock className="h-3 w-3" /> Kadaluarsa
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Aktif
    </Badge>
  )
}

// ============================================
// Sub-components
// ============================================

// — Statistics Section
function StatisticsSection() {
  const { statistics, isLoading } = useCertificateStatistics(true)

  const cards = [
    {
      label: "Diterbitkan",
      value: statistics?.totalIssued ?? 0,
      icon: Award,
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Aktif",
      value: statistics?.totalActive ?? 0,
      icon: CheckCircle2,
      color: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Dicabut",
      value: statistics?.totalRevoked ?? 0,
      icon: ShieldOff,
      color: "from-red-500 to-rose-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-300",
    },
    {
      label: "Kadaluarsa",
      value: statistics?.totalExpired ?? 0,
      icon: Clock,
      color: "from-orange-500 to-amber-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-700 dark:text-orange-300",
    },
    {
      label: "Bulan Ini",
      value: statistics?.issuedThisMonth ?? 0,
      icon: Calendar,
      color: "from-purple-500 to-violet-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-700 dark:text-purple-300",
    },
    {
      label: "Tahun Ini",
      value: statistics?.issuedThisYear ?? 0,
      icon: BarChart3,
      color: "from-pink-500 to-fuchsia-500",
      bg: "bg-pink-50 dark:bg-pink-900/20",
      text: "text-pink-700 dark:text-pink-300",
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`${card.bg} border-0 shadow-sm hover:shadow-md transition-shadow duration-200`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-sm flex-shrink-0`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                <p className={`text-2xl font-bold ${card.text} leading-tight`}>{Number(card.value).toLocaleString('id-ID')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// — Templates Section
function TemplatesSection() {
  const { templates, isLoading } = useCertificateTemplates(true)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground gap-3">
        <FileText className="h-12 w-12 opacity-30" />
        <p className="text-sm">Belum ada template sertifikat tersedia.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => (
        <motion.div
          key={tpl.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-border/50 group">
            {tpl.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tpl.previewUrl}
                alt={tpl.name}
                className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
                <Award className="h-14 w-14 text-emerald-400" />
              </div>
            )}
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm flex-1 truncate">{tpl.name}</p>
                {tpl.isDefault && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
                    Default
                  </Badge>
                )}
              </div>
              {tpl.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}


// Main Component
// ============================================
export function SertifikatManager() {
  const router = useRouter()
  const params = useParams()
  const lang = params?.lang || "en"

  const [activeTab, setActiveTab] = useState<ActiveTab>("list")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [reinstatingId, setReinstatingId] = useState<number | null>(null)
  const [revokeReason, setRevokeReason] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeSearch, setActiveSearch] = useState("")

  // Filter states
  const [credentialTypeFilter, setCredentialTypeFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  
  const [activeFilters, setActiveFilters] = useState({
    status: "all" as StatusFilter,
    credentialType: "",
    category: "",
  })

  const [pageSize, setPageSize] = useState(10)

  // Build search params
  const searchParams: CertificateSearchParams = {
    Page: page,
    PageSize: pageSize,
    ...(activeFilters.status === "active" && { IsRevoked: 0, IsExpired: 0 }),
    ...(activeFilters.status === "revoked" && { IsRevoked: 1 }),
    ...(activeFilters.status === "expired" && { IsExpired: 1 }),
    ...(activeFilters.credentialType && { CredentialType: activeFilters.credentialType }),
    ...(activeFilters.category && { Category: activeFilters.category }),
  }

  const { certificates, totalCount, totalPages, isLoading, error, refresh } =
    useCertificates(searchParams, activeTab === "list")

  const { templates } = useCertificateTemplates(activeTab === "list" || activeTab === "templates")

  // Client-side filter by search query (using activeSearch) and activeFilters
  let filtered = certificates.filter((c) => {
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      const match = c.userName?.toLowerCase().includes(q) ||
        c.certificateNumber?.toLowerCase().includes(q) ||
        c.credentialType?.toLowerCase().includes(q) ||
        c.trainerName?.toLowerCase().includes(q);
      if (!match) return false;
    }
    
    // Fallback filters (especially for dummy data where server didn't filter)
    if (activeFilters.status === "active" && (c.isRevoked || c.isExpired)) return false;
    if (activeFilters.status === "revoked" && !c.isRevoked) return false;
    if (activeFilters.status === "expired" && !c.isExpired) return false;
    
    if (activeFilters.credentialType && !c.credentialType?.toLowerCase().includes(activeFilters.credentialType.toLowerCase())) return false;
    if (activeFilters.category && !c.category?.toLowerCase().includes(activeFilters.category.toLowerCase())) return false;

    return true;
  });

  const displayTotalPages = totalPages > 1 ? totalPages : Math.ceil(filtered.length / pageSize) || 1;
  const displayTotalCount = totalPages > 1 ? totalCount : filtered.length;

  // Apply client-side pagination for dummy data fallback
  if (certificates.length > pageSize || totalPages <= 1) {
    filtered = filtered.slice((page - 1) * pageSize, page * pageSize);
  }

  const handleSearch = () => {
    setActiveSearch(searchQuery)
    setPage(1)
  }

  const applyFilters = () => {
    setActiveFilters({
      status: statusFilter,
      credentialType: credentialTypeFilter,
      category: categoryFilter,
    })
    setPage(1)
    setIsFilterOpen(false)
  }

  // ---- Handlers ----
  const handleRevoke = useCallback(async (id: number) => {
    setRevokingId(id)
    try {
      const result = await revokeCertificate({ certificateId: id, reason: revokeReason })
      if (result.success) {
        toast.success("Sertifikat berhasil dicabut.")
        setRevokeReason("")
        refresh()
      } else {
        toast.error(result.error || "Gagal mencabut sertifikat.")
      }
    } catch {
      toast.error("Terjadi kesalahan.")
    } finally {
      setRevokingId(null)
    }
  }, [revokeReason, refresh])

  const handleReinstate = useCallback(async (id: number) => {
    setReinstatingId(id)
    try {
      const result = await reinstateCertificate({ certificateId: id })
      if (result.success) {
        toast.success("Sertifikat berhasil dipulihkan.")
        refresh()
      } else {
        toast.error(result.error || "Gagal memulihkan sertifikat.")
      }
    } catch {
      toast.error("Terjadi kesalahan.")
    } finally {
      setReinstatingId(null)
    }
  }, [refresh])

  // ---- Tabs ----
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "list", label: "Daftar", icon: List },
    { id: "templates", label: "Template", icon: LayoutGrid },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Sertifikat</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => refresh()}
          title="Refresh data"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Statistics di atas Tabs */}
      <StatisticsSection />
      
      <Card className="dark:bg-gray-800/50 bg-white/80 backdrop-blur-sm shadow-md rounded-2xl border border-border/50 overflow-hidden">
        {/* Header: Search+Filter Left | Tabs Right */}
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            {/* LEFT: Search + Filter (only on list tab) */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {activeTab === "list" && (
                <>
                  <div className="relative flex items-center w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari murid, trainer, no sertifikat..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
                      className="pl-9 h-9 text-sm rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      onClick={handleSearch}
                      className="h-9 px-3 rounded-l-none bg-emerald-500 hover:bg-emerald-600 text-white shadow-none flex-shrink-0"
                    >
                      Cari
                    </Button>
                  </div>

                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border h-9 flex-shrink-0 ${
                      activeFilters.status !== "all" || activeFilters.credentialType || activeFilters.category
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Filter className="w-4 h-4" /> Filter
                  </button>

                  <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Filter Sertifikat</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status</label>
                          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua Status</SelectItem>
                              <SelectItem value="active">Aktif</SelectItem>
                              <SelectItem value="revoked">Dicabut</SelectItem>
                              <SelectItem value="expired">Kadaluarsa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tipe Kredensial</label>
                          <Input
                            placeholder="Contoh: Tahfidz, Basic Quran..."
                            value={credentialTypeFilter}
                            onChange={(e) => setCredentialTypeFilter(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Kategori</label>
                          <Input
                            placeholder="Contoh: Kelulusan, Prestasi..."
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={applyFilters} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white">
                          Terapkan Filter
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>

            {/* RIGHT: Tabs */}
            <div className="flex gap-1 bg-muted/40 dark:bg-gray-900/40 rounded-xl p-1 w-fit flex-shrink-0 self-end sm:self-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          <AnimatePresence mode="wait">
            {/* ---- Tab: List ---- */}
            {activeTab === "list" && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >


                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Loading */}
                {isLoading && (
                  <div className="flex items-center justify-center min-h-[180px]">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                )}

                {/* Empty */}
                {!isLoading && !error && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[180px] gap-3 text-muted-foreground">
                    <Award className="h-12 w-12 opacity-20" />
                    <p className="text-sm">
                      {searchQuery ? "Tidak ada sertifikat yang cocok." : "Belum ada sertifikat diterbitkan."}
                    </p>
                  </div>
                )}

                {/* Table — Desktop */}
                {!isLoading && filtered.length > 0 && (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr>
                            {["Murid", "Trainer", "No. Sertifikat", "Tipe", "Status", "Aksi", "Waktu"].map((h) => (
                              <th
                                key={h}
                                className={`px-6 py-4 text-[10px] font-extrabold tracking-wider text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/80 whitespace-nowrap ${h === "Aksi" || h === "Waktu" ? "text-right" : "text-left"}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((cert) => (
                            <motion.tr
                              key={cert.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <td className="px-6 py-4 font-medium">
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => router.push(`/${lang}/users/manage/${cert.userId}`)}
                                    className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[150px] hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left transition-colors"
                                    title="Lihat profil"
                                  >
                                    {cert.userName || `User #${cert.userId}`}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs">
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (cert.trainerId) router.push(`/${lang}/teachers/manage/${cert.trainerId}?from=certificates`); }}
                                  title={cert.trainerId ? "Lihat profil guru" : ""}
                                  className={`text-left ${cert.trainerId ? 'text-gray-800 dark:text-gray-200 font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                  {cert.trainerName || "—"}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-xs">
                                {cert.certificateNumber || "—"}
                              </td>
                              <td className="px-6 py-4">
                                {cert.credentialType ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    {cert.credentialType}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{statusBadge(cert)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center gap-1 justify-end">


                                  {/* Revoke */}
                                  {!cert.isRevoked && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title="Cabut sertifikat"
                                          disabled={revokingId === cert.id}
                                        >
                                          {revokingId === cert.id
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <ShieldOff className="h-4 w-4" />}
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="dark:bg-gray-900">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Cabut Sertifikat</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Sertifikat <strong>{cert.userName || `#${cert.id}`}</strong> akan dicabut.
                                            Tindakan ini dapat dipulihkan kembali.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="py-2">
                                          <Label className="text-sm">Alasan Pencabutan (opsional)</Label>
                                          <Textarea
                                            placeholder="Tuliskan alasan..."
                                            rows={2}
                                            value={revokeReason}
                                            onChange={(e) => setRevokeReason(e.target.value)}
                                            className="mt-1.5"
                                          />
                                        </div>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setRevokeReason("")}>Batal</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleRevoke(cert.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Cabut
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}

                                  {/* Reinstate */}
                                  {cert.isRevoked && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button
                                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                          title="Pulihkan sertifikat"
                                          disabled={reinstatingId === cert.id}
                                        >
                                          {reinstatingId === cert.id
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <RotateCcw className="h-4 w-4" />}
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="dark:bg-gray-900">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Pulihkan Sertifikat</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Apakah Anda yakin ingin memulihkan sertifikat{" "}
                                            <strong>{cert.userName || `#${cert.id}`}</strong>?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        {cert.revokedReason && (
                                          <div className="py-2.5 px-3.5 my-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-sm text-red-800 dark:text-red-300">
                                            <strong className="font-semibold block mb-0.5">Alasan Pencabutan:</strong>
                                            {cert.revokedReason}
                                          </div>
                                        )}
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Batal</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleReinstate(cert.id)}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                          >
                                            Pulihkan
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </td>
                              <td 
                                className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs text-right cursor-help"
                                title={cert.issuedAt ? new Date(cert.issuedAt).toLocaleString() : ""}
                              >
                                {formatTimeAgo(cert.issuedAt)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {displayTotalCount > 0 && (
                      <div className="mt-4">
                        <SmartPagination
                          total={displayTotalCount}
                          page={page}
                          pageSize={pageSize}
                          onPageChange={setPage}
                          onPageSizeChange={setPageSize}
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ---- Tab: Templates ---- */}
            {activeTab === "templates" && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <TemplatesSection />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
