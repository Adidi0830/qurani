"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen,
    ExternalLink, Award, Star, Clock, User, CreditCard
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type BookingStatus = "active" | "completed" | "cancelled" | "pending"

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<BookingStatus, { label: string; badge: string; dot: string }> = {
    active: { label: "Lunas", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
    completed: { label: "Lunas", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
    cancelled: { label: "Pending", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
    pending: { label: "Pending", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
}

// ── Helper ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
    })
}

function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_MEMBERS: Record<string, any> = {
    "2011": {
        id: 2011, name: "Muhamad Fauzan", username: "ahmadfauzi",
        email: "ahmad.fauzi@gmail.com", phone: "+62 812-3456-7890",
        location: "Jakarta, Indonesia", joinDate: "2024-06-15",
        totalSpend: 1175000, completedSessions: 18, activeSessions: 8,
        bookings: [
            { id: "B001", packageName: "5x Pertemuan", trainerName: "Ustadz Iwan", trainerAvatar: null, bookingDate: "2025-12-20", completedSessions: 5, totalSessions: 5, status: "completed" as BookingStatus, payment: 387500 },
            { id: "B002", packageName: "8x Pertemuan", trainerName: "Indi Fitriani", trainerAvatar: null, bookingDate: "2026-03-01", completedSessions: 0, totalSessions: 8, status: "pending" as BookingStatus, payment: 0 },
        ]
    },
    "2012": {
        id: 2012, name: "Aisyah Putri", username: "aisyah.putri",
        email: "aisyah.putri@gmail.com", phone: "+62 857-1100-9988",
        location: "Semarang", joinDate: "2025-09-01",
        totalSpend: 387500, completedSessions: 5, activeSessions: 0,
        bookings: [
            { id: "B003", packageName: "5x Pertemuan", trainerName: "Ustadz Iwan", trainerAvatar: null, bookingDate: "2025-12-20", completedSessions: 5, totalSessions: 5, status: "completed" as BookingStatus, payment: 387500 },
        ]
    },
}

// default member jika id tidak ditemukan
function getMember(id: string) {
    return MOCK_MEMBERS[id] ?? {
        id: parseInt(id), name: "Member #" + id, username: "member_" + id,
        email: "-", phone: "-", location: "-", joinDate: new Date().toISOString(),
        totalSpend: 0, completedSessions: 0, activeSessions: 0, bookings: [],
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
function MemberDetailContent({ id }: { id: string }) {
    const member = getMember(id)

    // Cover — selalu hijau emerald
    const coverGradient = "from-emerald-500 via-emerald-400 to-teal-400"

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* ── Top bar: back button ── */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
                <div className="flex items-center gap-4">
                    <Link href="/billing/member-subscription"
                        className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all shadow-sm">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <span className="text-sm font-semibold text-gray-700 dark:text-white">Informasi Member</span>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="max-w-[1400px] mx-auto px-4 py-5">
                <div className="flex gap-5 items-start flex-wrap lg:flex-nowrap">

                    {/* ══ LEFT — Hero + Riwayat ══ */}
                    <div className="flex-1 min-w-0 space-y-4">

                        {/* Hero Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            {/* Cover */}
                            <div className={`relative w-full h-44 bg-gradient-to-r ${coverGradient}`}>
                                <div className="absolute inset-0 opacity-20"
                                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
                                />
                                {/* Avatar */}
                                <div className="absolute -bottom-8 left-6 z-10">
                                    <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-xl">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=10b981&color=fff&size=200&bold=true`}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Profile info */}
                            <div className="pt-12 px-6 pb-5">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{member.name}</h2>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-4">@{member.username}</p>

                                {/* Info row */}
                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                                        {member.email}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                                        {member.phone}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                                        {member.location}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                        Bergabung {new Date(member.joinDate).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Riwayat Pesanan */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                <BookOpen className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Riwayat Pesanan</span>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {member.bookings.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-8">Belum ada pesanan</p>
                                ) : member.bookings.map((b: any) => {
                                    const st = STATUS_CFG[b.status as BookingStatus]
                                    const pct = Math.round((b.completedSessions / b.totalSessions) * 100)
                                    return (
                                        <div key={b.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-100 flex-shrink-0">
                                                <img
                                                    src={b.trainerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.trainerName)}&background=10b981&color=fff`}
                                                    alt={b.trainerName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <p className="text-sm font-bold text-gray-950 dark:text-white truncate">{b.packageName}</p>
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${st?.badge}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${st?.dot}`} />
                                                        {st?.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">dengan {b.trainerName} · {formatDate(b.bookingDate)}</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-gray-400 shrink-0">
                                                        {b.completedSessions}/{b.totalSessions} sesi
                                                    </span>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/billing/pesanan/${b.id}`}
                                                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold shrink-0 px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:hover:bg-emerald-900/30 transition-colors"
                                            >
                                                Detail <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>{/* end LEFT */}

                    {/* ══ RIGHT — Stats sidebar ══ */}
                    <div className="w-full lg:w-72 shrink-0 space-y-4">

                        {/* Statistik */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-2xl p-5 space-y-4 shadow-sm">
                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Statistik Member</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: CreditCard, label: "Total Bayar", value: formatRupiah(member.totalSpend), color: "text-emerald-600" },
                                    { icon: Star, label: "Sesi Selesai", value: member.completedSessions + " sesi", color: "text-blue-600" },
                                    { icon: Clock, label: "Sesi Aktif", value: member.activeSessions + " sesi", color: "text-amber-600" },
                                    { icon: Award, label: "Total Pesanan", value: member.bookings.length + " paket", color: "text-purple-600" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl p-3 flex flex-col gap-1">
                                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                        <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info Akun */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-2xl p-5 space-y-3 shadow-sm">
                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Info Akun</p>
                            {[
                                { label: "Member ID", value: `#${member.id}` },
                                { label: "Username", value: `@${member.username}` },
                                { label: "Status", value: "Aktif" },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{row.label}</span>
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{row.value}</span>
                                </div>
                            ))}
                        </div>

                    </div>{/* end RIGHT */}

                </div>
            </div>
        </div>
    )
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return (
                <MemberDetailContent id={id} />
    )
}
