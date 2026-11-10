import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { I18nProvider } from "@/components/providers/i18n-provider";
import { PresenceProvider } from "@/components/providers/presence-provider";
import DynamicTitle from "@/components/dinamicTitle";
import { UnifiedNotificationToast } from "@/components/UnifiedNotificationToast";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { LangSetter } from "@/components/providers/lang-setter";

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  return (
    <>
      <LangSetter lang={lang} />
      <Toaster position="top-right" richColors />
      <DevServiceWorkerCleanup />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
      >
        <I18nProvider namespaces={["common", "navigation", "search", "profile", "support", "billing", "statistik", "dashboard", "notifikasi", "hasil-setoran", "kyc_member", "admin-dashboard", "admin-users", "admin-kategori", "masterdata", "teacher-detail"]}>
          <DynamicTitle />
          <SWRProvider>
            <AuthProvider>
              <UnifiedNotificationToast />
              <PresenceProvider>
                {children}
              </PresenceProvider>
            </AuthProvider>
          </SWRProvider>
        </I18nProvider>
        <SpeedInsights />
      </ThemeProvider>
    </>
  );
}

