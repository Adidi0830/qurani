import { ForgotPasswordForm } from "@/components/ui/auth-form/forgot-password-form"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Lupa Password - Qurani",
    description: "Lupa password akun Qurani"
};

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-svh bg-gray-50 dark:bg-slate-950">
            <div className="flex flex-col p-6 md:p-10">
                <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-100px)]">
                    <div className="w-full">
                        <I18nProvider namespaces={["common"]}>
                            <ForgotPasswordForm />
                        </I18nProvider>
                    </div>
                </div>
            </div>
        </div>
    )
}


