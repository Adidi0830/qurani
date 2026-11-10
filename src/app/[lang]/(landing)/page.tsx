import { LandingPage } from "@/components/landing"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function Home() {
  return (
    <I18nProvider namespaces={["landing"]}>
      <LandingPage />
    </I18nProvider>
  )
}
