"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/components/providers/i18n-provider"
import { LocationSelectors } from "./location-selectors"
import { CountryData } from "@/types/countries"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"

interface ProfileEditFormProps {
  profileData: {
    fullName: string
    nickname: string
    username: string
    email: string
    gender: number | null
    date_of_birth: string
    job: string
    address: string
    timezone: string
    bio: string
    language: number
    dateFormat: string
    timeFormat: string
  }
  displayTimezone: string
  usernameError: string
  isCheckingUsername: boolean
  handleInputChange: (field: string, value: string | number) => void
  // Location props
  countries: CountryData[]
  states: ProvinceData[]
  cities: CityData[]
  selectedCountry: { id: number; name: string; iso2?: string }
  currentCountry: { id: number; name: string; iso2?: string }
  selectedState: { id: number; name: string }
  currentState: { id: number; name: string }
  selectedCity: { id: number; name: string, timezone: string }
  currentCity: { id: number; name: string, timezone?: string }
  openCountry: boolean
  openState: boolean
  openCity: boolean
  setOpenCountry: (open: boolean) => void
  setOpenState: (open: boolean) => void
  setOpenCity: (open: boolean) => void
  setSelectedCountry: (country: { id: number; name: string; iso2?: string }) => void
  setSelectedState: (state: { id: number; name: string }) => void
  setSelectedCity: (city: { id: number; name: string, timezone: string }) => void
}

export function ProfileEditForm({
  profileData,
  displayTimezone,
  usernameError,
  isCheckingUsername,
  handleInputChange,
  countries,
  states,
  cities,
  selectedCountry,
  currentCountry,
  selectedState,
  currentState,
  selectedCity,
  currentCity,
  openCountry,
  openState,
  openCity,
  setOpenCountry,
  setOpenState,
  setOpenCity,
  setSelectedCountry,
  setSelectedState,
  setSelectedCity
}: ProfileEditFormProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* full name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('profile.auth.full_name')}</Label>
          <Input
            id="fullName"
            value={profileData.fullName}
            onChange={(e) => handleInputChange("fullName", e.target.value)}
            maxLength={25}
          />
        </div>

        {/* nickname */}
        <div className="space-y-2">
          <Label htmlFor="nickname">{t('profile.auth.nickname')}</Label>
          <Input
            id="nickname"
            placeholder={t('profile.auth.nickname_placeholder')}
            value={profileData.nickname}
            onChange={(e) => handleInputChange("nickname", e.target.value)}
            maxLength={25}
          />
        </div>

        {/* username */}
        <div className="space-y-2">
          <Label htmlFor="username">{t('profile.auth.username')}</Label>
          <div className="relative">
            <Input
              id="username"
              value={profileData.username}
              disabled
              placeholder="@username"
              className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-500"
            />
          </div>
        </div>

        {/* email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profileData.email}
            disabled
            className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-500"
          />
        </div>

        {/* address */}
        <div className="space-y-2">
          <Label htmlFor="address">{t('profile.auth.address', 'Alamat Lengkap')}</Label>
          <Input
            id="address"
            type="text"
            value={profileData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="Masukkan alamat..."
            maxLength={100}
          />
        </div>

        {/* job */}
        <div className="space-y-2">
          <Label htmlFor="job">{t('profile.auth.job')}</Label>
          <Input
            id="job"
            placeholder={t('profile.auth.job_placeholder')}
            value={profileData.job}
            onChange={(e) => handleInputChange("job", e.target.value)}
            maxLength={25}
          />
        </div>

        {/* gender */}
        <div className="space-y-2">
          <Label htmlFor="gender">{t('profile.auth.gender')}</Label>
          <Select
            value={
              profileData.gender === null || profileData.gender === 0 || profileData.gender === undefined
                ? undefined
                : profileData.gender.toString()
            }
            onValueChange={(value) => handleInputChange("gender", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('profile.auth.gender_placeholder')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1">{t('profile.gender.male')}</SelectItem>
              <SelectItem value="2">{t('profile.gender.female')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* date of birth */}
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">{t('profile.auth.birth')}</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={profileData.date_of_birth}
            onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
            maxLength={25}
          />
        </div>

        {/* Location Selectors */}
        <LocationSelectors
          isEditing={true}
          countries={countries}
          selectedCountry={selectedCountry}
          currentCountry={currentCountry}
          openCountry={openCountry}
          setOpenCountry={setOpenCountry}
          setSelectedCountry={setSelectedCountry}
          states={states}
          selectedState={selectedState}
          currentState={currentState}
          openState={openState}
          setOpenState={setOpenState}
          setSelectedState={setSelectedState}
          setSelectedCity={setSelectedCity}
          cities={cities}
          selectedCity={selectedCity}
          currentCity={currentCity}
          openCity={openCity}
          setOpenCity={setOpenCity}
          timezone={displayTimezone}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* language */}
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={profileData.language?.toString()}
            onValueChange={(value) => handleInputChange("language", Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1">Indonesia</SelectItem>
              <SelectItem value="2">English</SelectItem>
              <SelectItem value="3">Arabic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* date format */}
        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Input
            id="dateFormat"
            type="text"
            value={profileData.dateFormat}
            onChange={(e) => handleInputChange("dateFormat", e.target.value)}
            placeholder="e.g. DD/MM/YYYY"
          />
        </div>

        {/* time format */}
        <div className="space-y-2">
          <Label htmlFor="timeFormat">Time Format</Label>
          <Input
            id="timeFormat"
            type="text"
            value={profileData.timeFormat}
            onChange={(e) => handleInputChange("timeFormat", e.target.value)}
            placeholder="e.g. HH:mm:ss"
          />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">{t('profile.auth.bio')}</Label>
        <Textarea
          id="bio"
          className="h-40 sm:h-20"
          value={profileData.bio}
          onChange={(e) => handleInputChange("bio", e.target.value)}
          maxLength={400}
        />
        <p className="text-sm text-gray-500">
          {profileData.bio?.length || 0}/400 {t('profile.auth.characters')}
        </p>
      </div>
    </div>
  )
}
