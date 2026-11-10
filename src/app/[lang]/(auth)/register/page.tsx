import { RegisterForm } from "@/components/ui/auth-form/register-form"
import { Suspense } from "react"
import { I18nProvider } from "@/components/providers/i18n-provider"

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Daftar - Qurani",
    description: "Daftar akun Qurani - Islamic Social Media"
};

export default function RegisterPage() {
    return (
        <div className="min-h-svh bg-gray-50 dark:bg-slate-950">
            <div className="flex flex-col p-6 md:p-10">
                <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-100px)]">
                    <div className="w-full">
                        <I18nProvider namespaces={["common"]}>
                            <Suspense>
                                <RegisterForm />
                            </Suspense>
                        </I18nProvider>
                    </div>
                </div>
            </div>
        </div>
    )
}