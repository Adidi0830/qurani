"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useI18n } from "@/components/providers/i18n-provider"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { t } = useI18n()

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY
    setIsScrolled(scrollTop > 100)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-500 ease-in-out ${isScrolled
        ? 'pt-2 sm:pt-4'
        : ''
      }`} role="banner">
      <div className={`transition-all duration-500 ease-in-out ${isScrolled
          ? 'max-w-4xl mx-auto px-3 sm:px-4 mobile-navbar-scrolled'
          : 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
        }`}>
        <div className={`flex items-center justify-between transition-all duration-500 ease-in-out ${isScrolled
            ? 'h-12 sm:h-14 bg-black/80 backdrop-blur-xl rounded-full px-4 sm:px-6 py-2 sm:py-3 shadow-xl shadow-black/20 border border-white/10'
            : 'h-16 sm:h-20 bg-transparent px-0'
          }`}>
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3"
            aria-label={t("header.aria_home", "Qurani - Home")}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className={`transition-all duration-300 ${isScrolled ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-7 h-7 sm:w-8 sm:h-8'
                }`}>
                <Image 
                  src="/icons/qurani-512.png"
                  alt="Qurani Logo"
                  width={32}
                  height={32}
                  className={`transition-all duration-300 ${isScrolled ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-7 h-7 sm:w-8 sm:h-8'
                  }`}
                  priority
                />
              </div>
            </div>
          </Link>

          {/* Login Button - Desktop and Mobile */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              className={`transition-all duration-300 border rounded-full px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${isScrolled
                  ? 'text-white hover:bg-white hover:text-gray-700 border-white/20'
                  : 'text-white hover:bg-white hover:text-gray-700 border-white/20'
                }`}
              asChild
            >
              <Link href="/login" aria-label={t("header.aria_login", "Login to your Qurani account")}>
                {t("header.login", "Log in")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
