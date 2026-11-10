import { I18nProvider } from "@/components/providers/i18n-provider"

interface JoinGroupLayoutProps {
    children: React.ReactNode
}

export default function JoinGroupLayout({ children }: JoinGroupLayoutProps) {
    return (
        <I18nProvider namespaces={["join grup"]}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
                {children}
            </div>
        </I18nProvider>
    )
}
