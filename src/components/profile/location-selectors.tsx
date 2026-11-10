"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { CountryData } from "@/types/countries"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"
import { Input } from "../ui/input"

interface LocationSelectorsProps {
  isEditing: boolean
  countries: CountryData[]
  selectedCountry: { id: number; name: string; iso2?: string }
  currentCountry: { id: number; name: string; iso2?: string }
  openCountry: boolean
  setOpenCountry: (open: boolean) => void
  setSelectedCountry: (country: { id: number; name: string; iso2?: string }) => void
  states: ProvinceData[]
  selectedState: { id: number; name: string }
  currentState: { id: number; name: string }
  openState: boolean
  setOpenState: (open: boolean) => void
  setSelectedState: (state: { id: number; name: string }) => void
  setSelectedCity: (city: { id: number; name: string, timezone: string }) => void
  cities: CityData[]
  selectedCity: { id: number; name: string, timezone: string }
  currentCity: { id: number; name: string, timezone?: string }
  openCity: boolean
  setOpenCity: (open: boolean) => void
  timezone: string
}

export function LocationSelectors({
  isEditing,
  countries,
  selectedCountry,
  currentCountry,
  openCountry,
  setOpenCountry,
  setSelectedCountry,
  states,
  selectedState,
  currentState,
  openState,
  setOpenState,
  setSelectedState,
  setSelectedCity,
  cities,
  selectedCity,
  currentCity,
  openCity,
  setOpenCity,
  timezone
}: LocationSelectorsProps) {
  const { t } = useI18n()
  const isCountryTouched = selectedCountry.id !== 0
  const isStateTouched = selectedState.id !== 0
  const stateLabel = selectedState.name || (!isCountryTouched ? currentState.name : "")
  const cityLabel = selectedCity.name || (!isCountryTouched && !isStateTouched ? currentCity.name : "")
  const cityDisabled = !isEditing || (selectedState.id === 0 && (isCountryTouched || currentState.id === 0))

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="timezone">{t('profile.timezone')}</Label>
        <Input
          id="timezone"
          type="text"
          value={timezone}
          placeholder="-"
          disabled
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">{t('profile.country', 'Country')}</Label>
        <Popover open={openCountry} onOpenChange={setOpenCountry}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between text-left"
              disabled={!isEditing}
            >
              <span className="truncate">
                {selectedCountry.name || currentCountry.name || t('profile.select_country', 'Select Country')}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-full">
            <Command>
              <CommandInput placeholder={t('common.search', 'Search')} />
              <CommandList>
                <CommandGroup>
                  {(countries ?? []).map((country: CountryData) => (
                    <CommandItem
                      key={country.id}
                      className="w-full flex justify-between cursor-pointer"
                      onSelect={() => {
                        setSelectedCountry({
                          id: country.id,
                          name: country.name,
                          iso2: country.iso2 || ""
                        })
                        setOpenCountry(false)
                      }}
                    >
                      {country.name}
                      <Check className={`w-4 h-4 ${selectedCountry.id !== 0 && selectedCountry.id === country.id
                        ? "opacity-100"
                        : selectedCountry.id === 0 && currentCountry.id === country.id
                          ? "opacity-100"
                          : "opacity-0"
                        }`} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">{t('profile.province')}</Label>
        <Popover open={openState} onOpenChange={setOpenState}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between text-left"
              disabled={!isEditing}
            >
              <span className="truncate">{stateLabel || t('profile.select_state', 'Select State')}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-full">
            <Command>
              <CommandInput placeholder={t('common.search', 'Search')} />
              <CommandList>
                <CommandGroup>
                  {(states ?? []).map((state) => (
                    <CommandItem
                      key={state.id}
                      className="w-full flex justify-between cursor-pointer"
                      onSelect={() => {
                        setSelectedState({
                          id: state.id,
                          name: state.name
                        })
                        setOpenState(false)
                      }}
                    >
                      {state.name}
                      <Check className={`w-4 h-4 ${selectedState.id !== 0 && selectedState.id === state.id
                        ? "opacity-100"
                        : selectedState.id === 0 && currentState.id === state.id
                          ? "opacity-100"
                          : "opacity-0"
                        }`} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">{t('profile.city', 'City')}</Label>
        <Popover open={openCity} onOpenChange={setOpenCity}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between text-left"
              disabled={cityDisabled}
            >
              <span className="truncate">{cityLabel || t('profile.select_city', 'Select City')}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-full">
            <Command>
              <CommandInput placeholder={t('common.search', 'Search')} />
              <CommandList>
                <CommandGroup>
                  {cities?.map((city) => (
                    <CommandItem
                      key={city.id}
                      className="w-full flex justify-between cursor-pointer"
                      onSelect={() => {
                        setSelectedCity({
                          id: city.id,
                          name: city.name,
                          timezone: city.timezone
                        })
                        setOpenCity(false)
                      }}
                    >
                      {city.name}
                      <Check className={`w-4 h-4 ${selectedCity.id !== 0 && selectedCity.id === city.id
                        ? "opacity-100"
                        : selectedCity.id === 0 && currentCity.id === city.id
                          ? "opacity-100"
                          : "opacity-0"
                        }`} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}
