"use client"

import QuraniSetting from '../_components/qurani-setting'
import { useI18n } from '@/components/providers/i18n-provider'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SkeletonFormPage } from '@/components/ui/skeletons'

export default function QuraniSettingProfilePage() {
  const { t } = useI18n()
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <Suspense fallback={<SkeletonFormPage fields={4} />}>
      <div className='space-y-4 w-full md:max-w-7xl mx-auto'>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-all duration-300"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("profile.qurani.title", "Qurani Settings")}
          </h1>
        </div>
        <Card className="backdrop-blur-sm bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
          <CardContent>
              <QuraniSetting />
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}