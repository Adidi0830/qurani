"use client"

import { Mail, Home, BriefcaseBusiness, Calendar, MapPin, VenusAndMars } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

interface ProfileInfoProps {
  profileData: {
    fullName: string
    nickname: string
    username: string
    email: string
    gender: number | null
    address: string
    job: string
    date_of_birth: string
    timezone: string
    bio: string
  }
  currentState: { name: string }
  currentCity: { name: string }
  currentCountry: { name: string }
  formatDate: (date: string) => string
}

export function ProfileInfo({
  profileData,
  currentState,
  currentCity,
  currentCountry,
  formatDate
}: ProfileInfoProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-5">
      {/* Mobile View */}
      <div className="space-y-2 sm:hidden">
        <div>
          {profileData.email && (
            <div className="flex items-center gap-2">
              <Mail className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {profileData.email}
              </span>
            </div>
          )}
          {profileData.address && (
            <div className="flex items-center gap-2">
              <Home className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {profileData.address}
              </span>
            </div>
          )}
          {profileData.gender !== null && (
            <div className="flex items-center gap-2">
              <VenusAndMars className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {profileData.gender === 1 ? t('profile.gender.male') : t('profile.gender.female')}
              </span>
            </div>
          )}
          {profileData.job && (
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {profileData.job}
              </span>
            </div>
          )}
          {profileData.date_of_birth && (
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {formatDate(profileData.date_of_birth)}
              </span>
            </div>
          )}
          {(currentCity.name && currentState.name) && (
            <div className="flex items-start gap-2 mt-0.5">
              <MapPin className="text-gray-700 dark:text-gray-300 w-4 -mt-[2px]" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {currentCountry.name}, {currentState.name} - {currentCity.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block">
        <div className="flex gap-3">
          {profileData.email && (
            <div className="flex items-center gap-2">
              <Mail className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {profileData.email}
              </span>
            </div>
          )}
          {(profileData.email && profileData.address) && (
            <span className="text-gray-700 dark:text-gray-300 block">|</span>
          )}
          {profileData.address && (
            <div className="flex items-center gap-2">
              <Home className="text-gray-700 dark:text-gray-300 w-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
                {profileData.address}
              </span>
            </div>
          )}
        </div>
        {profileData.gender !== null && (
          <div className="flex items-center gap-2">
            <VenusAndMars className="text-gray-700 dark:text-gray-300 w-4" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
              {profileData.gender === 1 ? t('profile.gender.male') : t('profile.gender.female')}
            </span>
          </div>
        )}
        {profileData.job && (
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="text-gray-700 dark:text-gray-300 w-4" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
              {profileData.job}
            </span>
          </div>
        )}
        {profileData.date_of_birth && (
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-700 dark:text-gray-300 w-4" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
              {formatDate(profileData.date_of_birth)}
            </span>
          </div>
        )}
        {(currentCity.name && currentState.name) && (
          <div className="flex items-start gap-2 mt-0.5">
            <MapPin className="text-gray-700 dark:text-gray-300 w-4 -mt-[2px]" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-thin">
              {currentCountry.name}, {currentState.name} - {currentCity.name}
            </span>
          </div>
        )}
      </div>

      {profileData.bio && (
        <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
          {profileData.bio}
        </p>
      )}
    </div>
  )
}

