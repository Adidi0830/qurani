"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Plus,
    Search,
    Globe,
    Pencil,
    Trash2,
    Eye,
} from "lucide-react"
import { toast } from "sonner"
import { masterdataApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Combobox } from "@/components/ui/combobox"

export function LocalesManager() {
    const [locales, setLocales] = useState<any[]>([])
    const [languages, setLanguages] = useState<any[]>([])
    const [countries, setCountries] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    const [searchInput, setSearchInput] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [localeToView, setLocaleToView] = useState<any>(null)
    const [localeToDelete, setLocaleToDelete] = useState<any>(null)

    const initialForm = {
        id: "", name: "", nativeName: "", languageCode: "", countryCode: "", 
        dateFormatShort: "", uses12HourClock: 1, currencyCode: "", isActive: 1
    }
    const [formData, setFormData] = useState<any>(initialForm)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [locRes, langRes, ctyRes] = await Promise.all([
                masterdataApi.locales.getAll(),
                masterdataApi.languages.getAll(),
                masterdataApi.countries.getAll()
            ])
            if (locRes.success && locRes.data) setLocales(locRes.data)
            if (langRes.success && langRes.data) setLanguages(langRes.data)
            if (ctyRes.success && ctyRes.data) setCountries(ctyRes.data)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const filteredLocales = useMemo(() => {
        return locales.filter((l) =>
            l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.id?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [locales, searchQuery])

    // Pagination Logic
    const totalPages = Math.ceil(filteredLocales.length / itemsPerPage)
    const displayedLocales = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredLocales.slice(start, start + itemsPerPage)
    }, [filteredLocales, currentPage])

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    const handleSearchClick = () => {
        setSearchQuery(searchInput)
        setCurrentPage(1)
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            setSearchQuery(searchInput)
            setCurrentPage(1)
        }
    }

    const handleSave = async () => {
        if (!formData.id || !formData.name) return toast.error("ID and Name required")
        setIsSubmitting(true)
        try {
            const payload = { ...formData }
            // Ensure boolean fields are sent as integers (1 or 0)
            payload.isActive = parseInt(payload.isActive)
            payload.uses12HourClock = parseInt(payload.uses12HourClock)

            let res;
            if (isEditing) {
                res = await masterdataApi.locales.update(payload.id, payload)
            } else {
                res = await masterdataApi.locales.create(payload)
            }

            if (res?.success === false) {
                toast.error(res?.message || "Gagal menyimpan data ke API")
            } else {
                toast.success(isEditing ? "Locale berhasil diperbarui" : "Locale berhasil dibuat")
                fetchData()
                setIsModalOpen(false)
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to save")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        try {
            const res = await masterdataApi.locales.delete(localeToDelete.id)
            if (res?.success === false) {
                toast.error(res?.message || "Gagal menghapus")
            } else {
                toast.success("Locale deleted")
                fetchData()
            }
        } catch (e) {
            toast.error("Failed to delete")
        } finally {
            setDeleteDialogOpen(false)
        }
    }

    const openEdit = (l: any) => {
        setFormData(l)
        setIsEditing(true)
        setIsModalOpen(true)
    }

    const openCreate = () => {
        setFormData(initialForm)
        setIsEditing(false)
        setIsModalOpen(true)
    }

    const openDetail = (l: any) => {
        setLocaleToView(l)
        setIsDetailOpen(true)
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold dark:text-white">Locales</h1>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Create
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                    {/* Kiri: Search */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex flex-1 sm:flex-none sm:w-64 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                            <div className="relative flex-1 bg-gray-50 dark:bg-gray-800">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search locales..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleSearchClick}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex-shrink-0"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>
                
                <Table>
                    <TableHeader className="bg-emerald-600 dark:bg-emerald-700">
                        <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                            <TableHead className="text-white font-bold pl-4">ID</TableHead>
                            <TableHead className="text-white font-bold">Name</TableHead>
                            <TableHead className="text-white font-bold">Language</TableHead>
                            <TableHead className="text-white font-bold">Country</TableHead>
                            <TableHead className="text-white font-bold text-center">Status</TableHead>
                            <TableHead className="text-white font-bold text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedLocales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    Tidak ada data Locale.
                                </TableCell>
                            </TableRow>
                        ) : displayedLocales.map((l) => {
                            // Extract fallback code from ID if the API returned null (e.g. af_NA -> af and NA)
                            const fallbackLangCode = l.languageCode || (l.id && l.id.includes('_') ? l.id.split('_')[0] : l.id)
                            const fallbackCountryCode = l.countryCode || (l.id && l.id.includes('_') ? l.id.split('_')[1] : null)

                            // Find real language and country names from their master data if available
                            const langObj = languages.find(lang => 
                                lang.id?.toLowerCase() === fallbackLangCode?.toLowerCase() || 
                                lang.iso639_2?.toLowerCase() === fallbackLangCode?.toLowerCase()
                            )
                            const countryObj = countries.find(c => 
                                c.iso2?.toLowerCase() === fallbackCountryCode?.toLowerCase()
                            )

                            const langName = langObj ? langObj.name : (fallbackLangCode || "—")
                            const countryName = countryObj ? countryObj.name : (fallbackCountryCode || "—")
                            
                            // Handle API boolean, string "1", or int 1
                            const isActive = l.isActive === 1 || l.isActive === "1" || l.isActive === true;

                            return (
                                <TableRow key={l.id} className="hover:bg-transparent dark:hover:bg-transparent">
                                    <TableCell className="pl-4 font-mono font-medium text-emerald-600">{l.id}</TableCell>
                                    <TableCell>{l.name}</TableCell>
                                    <TableCell>{langName}</TableCell>
                                    <TableCell>{countryName}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={isActive ? "text-emerald-600 font-medium" : "text-gray-500 font-medium"}>
                                            {isActive ? "Active" : "Inactive"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="inline-flex border border-emerald-600 rounded text-[11px]">
                                            <button onClick={() => openDetail(l)} className="px-2 py-1 bg-white text-emerald-600 hover:bg-emerald-50" title="View Detail">
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="w-px bg-emerald-500" />
                                            <button onClick={() => openEdit(l)} className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700">Edit</button>
                                            <div className="w-px bg-emerald-500" />
                                            <button onClick={() => { setLocaleToDelete(l); setDeleteDialogOpen(true); }} className="px-2 py-1 bg-white text-red-600 hover:bg-red-50">Delete</button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {filteredLocales.length > 0 && totalPages > 1 && (
                <div className="flex justify-center mb-6">
                    <Pagination>
                        <PaginationContent className="gap-2">
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage > 1) goToPage(currentPage - 1)
                                    }}
                                    className={cn(
                                        currentPage === 1
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                    )}
                                />
                            </PaginationItem>

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
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                goToPage(pageNum)
                                            }}
                                            isActive={currentPage === pageNum}
                                            className={cn(
                                                "cursor-pointer",
                                                currentPage === pageNum &&
                                                "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md"
                                            )}
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (currentPage < totalPages) goToPage(currentPage + 1)
                                    }}
                                    className={cn(
                                        currentPage === totalPages
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            {/* Create / Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Edit Locale" : "Create Locale"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <Label>ID (Locale Code) <span className="text-red-500">*</span></Label>
                            <Input placeholder="e.g. af_NA" value={formData.id || ""} onChange={e => setFormData((p: any) => ({...p, id: e.target.value}))} disabled={isEditing} />
                            <p className="text-[10px] text-gray-500">Kombinasi Language dan Country Code (ex: id_ID)</p>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <Label>Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="e.g. Afrikaans (Namibia)" value={formData.name || ""} onChange={e => setFormData((p: any) => ({...p, name: e.target.value}))} />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label>Native Name</Label>
                            <Input placeholder="e.g. Bahasa Indonesia" value={formData.nativeName || ""} onChange={e => setFormData((p: any) => ({...p, nativeName: e.target.value}))} />
                        </div>
                        
                        <div className="space-y-1">
                            <Label>Language Code</Label>
                            <Combobox
                                options={languages.map(lang => ({ label: `${lang.name} (${lang.id})`, value: lang.id }))}
                                value={formData.languageCode || ""}
                                onValueChange={(val) => setFormData((p: any) => ({...p, languageCode: val}))}
                                placeholder="-- Select Language --"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Country Code</Label>
                            <Combobox
                                options={countries.map(c => ({ label: `${c.name} (${c.iso2})`, value: c.iso2 }))}
                                value={formData.countryCode || ""}
                                onValueChange={(val) => setFormData((p: any) => ({...p, countryCode: val}))}
                                placeholder="-- Select Country --"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Date Format (Short)</Label>
                            <Input placeholder="e.g. yyyy-MM-dd" value={formData.dateFormatShort || ""} onChange={e => setFormData((p: any) => ({...p, dateFormatShort: e.target.value}))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Currency Code</Label>
                            <Input placeholder="e.g. USD, IDR" value={formData.currencyCode || ""} onChange={e => setFormData((p: any) => ({...p, currencyCode: e.target.value}))} />
                        </div>

                        <div className="space-y-1">
                            <Label>Active Status</Label>
                            <select 
                                className="w-full h-10 px-3 border rounded-md dark:bg-gray-900 border-gray-200 text-sm"
                                value={formData.isActive || 0} 
                                onChange={e => setFormData((p: any) => ({...p, isActive: parseInt(e.target.value)}))}
                            >
                                <option value={1}>Active</option>
                                <option value={0}>Inactive</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Use 12-Hour Clock</Label>
                            <select 
                                className="w-full h-10 px-3 border rounded-md dark:bg-gray-900 border-gray-200 text-sm"
                                value={formData.uses12HourClock || 0} 
                                onChange={e => setFormData((p: any) => ({...p, uses12HourClock: parseInt(e.target.value)}))}
                            >
                                <option value={1}>Yes (AM/PM)</option>
                                <option value={0}>No (24h)</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detail Locale</DialogTitle>
                    </DialogHeader>
                    {localeToView && (() => {
                        const fallbackLangCode = localeToView.languageCode || (localeToView.id && localeToView.id.includes('_') ? localeToView.id.split('_')[0] : localeToView.id)
                        const fallbackCountryCode = localeToView.countryCode || (localeToView.id && localeToView.id.includes('_') ? localeToView.id.split('_')[1] : null)

                        const langObj = languages.find(lang => lang.id?.toLowerCase() === fallbackLangCode?.toLowerCase() || lang.iso639_2?.toLowerCase() === fallbackLangCode?.toLowerCase())
                        const countryObj = countries.find(c => c.iso2?.toLowerCase() === fallbackCountryCode?.toLowerCase())

                        const langName = langObj ? langObj.name : (fallbackLangCode || "—")
                        const countryName = countryObj ? countryObj.name : (fallbackCountryCode || "—")
                        
                        const isActive = localeToView.isActive === 1 || localeToView.isActive === true || localeToView.isActive === "1";

                        return (
                            <div className="space-y-4 py-4 text-sm">
                                <div className="grid grid-cols-2 gap-y-2 border-b pb-4">
                                    <div className="text-gray-500">ID (Kode Wilayah):</div>
                                    <div className="font-semibold text-emerald-600">{localeToView.id}</div>
                                    
                                    <div className="text-gray-500">Nama:</div>
                                    <div className="font-semibold">{localeToView.name}</div>
                                    
                                    <div className="text-gray-500">Nama Asli (Native):</div>
                                    <div className="font-semibold">{localeToView.nativeName || "—"}</div>
                                    
                                    <div className="text-gray-500">Bahasa:</div>
                                    <div className="font-semibold">{langName}</div>
                                    
                                    <div className="text-gray-500">Negara:</div>
                                    <div className="font-semibold">{countryName}</div>
                                    
                                    <div className="text-gray-500">Status:</div>
                                    <div>
                                        <span className={isActive ? "bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium" : "bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium"}>
                                            {isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-y-2 pt-2">
                                    <div className="text-gray-500">Format Tanggal:</div>
                                    <div>{localeToView.dateFormatShort || "—"}</div>

                                    <div className="text-gray-500">Sistem Jam:</div>
                                    <div>{(localeToView.uses12HourClock === 1 || localeToView.uses12HourClock === true || localeToView.uses12HourClock === "1") ? "12 Jam (AM/PM)" : "24 Jam"}</div>

                                    <div className="text-gray-500">Mata Uang:</div>
                                    <div>{localeToView.currencyCode || "—"}</div>
                                </div>
                            </div>
                        )
                    })()}
                    <DialogFooter>
                        <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the locale {localeToDelete?.name}.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
