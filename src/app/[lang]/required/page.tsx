import RequiredForm from "@/components/required/form";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function Page() {
    return (
        <I18nProvider namespaces={["common", "required"]}>
            <RequiredForm />
        </I18nProvider>
    )
}
