"use client"

import { createClient } from "@/utils/supabase/client"

const BUCKET_NAME = "ticket-attachments"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

interface UploadResult {
    success: boolean
    url?: string
    error?: string
}

/**
 * Compress image if it's larger than 1MB
 * Uses canvas to reduce quality and dimensions
 */
async function compressImage(file: File): Promise<File> {
    // If file is under 1MB, no compression needed
    if (file.size <= 1024 * 1024) {
        return file
    }

    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement("canvas")

                // Calculate new dimensions (max 1920px width/height)
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

                // Convert to webp for better compression
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                                type: "image/webp",
                            })
                            console.log(`📦 Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
                            resolve(compressedFile)
                        } else {
                            resolve(file)
                        }
                    },
                    "image/webp",
                    0.85 // 85% quality
                )
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    })
}

import { ticketsApi } from "@/lib/api"

/**
 * Upload a single image to ticket-attachments bucket via Qurani API
 */
export async function uploadTicketAttachment(
    file: File,
    ticketId: number
): Promise<UploadResult> {
    try {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return {
                success: false,
                error: `Invalid file type: ${file.type}. Allowed: jpg, png, gif, webp`,
            }
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return {
                success: false,
                error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 10MB`,
            }
        }

        // Compress if needed
        const processedFile = await compressImage(file)

        // Upload using MyQurani API
        const response = await ticketsApi.uploadAttachment(ticketId, processedFile)
        
        // Asumsi API Qurani mengembalikan { success: true, data: { url: "..." } } atau similar
        // Jika response-nya berupa string url saja atau JSON yang berbeda, sesuaikan.
        // Disini kita asumsi response.data.url atau response.url
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

/** Upload multiple files (max 2)*/
export async function uploadMultipleAttachments(
    files: File[],
    ticketId: number,
    onProgress?: (uploaded: number, total: number) => void
): Promise<{ success: boolean; urls?: string[]; errors?: string[] }> {
    const maxFiles = 2

    if (files.length > maxFiles) {
        return { success: false, errors: [`Maximum ${maxFiles} files allowed`] }
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
