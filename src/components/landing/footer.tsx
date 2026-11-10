"use client"
import { Instagram, Youtube, Github, MessageCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useI18n } from "@/components/providers/i18n-provider"

// ✅ Server Component - Only static links, no interactivity
export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="bg-white border-t border-gray-100" role="contentinfo">
      {/* Main footer */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label={t("footer.aria_home", "Qurani - Home")}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <Image 
                    src="/icons/qurani-512.png"
                    alt="Qurani Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                    priority
                  />
                </div>
                <span className="text-2xl text-gray-900 font-cairo">URANI</span>
              </div>
            </Link>
            
            <div className="space-y-4">              
              {/* Social Media Icons */}
              <div className="flex gap-3 flex-wrap" role="list" aria-label={t("footer.social_aria", "Social media links")}>
                <Link
                  href="#"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label={t("footer.social.instagram", "Follow us on Instagram")}
                >
                  <Instagram className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label={t("footer.social.youtube", "Subscribe to our YouTube channel")}
                >
                  <Youtube className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label={t("footer.social.twitter", "Follow us on Twitter")}
                >
                  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label={t("footer.social.discord", "Join our Discord community")}
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label={t("footer.social.github", "View our GitHub repository")}
                >
                  <Github className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          {/* PRODUCT */}
          <nav className="space-y-4" aria-labelledby="product-heading">
            <h3 id="product-heading" className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              {t("footer.product.title", "Product")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.product.pricing", "Pricing")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.product.gift_cards", "Gift Cards")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.product.family_plan", "Family Plan")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.product.mobile_app", "Mobile App")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* COMPANY */}
          <nav className="space-y-4" aria-labelledby="company-heading">
            <h3 id="company-heading" className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              {t("footer.company.title", "Company")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.company.blog", "Blog")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.company.careers", "Careers")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.company.scholarship", "Scholarship")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.company.about", "About Us")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* SUPPORT */}
          <nav className="space-y-4" aria-labelledby="support-heading">
            <h3 id="support-heading" className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              {t("footer.support.title", "Support")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.support.center", "Support Center")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.support.requests", "Feature Requests")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.support.contact", "Contact Us")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* COMMUNITY */}
          <nav className="space-y-4" aria-labelledby="community-heading">
            <h3 id="community-heading" className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              {t("footer.community.title", "Community")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.community.podcast", "re:Verses Podcast")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.community.network", "Hifz Network")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.community.glossary", "Glossary")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.community.ramadan", "Ramadan")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  {t("footer.community.discord", "Discord")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="border-t border-gray-300">
        <div className="w-full bg-gray-200 max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              {t("footer.copyright", "Copyright 2025 Qurani, Inc. All rights reserved.")}
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                {t("footer.privacy", "Privacy Policy")}
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                {t("footer.terms", "Terms of Service")}
              </Link>
              <div
                className="flex items-center gap-2 text-gray-500"
                role="button"
                tabIndex={0}
                aria-label={t("footer.language_aria", "Language selector - English")}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>{t("footer.language_label", "English")}</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
