"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Edit, Hash, Loader2, Plus, Search, Trash, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useI18n } from "../providers/i18n-provider";
import { Button } from "../ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import useSWR, { mutate } from "swr";
import { getCategories } from "@/utils/api/categories/fetch";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "../ui/label";
import { insertCategory } from "@/utils/api/categories/insert";
import { deleteCategory } from "@/utils/api/categories/delete";
import { updateCategory } from "@/utils/api/categories/update";
import { toast } from "sonner";
import { CATEGORY_LIST } from "@/data/categories-data";

export default function CategoryPage() {
    const { t } = useI18n()
    const [openEdit, setOpenEdit] = useState<boolean>(false)
    const [openCreate, setOpenCreate] = useState<boolean>(false)
    const [deleteAlert, setDeleteAlert] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [categoryName, setCategoryName] = useState<string>("")
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
    const [editCategoryName, setEditCategoryName] = useState<string>("")
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [itemsPerPage] = useState<number>(10)
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [filteredCategories, setFilteredCategories] = useState<Array<{id: string, name: string, group: Array<{id: string, name: string, photo_path?: string}>}>>([])
    const { data: categoriesData, isLoading } = useSWR('categories', getCategories)
    const categoryList = CATEGORY_LIST

    // Search functions
    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) {
            setFilteredCategories([])
            return
        }

        const categories = categoriesData?.data || []
        const filtered = categories
            .map(category => {
                const categoryName = categoryList.find((cat) => cat.id === Number(category.id))?.name || ""
                return { ...category, name: categoryName }
            })
            .filter(category => 
                category.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        setFilteredCategories(filtered)
        setCurrentPage(1) // Reset to first page when searching
    }, [searchQuery, categoriesData, categoryList])

    const clearSearch = () => {
        setSearchQuery("")
        setFilteredCategories([])
        setCurrentPage(1)
    }

    // Auto-search when search query changes
    useEffect(() => {
        if (searchQuery.trim()) {
            const categories = categoriesData?.data || []
            const filtered = categories
                .map(category => {
                    const categoryName = category.name || categoryList.find((cat) => cat.id === Number(category.id))?.name || `Category ${category.id}`
                    return { ...category, name: categoryName }
                })
                .filter(category => 
                    category.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            setFilteredCategories(filtered)
            setCurrentPage(1)
        } else {
            setFilteredCategories([])
        }
    }, [searchQuery, categoriesData, categoryList])

    // Clear search when data changes
    useEffect(() => {
        setSearchQuery("")
        setFilteredCategories([])
    }, [categoriesData])

    const handleCreateCategory = async () => {
        try {
            setIsSaving(true)

            const res = await insertCategory(categoryName)
            
            if (res.status === "error") {
                toast.error(res.message)
            } else {
                setOpenCreate(false)
                setCategoryName("")
                setCurrentPage(1) // Reset to first page
                toast.success("Kategori berhasil dibuat")
                // Refresh the categories data
                mutate('categories')
            }
        } catch {
            toast.error("Error while creating category")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteCategory = async () => {
        try {
            setIsSaving(true)

            const res = await deleteCategory(selectedCategoryId)
            
            if (res.status === "error") {
                toast.error(res.message)
            } else {
                toast.success("Kategori berhasil dihapus")
                setDeleteAlert(false)
                setSelectedCategoryId("")
                setCurrentPage(1) // Reset to first page
                // Refresh the categories data
                mutate('categories')
            }
        } catch {
            toast.error("Error while deleting category")
        } finally {
            setIsSaving(false)
        }
    }

    const handleEditCategory = async () => {
        try {
            setIsSaving(true)

            const res = await updateCategory(selectedCategoryId, editCategoryName)
            
            if (res.status === "error") {
                toast.error(res.message)
            } else {
                toast.success("Kategori berhasil diupdate")
                setOpenEdit(false)
                setSelectedCategoryId("")
                setEditCategoryName("")
                // Refresh the categories data
                mutate('categories')
            }
        } catch {
            toast.error("Error while updating category")
        } finally {
            setIsSaving(false)
        }
    }

    // Pagination logic
    const categories = (categoriesData?.data || []).map(category => {
        const categoryName = category.name || categoryList.find((cat) => cat.id === Number(category.id))?.name || `Category ${category.id}`
        return { ...category, name: categoryName }
    })
    const displayCategories = searchQuery.trim() ? filteredCategories : categories
    const totalCategories = displayCategories.length
    const totalPages = Math.ceil(totalCategories / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedCategories = displayCategories.slice(startIndex, endIndex)
    const startItem = totalCategories === 0 ? 0 : startIndex + 1
    const endItem = Math.min(endIndex, totalCategories)

    return (
        <div className="max-w-7xl mx-auto">
            <Card className="rounded-none py-0 bg-transparent dark:bg-transparent border-none shadow-none">
                <CardHeader className="px-0" >
                    <CardTitle className="flex-shrink-0 md:flex-shrink-auto w-full mx-auto md:max-w-7xl p">
                        <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                            <div className="flex items-center justify-center">
                                <Hash className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                                {t('title', 'Daftar Pengguna')}
                            </h1>
                        </div>
                    </CardTitle>
                </CardHeader>

                <CardContent className="px-0 space-y-6">
                    {/* Search and Filter Bar */}
                    <div className="space-y-4">
                        {/* Search Row */}
                        <div className="flex gap-2 sm:gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <Input
                                    placeholder={t('search_placeholder', 'Cari berdasarkan nama kategori...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch()
                                        }
                                    }}
                                    className="pl-10 pr-10 py-3 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                                        aria-label={t('clear_search', 'Clear search')}
                                    >
                                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                    </button>
                                )}
                            </div>
                            <Button
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg shadow-md"
                                onClick={handleSearch}
                                disabled={searchQuery.length === 0}
                            >
                                <Search className="w-5 h-5 sm:mr-1" />
                                <span className="hidden sm:block">
                                    {t('search', 'Cari')}
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setOpenCreate(true)}
                                className="px-4 py-3 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <Plus className="w-5 h-5 sm:mr-1" />
                                <span className="hidden sm:block">
                                    {t('create_button')}
                                </span>
                            </Button>
                        </div>

                    </div>

                    {/* Users Table */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.name')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.total_group')}
                                    </TableHead>
                                    <TableHead className="font-semibold text-white dark:text-white truncate">
                                        {t('table_headers.actions')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    // Loading skeleton
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-4">
                                                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-40 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            {searchQuery ? t('no_results', 'Tidak ada kategori yang ditemukan') : t('no_categories', 'Belum ada kategori')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedCategories?.map((category) => (
                                        <TableRow key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <TableCell className="py-4 text-gray-900 dark:text-white capitalize">
                                                {category.name || categoryList.find((cat) => cat.id === category.id)?.name || `Category ${category.id}`}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline">{category.group.length}</Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="max-w-72 p-2 bg-white dark:bg-[#1E2939]">
                                                        <div className="flex flex-col space-y-2">
                                                            {category.group.length === 0 ? (
                                                                <span className="text-center py-5 text-gray-700 dark:text-gray-300 text-sm">{t('empty')}</span>
                                                            ) : (
                                                                category.group.map((group: {id: string, name: string, photo_path?: string}) => (
                                                                    <div key={group.id} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                                                                        <div className="relative">
                                                                            {group.photo_path ? (
                                                                                <div
                                                                                    className="h-10 w-10 bg-cover bg-center rounded-full border-2 border-gray-200 dark:border-gray-700"
                                                                                    style={{ 
                                                                                        backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}/storage/v1/object/public/qurani_storage/${group.photo_path})` 
                                                                                    }}
                                                                                />
                                                                                ) : (
                                                                                <div className="h-10 w-10 bg-gray-600 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                                                                    <span className="text-white font-semibold text-lg">
                                                                                        {group.name
                                                                                        .split(" ")
                                                                                        .map((n: string) => n[0])
                                                                                        .join("")
                                                                                        .toUpperCase()
                                                                                        .slice(0, 2)}
                                                                                    </span>
                                                                                </div>
                                                                                )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                                                                                {group.name}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </TableCell>
                                            
                                            <TableCell className="py-4">
                                                <div className="flex items-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCategoryId(category.id)
                                                            const categoryName = category.name || categoryList.find((cat) => cat.id === Number(category.id))?.name || ""
                                                            setEditCategoryName(categoryName)
                                                            setOpenEdit(true)
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 flex items-center"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        {t('actions.edit', 'Edit')}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCategoryId(category.id)
                                                            setDeleteAlert(true)
                                                        }}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 flex items-center"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                        {t('actions.delete', 'Hapus')}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col-reverse gap-3 items-center pt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('pagination.showing', 'Menampilkan {start} - {end} dari {total} kategori')
                            .replace('{start}', startItem.toString())
                            .replace('{end}', endItem.toString())
                            .replace('{total}', totalCategories.toString())}
                        {searchQuery && ` (hasil pencarian "${searchQuery}")`}
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
                            const pages = [];
                            const showPages = 3; // Show 3 page numbers max
                            let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                            const endPage = Math.min(totalPages, startPage + showPages - 1);
                            // Adjust start page if we're near the end
                            if (endPage - startPage + 1 < showPages) {
                                startPage = Math.max(1, endPage - showPages + 1);
                            }
                            // First page + ellipsis
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
                                );
                                if (startPage > 2) {
                                    pages.push(
                                        <span key="ellipsis1" className="px-0.5 text-gray-500">...</span>
                                    );
                                }
                            }
                            // Page numbers
                            for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                    <Button
                                        key={i}
                                        variant={currentPage === i ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(i)}
                                        className={`px-3 py-2 ${currentPage === i ? "bg-gradient-to-r from-emerald-600 to-teal-600 dark:text-white" : ""}`}
                                    >
                                        {i}
                                    </Button>
                                );
                            }
                            // Last page + ellipsis
                            if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                    pages.push(
                                        <span key="ellipsis2" className="px-0.5 text-gray-500">...</span>
                                    );
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
                                );
                            }
                            return pages;
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

            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                                {t('edit_category.title')}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="space-y-2">
                        {/* Category Name Field */}
                        <div>
                            <Label htmlFor="editCategoryName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('edit_category.category_label')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="editCategoryName"
                                    value={editCategoryName}
                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                    className={`py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg`}
                                    placeholder={t('edit_category.category_placeholder')}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setOpenEdit(false)
                                    setSelectedCategoryId("")
                                    setEditCategoryName("")
                                }}
                                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                            >
                                {t('edit_category.cancel')}
                            </Button>
                            <Button
                                onClick={handleEditCategory}
                                disabled={!editCategoryName || isSaving}
                                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t('edit_category.saving', 'Menyimpan...')}
                                    </>
                                ) : (
                                    t('edit_category.save')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                                {t('create_category.title')}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="space-y-2">
                        {/* Category Name Field */}
                        <div>
                            <Label htmlFor="categoryName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('create_category.category_label')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="categoryName"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    className={`py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg`}
                                    placeholder={t('create_category.category_placeholder')}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setOpenCreate(false)
                                    setCategoryName("")
                                }}
                                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
                            >
                                {t('create_category.cancel')}
                            </Button>
                            <Button
                                onClick={handleCreateCategory}
                                disabled={!categoryName || isSaving}
                                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t('create_category.saving')}
                                    </>
                                ) : (
                                    t('create_category.save')
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlert} onOpenChange={setDeleteAlert}>
                <AlertDialogContent className="dark:bg-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                        {t('delete_category.title', 'Hapus Kategori')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                        {t('delete_category.message', 'Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row">
                        <AlertDialogCancel
                        className="cursor-pointer flex-1"
                        onClick={() => {
                            setDeleteAlert(false)
                            setSelectedCategoryId("")
                        }}
                        >
                        {t('common.cancel', 'Batal')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                        className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDeleteCategory}
                        disabled={isSaving}
                        >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('delete_category.deleting', 'Menghapus...')}
                            </>
                        ) : (
                            <>
                                <Trash className="h-4 w-4 mr-2" />
                                {t('delete_category.delete', 'Hapus')}
                            </>
                        )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
