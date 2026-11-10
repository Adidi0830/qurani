"use client"

import { useCallback, useRef, useState } from "react"

import { ticketsApi } from "../data/api"
import { createTicketReply } from "../data/create"
import { updateTicketStatus } from "../data/update"
import { uploadMultipleAttachments } from "../data/upload"
import { MAX_REPLY_ATTACHMENTS } from "../model/constants"
import type { TicketReply } from "../model/types"

const ATTACHMENT_PLACEHOLDER = "📎 Attachment"

/**
 * Kirim balasan admin.
 *
 * Alur yang dipertahankan dari versi lama:
 *  1. Upload lampiran dulu (bila ada).
 *  2. Tampilkan balasan secara optimistis.
 *  3. Coba API Qurani. Tiket dengan id kecil (< 1 juta) diasumsikan sisa
 *     Supabase sehingga API pasti gagal — untuk kasus itu jatuh ke server action.
 *  4. Balasan "Open" otomatis menjadi "Answered".
 */
export function useTicketReplyComposer({
    ticketId,
    author,
    currentStatus,
    onOptimistic,
    onRevert,
    onStatusChanged,
}: {
    ticketId: number
    author: string
    currentStatus: string
    onOptimistic: (reply: TicketReply) => void
    onRevert: () => void
    onStatusChanged: (status: string) => void
}) {
    const [content, setContent] = useState("")
    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [isSending, setIsSending] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const addFiles = useCallback(
        (incoming: File[]) => {
            const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
            const valid = incoming.filter((f) => allowed.includes(f.type))

            if (valid.length !== incoming.length) {
                alert("Only image files (jpg, png, gif, webp) are allowed")
            }

            const next = [...files, ...valid].slice(0, MAX_REPLY_ATTACHMENTS)
            setFiles(next)

            next.forEach((file, index) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    setPreviews((prev) => {
                        const updated = [...prev]
                        updated[index] = e.target?.result as string
                        return updated
                    })
                }
                reader.readAsDataURL(file)
            })

            if (fileInputRef.current) fileInputRef.current.value = ""
        },
        [files],
    )

    const removeFile = useCallback((index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
        setPreviews((prev) => prev.filter((_, i) => i !== index))
    }, [])

    const reset = useCallback(() => {
        setContent("")
        setFiles([])
        setPreviews([])
    }, [])

    const canSend = content.trim().length > 0 || files.length > 0

    const send = useCallback(async () => {
        if (!canSend) return

        setIsSending(true)

        const message = content.trim()
        const hasAttachments = files.length > 0
        let attachmentUrls: string[] = []

        try {
            if (hasAttachments) {
                setIsUploading(true)
                const uploadResult = await uploadMultipleAttachments(files, ticketId)
                setIsUploading(false)

                if (!uploadResult.success) {
                    alert(
                        "Failed to upload some files: " +
                            (uploadResult.errors?.join(", ") || "Unknown error"),
                    )
                }
                if (uploadResult.urls) attachmentUrls = uploadResult.urls
            }

            const attachmentsJson =
                attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null
            const displayMessage = message || (hasAttachments ? ATTACHMENT_PLACEHOLDER : "")

            // Optimistic reply — dibalik bila request gagal total.
            onOptimistic({
                id: Date.now(),
                ticket_id: ticketId,
                author,
                message: displayMessage,
                date: new Date().toISOString(),
                attachments: attachmentsJson,
            })

            const draft = { message: displayMessage }
            reset()

            let replySuccess = false
            let apiError: string | null = null

            const isLegacyTicket = ticketId < 1_000_000

            if (!isLegacyTicket) {
                try {
                    const result = await ticketsApi.replyTicket(ticketId, { name: author, message: draft.message })

                    if (result?.success === false || result?.error) {
                        apiError = result?.message || result?.error || "Unknown error"
                    } else {
                        replySuccess = true
                    }
                } catch (err: any) {
                    apiError = err?.message || "API request failed"

                    // API sometimes returns 403 yet still persists the reply.
                    if (apiError?.includes("Access denied") || apiError?.includes("403")) {
                        console.log("[reply] Access denied — will refresh to confirm")
                    }
                }
            }

            // Tiket legacy / API gagal → coba server action.
            if (!replySuccess) {
                try {
                    const result = await createTicketReply({
                        ticket_id: ticketId,
                        author,
                        message: draft.message,
                        attachments: attachmentsJson || undefined,
                        isFromAdmin: true,
                    })

                    if (result.success) {
                        replySuccess = true
                    } else {
                        apiError = result.error || "Server action failed"
                    }
                } catch (err: any) {
                    apiError = err?.message || "Server action failed"
                }
            }

            if (!replySuccess) {
                // Jangan alert untuk "Access denied" — kemungkinan tetap tersimpan.
                if (!apiError?.includes("Access denied")) {
                    console.warn("[reply] Reply may have failed:", apiError)
                }
            }

            const nextStatus = currentStatus === "Open" ? "Answered" : currentStatus
            if (nextStatus !== currentStatus) {
                await updateTicketStatus(ticketId, nextStatus)
                onStatusChanged(nextStatus)
            }
        } catch (error) {
            console.error("Error sending reply:", error)
            onRevert()
            setContent(message)
            alert("Failed to send reply. Please try again.")
        } finally {
            setIsSending(false)
            setIsUploading(false)
        }
    }, [
        canSend,
        files,
        content,
        ticketId,
        author,
        currentStatus,
        onOptimistic,
        onRevert,
        onStatusChanged,
        reset,
    ])

    return {
        content,
        setContent,
        files,
        previews,
        isSending,
        isUploading,
        fileInputRef,
        canSend,
        addFiles,
        removeFile,
        reset,
        send,
        ATTACHMENT_PLACEHOLDER,
    }
}