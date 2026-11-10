"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Globe,
  Settings,
} from "lucide-react"

import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { updateGrup } from "@/utils/api/grup/update"
import { deleteGrup } from "@/utils/api/grup/delete"
import { GroupInfoHeader } from "./group-info-header"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Categories, GroupDetail } from "@/types/grup"
import { useI18n } from "@/components/providers/i18n-provider"
// import { fetchAllCategories } from "@/utils/api/grup/fetch"
import { KelolaMember } from "./kelola-member"
import { ImageCrop, ImageCropApply, ImageCropContent } from "@/components/kibo-ui/image-crop"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useGroupsData } from "@/hooks/use-grup-data"
import { useAuth } from "@/hooks/use-auth"
import { CATEGORY_LIST } from "@/data/categories-data"

interface KelolaGrupProps {
  initialGroup: GroupDetail
  onUpdate: (group: GroupDetail) => void
  isOwner: boolean
  userRole?: "admin" | "member" | "owner"
  handleEditGroup?: () => void
}

export function KelolaGrup({ initialGroup, onUpdate, isOwner, userRole }: KelolaGrupProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [group, setGroup] = useState<GroupDetail>(initialGroup)
  /* REMOVED UNUSED LEGACY FETCH */
  // const [categories, setCategories] = useState<Categories[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const categoryList = CATEGORY_LIST
  // const [isLeavingGroup, setIsLeavingGroup] = useState(false)
  // const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const { userId } = useAuth();

  const {
    refresh: refreshGroups
  } = useGroupsData({ userId });

  // REMOVED: Unused fetchFunctions causing phantom requests

  // Form state untuk edit grup
  const [editData, setEditData] = useState({
    name: group.name || "",
    category: group.category?.id || "",
    description: group.description || "",
    status: group.type || "",
  })
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string>("")

  // Image crop states
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [openCropImage, setOpenCropImage] = useState<boolean>(false)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [shouldApplyCrop, setShouldApplyCrop] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const cropApplyRef = useRef<HTMLButtonElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const validatePhotoFile = (file: File): boolean => {
    const maxSize = 3 * 1024 * 1024 // 3MB in bytes
    if (file.size > maxSize) {
      setPhotoError(t('kelola grup.validation.photo_size_exceeded', 'File size must not exceed 3MB'))
      return false
    }
    setPhotoError("")
    return true
  }

  // Function to check if browser supports WebP
  const checkWebPSupport = (): boolean => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  // Function to resize image to specific dimensions (always 400x400)
  const resizeImage = async (src: string, width: number, height: number): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Draw image to fill the canvas, maintaining aspect ratio
        ctx.drawImage(img, 0, 0, width, height)

        // Use WebP if supported, fallback to PNG
        const format = checkWebPSupport() ? 'image/webp' : 'image/png'
        const quality = checkWebPSupport() ? 0.85 : 0.9

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Could not convert canvas to blob'))
            }
          },
          format,
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    })
  }

  const handleImageCrop = (croppedImageData: string) => {
    setCroppedImage(croppedImageData)

    // If shouldApplyCrop flag is set, process the crop immediately
    if (shouldApplyCrop) {
      processCroppedImage(croppedImageData)
    }
  }

  const processCroppedImage = async (croppedImageData: string) => {
    try {
      // Resize image to exactly 400x400 and convert to WebP (with PNG fallback)
      const resizedBlob = await resizeImage(croppedImageData, 400, 400)
      const supportsWebP = checkWebPSupport()
      const fileName = supportsWebP ? 'group-photo.webp' : 'group-photo.png'
      const mimeType = supportsWebP ? 'image/webp' : 'image/png'
      const file = new File([resizedBlob], fileName, { type: mimeType })

      setAvatarPreview(croppedImageData)
      setNewPhoto(file)
      setSelectedAvatar(file)
      setOpenCropImage(false)
      setCroppedImage(null)
      setShouldApplyCrop(false)
    } catch (error) {
      console.error('Error converting cropped image:', error)
      toast.error(t('kelola grup.toast.crop_failed', 'Failed to process cropped image'))
      setShouldApplyCrop(false)
    }
  }

  useEffect(() => {
    if (shouldApplyCrop && cropApplyRef.current) {
      cropApplyRef.current.click()
      setShouldApplyCrop(false)
    }
  }, [shouldApplyCrop])

  const handleApplyCrop = () => {
    if (cropApplyRef.current) {
      // If cropped image already exists, process it immediately
      if (croppedImage) {
        processCroppedImage(croppedImage)
      } else {
        // Set flag and trigger crop
        setShouldApplyCrop(true)
      }
    }
  }

  const handleCancelCrop = () => {
    if (isCancelling) return // Prevent double calls

    setIsCancelling(true)
    setOpenCropImage(false)

    // Reset state after dialog is closed to prevent ImageCrop from reading null
    setTimeout(() => {
      setSelectedAvatar(null)
      setCroppedImage(null)
      setShouldApplyCrop(false)
      setIsCancelling(false)

      // Reset file input to allow selecting the same file again
      const fileInput = document.getElementById('group-photo') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    }, 300) // Wait for dialog close animation
  }

  const handleStatusChange = (value: string) => {
    setEditData(prev => ({
      ...prev,
      status: value
    }))
  }

  const handleUpdateGroup = useCallback(async () => {
    if (!editData.name.trim()) {
      toast.error(t('kelola grup.validation.name_required', 'Group name cannot be empty'))
      return
    }

    if (editData.name.trim().length < 3) {
      toast.error(t('kelola grup.validation.name_min_length', 'Group name must be at least 3 characters'))
      return
    }

    setIsSubmitting(true)
    try {
      // API call untuk update grup
      const formData = new FormData()
      formData.append('name', editData.name.trim())
      formData.append('category', editData.category)
      formData.append('description', editData.description.trim())
      formData.append('status', editData.status)

      const result = await updateGrup(group.id, formData, newPhoto)

      if (result.status === 'success') {
        // Update group state
        const categoryId = editData.category
        const categoryName = categoryList.find((c) => c.id === Number(categoryId))?.name || group.category?.name || ""
        const updatedGroup: GroupDetail = {
          ...group,
          name: editData.name.trim(),
          category: categoryId ? { id: categoryId, name: categoryName } : undefined,
          description: editData.description.trim(),
          is_private: editData.status === 'private',
          type: editData.status.trim()
        }

        setGroup(updatedGroup)
        onUpdate(updatedGroup)
        setShowEditDialog(false)
        setNewPhoto(null)
        setPhotoError("")
        refreshGroups()
        toast.success(result.message || t('kelola grup.toast.group_updated', 'Group updated successfully!'))
      } else {
        toast.error(result.message || t('kelola grup.toast.update_failed', 'Failed to update group'))
      }
    } catch (error) {
      console.error('Error updating group:', error)
      toast.error(t('kelola grup.toast.update_failed', 'An error occurred while updating the group'))
    } finally {
      setIsSubmitting(false)
    }
  }, [editData, group, newPhoto, onUpdate, t, categoryList, refreshGroups])

  const handleDeleteGroup = useCallback(async () => {
    setIsDeletingGroup(true)
    try {
      const result = await deleteGrup(group.id)

      if (result.status === 'success') {
        toast.success(t('kelola grup.toast.group_deleted', 'Group deleted successfully!'))
        await refreshGroups()
        router.push('/grup')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error(t('kelola grup.toast.delete_failed', 'An error occurred while deleting the group'))
    } finally {
      setIsDeletingGroup(false)
    }
  }, [group.id, t, router, refreshGroups])

  const handleOpenEditDialog = () => {
    setEditData({
      name: group.name || "",
      category: group.category?.id || "",
      description: group.description || "",
      status: group.type || "",
    })
    setShowEditDialog(true)
  }

  const handleCloseEditDialog = () => {
    setShowEditDialog(false)
    setNewPhoto(null)
    setPhotoError("")
    setAvatarPreview(null)
    // Reset crop state
    setSelectedAvatar(null)
    setOpenCropImage(false)
    setCroppedImage(null)
    setShouldApplyCrop(false)
  }

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

  return (
    <div className="space-y-4">
      {/* Group Information Card */}
      <GroupInfoHeader
        avatarPreview={avatarPreview}
        group={group}
        userRole={userRole}
        isOwner={isOwner}
        onEditGroup={handleOpenEditDialog}
        onDeleteGroup={handleDeleteGroup}
        isDeletingGroup={isDeletingGroup}
        onMembersDeleted={refreshGroups}
      />

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

      <KelolaMember
        groupId={group.id}
        isOwner={isOwner}
        group={group}
      />

      {/* Leave Group for Admin */}
      {/* {userRole === "admin" && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {t('kelola grup.leave_group.title', 'Keluar dari Grup')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('kelola grup.leave_group.description', 'Anda dapat keluar dari grup ini kapan saja. Tindakan ini tidak dapat dibatalkan.')}
                </p>
              </div>
              <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('kelola grup.leave_group.leave_button', 'Keluar Grup')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-[425px] dark:bg-gray-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-orange-600 dark:text-orange-400">
                      {t('kelola grup.leave_group.dialog_title', 'Keluar dari Grup')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('kelola grup.leave_group.dialog_description_before', 'Apakah Anda yakin ingin keluar dari grup')} <strong>{group.name}</strong>? {t('kelola grup.leave_group.dialog_description_after', 'Tindakan ini tidak dapat dibatalkan dan Anda perlu diundang kembali untuk bergabung lagi.')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                    <AlertDialogCancel
                      disabled={isLeavingGroup}
                    >
                      {t('kelola grup.leave_group.cancel', 'Batal')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeaveGroup}
                      disabled={isLeavingGroup}
                      className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      {isLeavingGroup ? t('kelola grup.leave_group.leaving', 'Keluar...') : t('kelola grup.leave_group.leave', 'Keluar')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )} */}



      {/* Dialog Edit Label */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) {
            handleCloseEditDialog()
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>{t('kelola grup.edit_group.title', 'Edit Group')}</DialogTitle>
          </DialogHeader>
          <div className="grid py-4">
            <div>
              <Label htmlFor="edit-name">{t('kelola grup.edit_group.name_label', 'Group Name')}</Label>
              <Input
                id="edit-name"
                name="name"
                value={editData.name}
                onChange={handleInputChange}
                placeholder={t('kelola grup.edit_group.name_placeholder', 'Group name...')}
                maxLength={50}
                required
              />
              <div className="text-xs text-gray-500 text-right">
                {editData.name.length}/50 characters
              </div>
            </div>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="edit-category">{t('kelola grup.edit_group.category_label')}</Label>
                <Select
                  value={String(editData.category)}
                  onValueChange={(value) => setEditData({ ...editData, category: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      asChild
                      placeholder={t('grup saya.create.category_placeholder')}
                    >
                      <span className="capitalize">
                        {categoryList.find(cat => cat.id === Number(editData.category))?.name || t('grup saya.create.category_placeholder')}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('kelola grup.edit_group.status_label', 'Status')}</Label>
                <RadioGroup
                  value={editData.status}
                  onValueChange={handleStatusChange}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="cursor-pointer">{t('kelola grup.group_info.public', 'Public')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="cursor-pointer">{t('kelola grup.group_info.private', 'Private')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="secret" id="secret" />
                    <Label htmlFor="secret" className="cursor-pointer">{t('kelola grup.group_info.secret', 'Secret')}</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="edit-description">{t('kelola grup.edit_group.description_label', 'Description (Optional)')}</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={editData.description}
                  onChange={handleInputChange}
                  placeholder={t('kelola grup.edit_group.description_placeholder', 'Group description...')}
                  maxLength={500}
                  rows={3}
                />
                <div className="text-xs text-gray-500 text-right">
                  {editData.description.length}/500 characters
                </div>
              </div>
              <div>
                <Label htmlFor="group-photo">{t('kelola grup.edit_group.photo_label', 'Profile Photo (Optional)')}</Label>
                <Input
                  id="group-photo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file) {
                      if (validatePhotoFile(file)) {
                        // Open crop dialog
                        setSelectedAvatar(file)
                        setOpenCropImage(true)
                        setCroppedImage(null)
                        setPhotoError("")
                      } else {
                        setNewPhoto(null)
                      }
                    } else {
                      setNewPhoto(null)
                      setPhotoError("")
                    }
                  }}
                  className="file:text-gray-300"
                />
                {photoError && (
                  <div className="text-sm text-red-500 mt-1">
                    {photoError}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseEditDialog}
              disabled={isSubmitting}
            >
              {t('kelola grup.edit_group.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleUpdateGroup}
              disabled={isSubmitting || !editData.name.trim() || !!photoError}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              {isSubmitting ? t('kelola grup.edit_group.saving', 'Saving...') : t('kelola grup.edit_group.save', 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openCropImage}
        onOpenChange={(open) => {
          if (!open && openCropImage && !isCancelling) {
            // Only cancel if dialog is being closed (not opened) and not already cancelling
            handleCancelCrop()
          }
        }}
      >
        <DialogContent showCloseButton={false} className="
          flex flex-col justify-between p-4 fixed bottom-0 right-0 border-transparent h-screen min-w-screen rounded-none
          sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-auto sm:min-w-[60vw] sm:rounded-lg sm:p-8 sm:border sm:border-white sm:dark:border-gray-600
          lg:min-w-[30vw]
          dark:bg-black 
          "
        >
          <VisuallyHidden>
            <DialogTitle>Crop Image</DialogTitle>
          </VisuallyHidden>
          <div className="flex flex-col justify-between h-full">
            <div className="h-[75vh] flex flex-col justify-center">
              {selectedAvatar && (
                <ImageCrop
                  className="max-w-full max-h-[70vh]"
                  aspect={1}
                  file={selectedAvatar}
                  onChange={console.log}
                  onComplete={console.log}
                  onCrop={handleImageCrop}
                >
                  <ImageCropContent className="max-w-md" />
                  <div className="hidden">
                    {/* Hidden ImageCropApply to trigger crop functionality */}
                    <ImageCropApply ref={cropApplyRef} />
                  </div>
                </ImageCrop>
              )}
            </div>
            <div className="flex justify-between items-center pb-4 sm:pb-0">
              <button
                onClick={handleCancelCrop}
                className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('kelola grup.edit_group.cancel')}
              </button>
              <button
                onClick={handleApplyCrop}
                className="text-sm cursor-pointer md:text-base font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {t('kelola grup.edit_group.done')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
