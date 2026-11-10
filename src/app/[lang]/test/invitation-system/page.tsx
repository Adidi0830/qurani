import { TestInvitationSystem } from "@/components/demo/test-invitation-system"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function TestInvitationPage() {
  return (
    <I18nProvider namespaces={["common", "test-invitation"]}>
      <div className="container mx-auto py-8">
        <TestInvitationSystem />
      </div>
    </I18nProvider>
  )
}
