"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { I18nProvider, useI18n } from '@/components/providers/i18n-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function BlockedPageContent() {
  const { t } = useI18n()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{
    full_name: string | null
    email: string | null
  } | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  useEffect(() => {
    async function checkUserStatus() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email, is_blocked')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          setUserInfo({
            full_name: userProfile.full_name,
            email: userProfile.email
          })

          // If user is no longer blocked, redirect to dashboard
          if (!userProfile.is_blocked) {
            router.push('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserStatus()
  }, [router])

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('autoNotificationDismissed')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('is_blocked')
        .eq('id', user.id)
        .single()

      if (userProfile && !userProfile.is_blocked) {
        router.push('/setoran')
      } else {
        // Show temporary message that status hasn't changed
        setTimeout(() => {
          setIsCheckingStatus(false)
        }, 1000)
      }
    } catch (error) {
      console.error('Error checking status:', error)
      setIsCheckingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4 animate-pulse">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-5 w-40 mx-auto" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Mobile: Single Column */}
        <div className="lg:hidden">
          <Card className="w-full max-w-md mx-auto shadow-xl border-red-200 dark:border-red-800">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-red-800 dark:text-red-200">
                  {t('blocked.title', 'Account Blocked')}
                </CardTitle>
                <CardDescription className="mt-1 text-red-600 dark:text-red-400 text-sm">
                  {t('blocked.subtitle', 'Your account has been temporarily suspended')}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {userInfo && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                  <div className="text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {t('blocked.account_info', 'Account Information')}:
                    </span>
                  </div>
                  {userInfo.full_name && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{t('blocked.name', 'Name')}:</span> {userInfo.full_name}
                    </div>
                  )}
                  {userInfo.email && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{t('blocked.email', 'Email')}:</span> {userInfo.email}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                >
                  {isCheckingStatus ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      {t('blocked.checking_status', 'Checking Status...')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2" />
                      {t('blocked.check_status', 'Check Account Status')}
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 text-sm py-2"
                >
                  <LogOut className="w-3 h-3 mr-2" />
                  {t('blocked.sign_out', 'Sign Out')}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('blocked.support_contact', 'Need help? Contact us at')}{' '}
                  <a
                    href="mailto:support@qurani.app"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@qurani.app
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Two Columns */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
          {/* Left Column - Main Info */}
          <Card className="shadow-xl border-red-200 dark:border-red-800">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {t('blocked.title', 'Account Blocked')}
                </CardTitle>
                <CardDescription className="mt-2 text-red-600 dark:text-red-400">
                  {t('blocked.subtitle', 'Your account has been temporarily suspended')}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {userInfo && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {t('blocked.account_info', 'Account Information')}:
                    </span>
                  </div>
                  {userInfo.full_name && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{t('blocked.name', 'Name')}:</span> {userInfo.full_name}
                    </div>
                  )}
                  {userInfo.email && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{t('blocked.email', 'Email')}:</span> {userInfo.email}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCheckingStatus ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('blocked.checking_status', 'Checking Status...')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('blocked.check_status', 'Check Account Status')}
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('blocked.sign_out', 'Sign Out')}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('blocked.support_contact', 'Need help? Contact us at')}{' '}
                  <a
                    href="mailto:support@qurani.app"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@qurani.app
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Information Cards */}
          <div className="space-y-4">
            <Card className="shadow-lg border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  {t('blocked.reason_title', 'Why was my account blocked?')}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {t('blocked.reason_text', 'Your account may have been blocked due to violations of our terms of service or community guidelines. This could include inappropriate behavior, spam, or other policy violations.')}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  {t('blocked.what_to_do_title', 'What should I do?')}
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• {t('blocked.contact_support', 'Contact our support team for assistance')}</li>
                  <li>• {t('blocked.review_terms', 'Review our terms of service and community guidelines')}</li>
                  <li>• {t('blocked.wait_review', 'Wait for our team to review your account status')}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BlockedPage() {
  return (
    <I18nProvider namespaces={['common', 'blocked']}>
      <BlockedPageContent />
    </I18nProvider>
  )
}
