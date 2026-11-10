"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SkeletonDetailPage } from "@/components/ui/skeletons";
import { setoranApi } from "@/lib/api";
import { ArrowLeft, Loader2, User, Calendar, CheckCircle, AlertTriangle, BookOpen } from "lucide-react";
import { toast } from "sonner";

// Format date helper - Indonesian format (DD MMM YYYY, HH:mm)
function formatDate(dateStr: string | undefined, format: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    
    if (format.includes("HH:mm")) {
        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    }
    return `${day} ${month} ${year}`;
}

// Helper to get token from localStorage
const getClientToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('myqurani_auth');
        if (!stored) return null;
        const auth = JSON.parse(stored);
        return auth?.accessToken || null;
    } catch {
        return null;
    }
}

export default function SetoranDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [detail, setDetail] = useState<any>(null);

    const recapId = params?.id as string;

    useEffect(() => {
        const token = getClientToken();
        if (!token || !recapId) {
            setIsLoading(false);
            return;
        }

        const fetchDetail = async () => {
            try {
                setIsLoading(true);
                const res = await setoranApi.getSessionById(recapId, token);
                if (res.success && res.data) {
                    setDetail(res.data);
                } else {
                    toast.error(res.message || "Gagal memuat detail setoran");
                }
            } catch (error) {
                console.error("Error fetching detail:", error);
                toast.error("Terjadi kesalahan saat memuat detail");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetail();
    }, [recapId]);

    const getScoreBadge = (score: number) => {
        if (score >= 90) return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-medium">Sangat Baik ({score})</span>;
        if (score >= 80) return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">Baik ({score})</span>;
        if (score >= 70) return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">Cukup ({score})</span>;
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">Kurang ({score})</span>;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center text-lg font-bold text-slate-800 dark:text-white hover:text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-3" />
                            Recitation
                        </button>
                        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                            Show Mushaf
                        </button>
                    </div>

                    {isLoading ? (
                        <SkeletonDetailPage showAvatar infoRows={4} />
                    ) : detail ? (
                        <div className="space-y-6">
                            {/* Reciter Card */}
                            <div className="bg-blue-100/50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/50">
                                <div className="flex items-center mb-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-400">Reciter</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center space-x-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                        {detail.reciter?.avatar ? (
                                            <img src={detail.reciter.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold">
                                                {(detail.userName || "U")[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white text-lg">{detail.userName || "Tanpa Nama"}</p>
                                        <p className="text-slate-500 text-sm">{detail.userLocation || "@user - Location"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recitation Card */}
                            <div className="bg-emerald-200/50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-300 dark:border-emerald-800/50">
                                <div className="flex items-center mb-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-600 mr-2"></div>
                                    <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">Recitation</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 px-4 flex items-center shadow-sm text-sm">
                                        <span className="text-emerald-700/70 dark:text-emerald-400/70 mr-2">Start Surah:</span>
                                        <span className="font-semibold text-emerald-900 dark:text-emerald-100">{detail.surahName || `Surah ${detail.surahNumber}`}</span>
                                    </div>
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 px-4 flex items-center shadow-sm text-sm">
                                        <span className="text-emerald-700/70 dark:text-emerald-400/70 mr-2">End Surah:</span>
                                        <span className="font-semibold text-emerald-900 dark:text-emerald-100">{detail.surahName || `Surah ${detail.surahNumber}`}</span>
                                    </div>
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 px-4 flex items-center shadow-sm text-sm">
                                        <span className="text-emerald-700/70 dark:text-emerald-400/70 mr-2">Start Verse:</span>
                                        <span className="font-semibold text-emerald-900 dark:text-emerald-100">{detail.startAyat || "-"}</span>
                                    </div>
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 px-4 flex items-center shadow-sm text-sm">
                                        <span className="text-emerald-700/70 dark:text-emerald-400/70 mr-2">End Verse:</span>
                                        <span className="font-semibold text-emerald-900 dark:text-emerald-100">{detail.endAyat || "-"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Assessment Card */}
                            <div className="bg-fuchsia-200/50 dark:bg-fuchsia-900/20 rounded-2xl p-6 border border-fuchsia-300 dark:border-fuchsia-800/50">
                                <div className="flex items-center mb-4">
                                    <div className="w-2 h-2 rounded-full bg-fuchsia-500 mr-2"></div>
                                    <h3 className="font-semibold text-fuchsia-800 dark:text-fuchsia-400">Assessment</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 flex items-center shadow-sm space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-fuchsia-500 flex items-center justify-center flex-shrink-0 text-white">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-fuchsia-700/70 dark:text-fuchsia-400/70 mb-0.5">Conclusion</p>
                                            <p className="font-bold text-fuchsia-900 dark:text-fuchsia-100">{detail.conclusion || "Very Good"}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 flex items-center shadow-sm space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-fuchsia-700/70 dark:text-fuchsia-400/70 mb-0.5">Notes</p>
                                            <p className="font-bold text-fuchsia-900 dark:text-fuchsia-100">{detail.notes || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div className="mt-8">
                                <div className="flex items-center mb-4">
                                    <AlertTriangle className="w-4 h-4 mr-2 text-slate-500" />
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300">Summary ({detail.mistakes?.length || 0})</h3>
                                </div>
                                
                                <div className="rounded-xl overflow-hidden border border-emerald-600 shadow-sm">
                                    {/* Header */}
                                    <div className="bg-emerald-600 p-3 flex space-x-2">
                                        <span className="px-3 py-1 bg-white text-emerald-700 rounded-full text-xs font-bold">Juz {detail.juz || 1}</span>
                                        <span className="px-3 py-1 bg-white text-emerald-700 rounded-full text-xs font-bold">Page {detail.page || 1}</span>
                                        <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-xs font-bold">{detail.mistakes?.length || 0} Words</span>
                                    </div>
                                    
                                    {/* Body */}
                                    <div className="bg-white dark:bg-slate-900 p-4">
                                        {detail.mistakes && detail.mistakes.length > 0 ? (
                                            <div>
                                                <div className="flex items-center text-rose-500 font-bold mb-3">
                                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                                    Word / Verse Errors
                                                </div>
                                                <div className="space-y-2">
                                                    {detail.mistakes.map((mistake: any, index: number) => (
                                                        <div key={index} className="flex items-center p-3 rounded-lg border border-rose-100 bg-rose-50/50 dark:bg-rose-900/10 dark:border-rose-900/30">
                                                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                                                                {mistake.ayahNumber || mistake.verseNumber || index + 1}
                                                            </div>
                                                            <div className="flex-1 flex items-center">
                                                                <span className="px-2 py-0.5 bg-orange-500 text-white rounded text-xs font-bold mr-3">
                                                                    {mistake.type || mistake.error_type || "Error"}
                                                                </span>
                                                                <span className="text-slate-600 dark:text-slate-400 text-sm">
                                                                    {mistake.errorCategory || "Mistake"}
                                                                </span>
                                                            </div>
                                                            <div className="font-arabic text-xl text-emerald-600" style={{ color: mistake.color }}>
                                                                {mistake.word || mistake.text_uthman}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-slate-500">
                                                No errors recorded for this recitation.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-slate-500">Data tidak ditemukan.</p>
                        </div>
                    )}
                </div>
    );
}
