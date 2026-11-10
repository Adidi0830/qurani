"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Banknote, Construction } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

export default function CurrenciesPage() {
    const { t } = useI18n()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="text-center max-w-lg mx-auto">
                <div className="relative mb-8">
                    <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center shadow-lg">
                        <Banknote className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Construction className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>

                <h1 className="text-7xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                    404
                </h1>

                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {t("masterdata.currencies.coming_soon", "Currencies - Coming Soon")}
                </h2>

                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                    {t("masterdata.currencies.description", "Halaman CRUD untuk data Currencies sedang dalam pengembangan.")}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/master/dashboard">
                        <Button
                            variant="default"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t("common.back", "Kembali")}
                        </Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                            {t("common.to_dashboard", "Ke Dashboard")}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
