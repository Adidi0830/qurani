"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Moon, Sun, Globe } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { LanguageSwitcher } from "@/components/ui/language-switcher"

interface SettingsSectionProps {
  theme: string | undefined
  setTheme: (theme: string) => void
}

export function SettingsSection({ theme, setTheme }: SettingsSectionProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xl bg-none">
        <Settings className="h-5 w-5" />
        {t('profile.settings.title', 'Settings')}
      </div>
      <div className="flex flex-col gap-3">
        {/* Theme Setting */}
        <div className="group py-2 px-4 mb-1 rounded-2xl bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="md:space-y-2">
              <Label className="text-lg font-semibold flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                {t('profile.settings.theme_label', 'Theme')}
              </Label>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-inner">
              <Sun className="h-5 w-5 text-gray-500" />
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                className="data-[state=checked]:bg-slate-700 data-[state=unchecked]:bg-gray-200"
              />
              <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
          </div>
        </div>

        {/* Language Setting */}
        <div className="group py-2 px-4 rounded-2xl bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-600/30 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="md:space-y-2">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {t('profile.settings.language_label', 'Language')}
              </Label>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  )
}

