import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateGrup } from "@/utils/api/grup/update"
import { MappedGroup } from "@/types/grup"

interface EditGroupDialogProps {
    group: MappedGroup
    isOpen: boolean
    onClose: () => void
    onSuccess: () => Promise<void>
}

export function EditGroupDialog({ group, isOpen, onClose, onSuccess }: EditGroupDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photo, setPhoto] = useState<File | null>(null)
    const [formData, setFormData] = useState({
        name: group.name,
        description: group.description,
        status: group.isPrivate ? "private" : "public"
    })

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Nama grup tidak boleh kosong")
            return
        }

        setIsSubmitting(true)
        try {
            const data = new FormData()
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null) {
                    data.append(key, value)
                }
            })

            const result = await updateGrup(group.id, data, photo)
            if (result.status === "success") {
                toast.success("Grup berhasil diperbarui")
                onClose()
                await onSuccess()
            } else {
                toast.error(result.message || "Gagal memperbarui grup")
            }
        } catch (error) {
            console.error("Error updating group:", error)
            toast.error("Terjadi kesalahan saat memperbarui grup")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Grup</DialogTitle>
                    <DialogDescription>
                        Ubah informasi grup anda disini
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="photo">Foto Grup</Label>
                        <Input
                            id="photo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama Grup</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Deskripsi</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Status Grup</Label>
                        <RadioGroup
                            value={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="private" id="private" />
                                <Label htmlFor="private">Private</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="public" id="public" />
                                <Label htmlFor="public">Public</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}