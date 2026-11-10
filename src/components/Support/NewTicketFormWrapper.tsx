"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Paperclip, Plus, X, Check, Loader2 } from "lucide-react"
import { createTicket } from "@/utils/api/tickets/insert"

const departments = ["Marketing", "Billing", "Support"]
const priorities = ["Low", "Medium", "High"]

interface Attachment {
  name: string
  url: string
  type: "image" | "file"
}

export default function NewTicketFormWrapper() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subject, setSubject] = useState("")
  const [department, setDepartment] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [ticketBody, setTicketBody] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  // Auto-fill contact from logged-in user
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { getStoredAuth } = await import("@/lib/api")
      const auth = getStoredAuth()
      if (auth?.name || auth?.username) {
        setCurrentUser({
          name: auth.name || auth.username || "User",
          email: auth.email || ""
        })
      }
    }
    loadUser()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const isImg = file.type.startsWith("image/")
      const reader = new FileReader()
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          url: reader.result as string,
          type: isImg ? "image" : "file"
        }])
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!subject.trim()) { setError("Subject is required!"); return }
    if (!ticketBody.trim()) { setError("Ticket body is required!"); return }
    if (!currentUser) { setError("Session not found. Please login again."); return }

    setError("")
    setIsSubmitting(true)

    try {
      const result = await createTicket({
        subject: subject.trim(),
        contact: currentUser.name,
        department: department || "Support",
        project: "My Qurani",
        priority: priority,
        body: ticketBody.trim(),
      })

      if (result.success && result.data) {
        const ticketId = result.data.id
        setShowSuccess(true)
        setTimeout(() => {
          router.push(`/support/tickets/${ticketId}`)
        }, 1500)
      } else {
        setError(result.error || "Failed to create ticket")
      }
    } catch (err) {
      setError("An error occurred while creating the ticket")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span className="font-medium">Ticket created successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/support/tickets')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Support Ticket</h1>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Describe your issue briefly..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          {/* Department & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                <option value="">Nothing selected</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket Body */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Ticket Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={ticketBody}
              onChange={(e) => setTicketBody(e.target.value)}
              placeholder="How can we help you?"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-y"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Attachments
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition text-sm font-medium"
              >
                <Paperclip className="w-4 h-4" />
                Choose Files
              </label>
              <span className="text-sm text-gray-400">
                {attachments.length > 0 ? `${attachments.length} file(s) selected` : "No file chosen"}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-auto p-2 bg-teal-100 dark:bg-teal-900/30 hover:bg-teal-200 dark:hover:bg-teal-800/40 text-teal-600 dark:text-teal-400 rounded-full transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
