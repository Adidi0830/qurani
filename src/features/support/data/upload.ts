"use client"

/**
 * Support — Attachment Upload (client-side)
 *
 * Berpindah dari `src/utils/api/tickets/upload.ts`.
 * Kompresi gambar tetap di client via canvas; upload lewat REST ticketsApi.
 */

import { ticketsApi } from "./api"
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE_BYTES, MAX_REPLY_ATTACHMENTS } from "../model/constants"
import type { MultiUploadResult, UploadResult } from "../model/types"

/**
 * Kompres gambar bila > 1MB: turunkan dimensi (maks 1920px) dan konversi ke webp.
 */
async function compressImage(file: File): Promise<File> {
    if (file.size <= 1024 * 1024) {
        return file
    }

    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement("canvas")

                let { width, height } = img
                const maxDimension = 1920

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension
                        width = maxDimension
                    } else {
                        width = (width / height) * maxDimension
                        height = maxDimension
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    resolve(file)
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                                type: "image/webp",
                            })
                            console.log(
                                `📦 Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                            )
                            resolve(compressedFile)
                        } else {
                            resolve(file)
                        }
                    },
                    "image/webp",
                    0.85,
                )
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    })
}

export async function uploadTicketAttachment(file: File, ticketId: number): Promise<UploadResult> {
    try {
        if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
            return {
                success: false,
                error: `Invalid file type: ${file.type}. Allowed: jpg, png, gif, webp`,
            }
        }

        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            return {
                success: false,
                error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 10MB`,
            }
        }

        const processedFile = await compressImage(file)

        const response = await ticketsApi.uploadAttachment(ticketId, processedFile)

        // API/myqurani bisa mengembalikan { data: { url } }, { url }, atau { path }.
        const uploadedUrl = response.data?.url || response.url || response.data?.path || response.path

        if (response.success === false) {
            return { success: false, error: response.message || response.error || "Upload failed" }
        }

        return { success: true, url: uploadedUrl }
    } catch (error: any) {
        console.error("Upload error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

export async function uploadMultipleAttachments(
    files: File[],
    ticketId: number,
    onProgress?: (uploaded: number, total: number) => void,
): Promise<MultiUploadResult> {
    if (files.length > MAX_REPLY_ATTACHMENTS) {
        return { success: false, errors: [`Maximum ${MAX_REPLY_ATTACHMENTS} files allowed`] }
    }

    const urls: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
        const result = await uploadTicketAttachment(files[i], ticketId)

        if (result.success && result.url) {
            urls.push(result.url)
        } else if (result.error) {
            errors.push(`${files[i].name}: ${result.error}`)
        }

        onProgress?.(i + 1, files.length)
    }

    return {
        success: errors.length === 0,
        urls: urls.length > 0 ? urls : undefined,
        errors: errors.length > 0 ? errors : undefined,
    }
}