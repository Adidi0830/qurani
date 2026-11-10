
import CategoryPage from "@/components/admin/kategori";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function Page() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={['common', 'admin-kategori']}>
                <CategoryPage />
            </I18nProvider>
        </DashboardLayout>
    )
}