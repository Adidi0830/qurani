"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/providers/i18n-provider"
import { masterdataApi, TimezoneData, TimezoneRequest } from "@/lib/api"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function TimezonesManager() {
    const { t } = useI18n()

    // Data state
    const [timezones, setTimezones] = useState<TimezoneData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter state
    const [searchInput, setSearchInput] = useState<string>("")
    const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>("")

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    // Form state
    const [formData, setFormData] = useState<Partial<TimezoneRequest>>({
        code: "",
        name: "",
        abbreviation: "",
        utcOffset: 0,
        utcOffsetStr: "+00:00",
        dstOffset: 0,
        observesDst: 0,
        currentlyInDst: 0,
        isActive: 1,
        displayOrder: 1,
    })
    const [editingId, setEditingId] = useState<number | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // ====== FETCH TIMEZONES ======
    const fetchTimezones = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await masterdataApi.timezones.getAll()
            console.log("TIMEZONES_RESPONSE:", JSON.stringify(response.data?.slice(0, 3)))
            if (response.success && response.data) {
                setTimezones(response.data)
            } else {
                setTimezones([])
            }
        } catch (err) {
            console.error("Error fetching timezones:", err)
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTimezones()
    }, [])

    const filteredTimezones = timezones.filter(tz => 
        tz.name.toLowerCase().includes(appliedSearchQuery.toLowerCase()) || 
        tz.code.toLowerCase().includes(appliedSearchQuery.toLowerCase())
    )

    const totalPages = Math.ceil(filteredTimezones.length / itemsPerPage)
    const paginatedTimezones = filteredTimezones.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleSearch = () => {
        setAppliedSearchQuery(searchInput)
        setCurrentPage(1)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    // ====== CRUD HANDLERS ======
    const handleCreateTimezone = async () => {
        if (!formData.name || !formData.code || !formData.utcOffsetStr) {
            toast.error("Name, Code, and UTC Offset String are required")
            return
        }

        setIsSubmitting(true)
        try {
            const requestData: TimezoneRequest = {
                code: formData.code,
                name: formData.name,
                abbreviation: formData.abbreviation || null,
                utcOffset: Number(formData.utcOffset) || 0,
                utcOffsetStr: formData.utcOffsetStr,
                dstOffset: Number(formData.dstOffset) || 0,
                observesDst: formData.observesDst ? 1 : 0,
                currentlyInDst: formData.currentlyInDst ? 1 : 0,
                isActive: formData.isActive ? 1 : 0,
                displayOrder: Number(formData.displayOrder) || 1,
            }

            const response = await masterdataApi.timezones.create(requestData)
            if (response.success || response.data) {
                fetchTimezones()
                setIsCreateModalOpen(false)
                resetForm()
                toast.success("Timezone created successfully")
            }
        } catch (err) {
            console.error("Error creating timezone:", err)
            toast.error("Failed to create timezone")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditClick = (tz: TimezoneData) => {
        setEditingId(tz.id)
        setFormData({
            code: tz.code,
            name: tz.name,
            abbreviation: tz.abbreviation || "",
            utcOffset: tz.utcOffset,
            utcOffsetStr: tz.utcOffsetStr,
            dstOffset: tz.dstOffset,
            observesDst: tz.observesDst,
            currentlyInDst: tz.currentlyInDst,
            isActive: tz.isActive,
            displayOrder: tz.displayOrder,
        })
        setIsEditModalOpen(true)
    }

    const handleUpdateTimezone = async () => {
        if (!editingId || !formData.name || !formData.code) {
            toast.error("Name and Code are required")
            return
        }

        setIsSubmitting(true)
        try {
            const requestData: TimezoneRequest = {
                code: formData.code,
                name: formData.name,
                abbreviation: formData.abbreviation || null,
                utcOffset: Number(formData.utcOffset) || 0,
                utcOffsetStr: formData.utcOffsetStr || "+00:00",
                dstOffset: Number(formData.dstOffset) || 0,
                observesDst: formData.observesDst ? 1 : 0,
                currentlyInDst: formData.currentlyInDst ? 1 : 0,
                isActive: formData.isActive ? 1 : 0,
                displayOrder: Number(formData.displayOrder) || 1,
            }

            const response = await masterdataApi.timezones.update(editingId, requestData)
            if (response.success || response.data) {
                fetchTimezones()
                setIsEditModalOpen(false)
                resetForm()
                setEditingId(null)
                toast.success("Timezone updated successfully")
            }
        } catch (err) {
            console.error("Error updating timezone:", err)
            toast.error("Failed to update timezone")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = (id: number, name: string) => {
        setItemToDelete({ id, name })
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        setIsDeleting(true)
        try {
            await masterdataApi.timezones.delete(itemToDelete.id)
            fetchTimezones()
            toast.success("Timezone deleted successfully")
        } catch (err) {
            console.error("Error deleting:", err)
            toast.error("Failed to delete timezone")
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        }
    }

    const resetForm = () => {
        setFormData({
            code: "",
            name: "",
            abbreviation: "",
            utcOffset: 0,
            utcOffsetStr: "+00:00",
            dstOffset: 0,
            observesDst: 0,
            currentlyInDst: 0,
            isActive: 1,
            displayOrder: 1,
        })
    }

    // ====== RENDER ======

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex gap-2 sm:gap-3 items-center mb-6">
                    <Skeleton className="h-10 flex-1" />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="h-12 bg-emerald-600/10 border-b border-gray-200 flex items-center px-4">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 border-b border-gray-100 flex items-center px-4 gap-4">
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-inter">
            {/* Header and Toolbar */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TimeZones</h1>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:min-w-[300px] flex">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search timezones..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9 pr-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            className="rounded-l-none bg-emerald-500 hover:bg-emerald-600 text-white transition-colors h-10 px-4 gap-2 border border-emerald-500 border-l-0"
                        >
                            <Search className="w-4 h-4" />
                            <span className="hidden sm:inline">Search</span>
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 shrink-0 h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filter</span>
                    </Button>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Button
                        onClick={() => {
                            resetForm()
                            setIsCreateModalOpen(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("common.create", "Create")}
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-600 dark:hover:bg-emerald-700">
                                <TableHead className="w-20 text-white font-bold">ID</TableHead>
                                <TableHead className="min-w-[200px] text-white font-bold">Timezone</TableHead>
                                <TableHead className="w-32 text-white font-bold">Code</TableHead>
                                <TableHead className="w-32 text-white font-bold">UTC Offset</TableHead>
                                <TableHead className="w-24 text-white font-bold">DST</TableHead>
                                <TableHead className="w-24 text-white font-bold">Status</TableHead>
                                <TableHead className="w-[120px] text-center text-white font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTimezones.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                        No timezones found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTimezones.map((tz) => (
                                    <TableRow key={tz.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => handleEditClick(tz)}>
                                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                            #{tz.id}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 overflow-hidden">
                                                    {tz.code ? tz.code.substring(0, 2).toUpperCase() : "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {tz.name}
                                                    </p>
                                                    {tz.abbreviation && (
                                                        <p className="text-xs text-gray-500">{tz.abbreviation}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-900 dark:text-white">
                                            {tz.code}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {tz.utcOffsetStr}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tz.observesDst ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {tz.observesDst ? 'Yes' : 'No'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tz.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {tz.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="inline-flex items-center rounded overflow-hidden border border-emerald-600 text-[11px] h-6">
                                                <button
                                                    className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(tz) }}
                                                >
                                                    <Pencil className="w-2.5 h-2.5" />
                                                    Edit
                                                </button>
                                                <div className="w-px h-full bg-emerald-500" />
                                                <button
                                                    className="flex items-center gap-0.5 px-1.5 h-full bg-emerald-600 hover:bg-red-600 text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(tz.id, tz.name) }}
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination Controls */}
            {filteredTimezones.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap justify-center sm:justify-start">
                        <span>Menampilkan <span className="font-bold text-emerald-600">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTimezones.length)}</span> dari <span className="font-bold text-gray-700 dark:text-gray-200">{filteredTimezones.length}</span> data</span>
                        <div className="flex items-center gap-2">
                            <span>Baris:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="h-8 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-2 outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                                disabled={currentPage === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = currentPage - 2 + i
                                }
                                return (
                                    <button 
                                        key={pageNum} 
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg text-sm font-medium transition-colors border",
                                            currentPage === pageNum
                                                ? "bg-emerald-500 text-white shadow-sm border-emerald-500"
                                                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}

                            <button 
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateModalOpen(false)
                    setIsEditModalOpen(false)
                    setTimeout(resetForm, 200)
                }
            }}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden font-inter border-0 shadow-2xl">
                    <DialogHeader className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-emerald-100/50 dark:border-emerald-800/30">
                        <DialogTitle className="text-xl text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                            {isEditModalOpen ? (
                                <><Pencil className="w-5 h-5" /> Edit Timezone</>
                            ) : (
                                <><Plus className="w-5 h-5" /> Add New Timezone</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-sm font-semibold">Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. Asia/Jakarta"
                                    value={formData.code || ""}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="utcOffsetStr" className="text-sm font-semibold">UTC Offset Str</Label>
                                <Input
                                    id="utcOffsetStr"
                                    placeholder="e.g. +07:00"
                                    value={formData.utcOffsetStr || ""}
                                    onChange={e => setFormData({ ...formData, utcOffsetStr: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Western Indonesia Time"
                                value={formData.name || ""}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="abbreviation" className="text-sm font-semibold">Abbreviation</Label>
                                <Input
                                    id="abbreviation"
                                    placeholder="e.g. WIB"
                                    value={formData.abbreviation || ""}
                                    onChange={e => setFormData({ ...formData, abbreviation: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="utcOffset" className="text-sm font-semibold">UTC Offset (hours)</Label>
                                <Input
                                    id="utcOffset"
                                    type="number"
                                    value={formData.utcOffset || 0}
                                    onChange={e => setFormData({ ...formData, utcOffset: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox 
                                id="observesDst" 
                                checked={formData.observesDst === 1}
                                onCheckedChange={(checked) => setFormData({ ...formData, observesDst: checked ? 1 : 0 })}
                            />
                            <Label htmlFor="observesDst" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Observes Daylight Saving Time (DST)
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="isActive" 
                                checked={formData.isActive === 1}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked ? 1 : 0 })}
                            />
                            <Label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Active Timezone
                            </Label>
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-0 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateModalOpen(false)
                                setIsEditModalOpen(false)
                            }}
                            className="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={isEditModalOpen ? handleUpdateTimezone : handleCreateTimezone}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="font-inter">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the timezone <strong>{itemToDelete?.name}</strong>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
