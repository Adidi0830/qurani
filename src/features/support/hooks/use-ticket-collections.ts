"use client"

import { useCallback, useEffect, useState } from "react"

import type { Note, Reminder, Task } from "../model/types"

/** Kunci localStorage per-ticket. Semua key lama dipertahankan agar data users tidak hilang. */
export const ticketKeys = {
    notes: (id: string) => `ticket_${id}_notes`,
    reminders: (id: string) => `ticket_${id}_reminders`,
    tasks: (id: string) => `ticket_${id}_tasks`,
    tags: (id: string) => `ticket_${id}_tags`,
    assignee: (id: string) => `ticket_${id}_assignee`,
    replies: (id: string) => `ticket_replies_${id}`,
    cache: (id: string) => `ticket_cache_${id}`,
}

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        const parsed = JSON.parse(raw)
        return (parsed ?? fallback) as T
    } catch {
        return fallback
    }
}

function writeJson(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
        console.warn("Failed to persist", key, error)
    }
}

/**
 * Koleksi entity lokal (catatan internal, reminder, task, tag) yang disimpan
 * di localStorage. API Qurani belum punya endpoint untuk entity ini.
 */
export function useTicketCollection<T>(key: string) {
    const [items, setItems] = useState<T[]>(() => readJson<T[]>(key, []))

    // Re-hydrate saat pindah tiket.
    useEffect(() => {
        setItems(readJson<T[]>(key, []))
    }, [key])

    const persist = useCallback(
        (next: T[], broadcast?: string) => {
            setItems(next)
            writeJson(key, next)
            if (broadcast) window.dispatchEvent(new Event(broadcast))
        },
        [key],
    )

    return { items, setItems: persist, replace: setItems }
}

/** Catatan internal — read-only di sisi server, jadi murni lokal. */
export function useTicketNotes(ticketId: string) {
    const { items, setItems } = useTicketCollection<Note>(ticketKeys.notes(ticketId))

    const add = useCallback(
        (note: Note) => setItems([...items, note]),
        [items, setItems],
    )

    return { notes: items, addNote: add }
}

export function useTicketReminders(ticketId: string) {
    // Event ini/badge di halaman lain rely pada broadcast ini.
    const { items, setItems } = useTicketCollection<Reminder>(ticketKeys.reminders(ticketId))

    return {
        reminders: items,
        addReminder: useCallback(
            (reminder: Reminder) => setItems([...items, reminder], "ticket-reminder-updated"),
            [items, setItems],
        ),
        removeReminder: useCallback(
            (id: string) => setItems(items.filter((r) => r.id !== id), "ticket-reminder-updated"),
            [items, setItems],
        ),
    }
}

export function useTicketTasks(ticketId: string) {
    const { items, setItems } = useTicketCollection<Task>(ticketKeys.tasks(ticketId))

    return {
        tasks: items,
        addTask: useCallback((task: Task) => setItems([...items, task]), [items, setItems]),
        setStatus: useCallback(
            (id: string, status: Task["status"]) =>
                setItems(items.map((t) => (t.id === id ? { ...t, status } : t))),
            [items, setItems],
        ),
        removeTask: useCallback(
            (id: string) => setItems(items.filter((t) => t.id !== id)),
            [items, setItems],
        ),
    }
}

/** Tag tiket — prefix "#" otomatis. */
export function useTicketTags(ticketId: string) {
    const { items, setItems } = useTicketCollection<string>(ticketKeys.tags(ticketId))

    const addFromInput = useCallback(
        (raw: string) => {
            const trimmed = raw.trim()
            if (!trimmed) return
            const tag = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
            if (!items.includes(tag)) setItems([...items, tag])
        },
        [items, setItems],
    )

    return {
        tags: items,
        addTag: addFromInput,
        removeLast: useCallback(() => setItems(items.slice(0, -1)), [items, setItems]),
        removeTag: useCallback((tag: string) => setItems(items.filter((t) => t !== tag)), [items, setItems]),
    }
}