"use client"

import { Button } from "@/components/ui/button"
import { useRef, useState, useCallback, useMemo } from "react"
import { useI18n } from "@/components/providers/i18n-provider"

export function FeaturesSection() {
  const { t } = useI18n()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [videosLoaded, setVideosLoaded] = useState<{[key: number]: boolean}>({})
  const features = useMemo(
    () => [
      {
        title: t("features.items.0.title", "Memorization"),
        subtitle: t("features.items.0.subtitle", "Mistake Detection"),
        description: t(
          "features.items.0.description",
          "Our flagship feature: Qurani's AI will detect missed, incorrect and skipped words in your recitation and alert you in real time."
        ),
        video: "/videos/V-1.mp4",
        videoAlt: t("features.items.0.video_alt", "Video showing mistake detection feature"),
      },
      {
        title: t("features.items.1.title", "Memorization Planning"),
        subtitle: "",
        description: t(
          "features.items.1.description",
          "Tailor your memorization journey to your learning style and preferences using Qurani's intuitive planning tools."
        ),
        video: "/videos/V-2.mp4",
        videoAlt: t("features.items.1.video_alt", "Video showing memorization planning feature"),
      },
      {
        title: t("features.items.2.title", "Goals"),
        subtitle: "",
        description: t(
          "features.items.2.description",
          "Set goals for yourself and track your progress as you memorize the Quran."
        ),
        video: "/videos/V-3.mp4",
        videoAlt: t("features.items.2.video_alt", "Video showing goals feature"),
      },
    ],
    [t]
  )

  const getScrollAmount = useCallback(() => {
    if (window.innerWidth < 640) {
      return 280 // w-64 (256px) + gap-6 (24px) = 280px untuk mobile
    } else if (window.innerWidth < 1024) {
      return 312 // w-72 (288px) + gap-6 (24px) = 312px untuk tablet
    } else {
      return 344 // w-80 (320px) + gap-6 (24px) = 344px untuk desktop
    }
  }, [])

  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollAmount = getScrollAmount()
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [getScrollAmount])

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollAmount = getScrollAmount()
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [getScrollAmount])

  const handleVideoLoad = useCallback((index: number) => {
    setVideosLoaded(prev => ({ ...prev, [index]: true }))
  }, [])

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gray-100 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Container - Responsive Layout */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-16 lg:items-start">
          {/* Header Section - Full width on mobile, 1/3 on desktop */}
          <div className="w-full lg:w-1/3 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-8">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4 lg:mb-6 text-gray-900">
                {t("features.title", "Memorize more")}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6 lg:mb-8">
                {t("features.subtitle", "Make your memorization a premium experience.")}
              </p>
              <Button 
                size="lg" 
                className="bg-gray-900 text-white hover:bg-gray-800 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg rounded-full w-full sm:w-auto"
                asChild
              >
                <a href="/register" aria-label={t("features.cta_aria", "Start your Quran memorization journey")}>
                  {t("features.cta", "Get Started")}
                </a>
              </Button>
            </div>
          </div>
          
          {/* Features Cards Container - Full width on mobile, 2/3 on desktop */}
          <div className="w-full lg:w-2/3">
            {/* Features Container - 3 Cards Horizontal */}
            <div 
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto overflow-y-hidden items-end scrollbar-hide features-scroll-container"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {features.map((feature, index) => (
                <div key={index} className="flex-shrink-0 w-64 sm:w-72 lg:w-80 flex flex-col features-card">
                  {/* Feature Content */}
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5 flex-grow px-1 sm:px-2 lg:px-0">
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 min-h-[2.5rem] sm:min-h-[3rem] flex items-start leading-tight">
                      <span>
                        {feature.title}
                        {feature.subtitle && (
                          <>
                            <br />
                            <span className="text-gray-700 text-xs sm:text-sm lg:text-base font-normal">{feature.subtitle}</span>
                          </>
                        )}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed min-h-[3rem] sm:min-h-[4rem] lg:min-h-[4.5rem]">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Video Container */}
                  <div className="relative w-full aspect-[4/3] sm:aspect-[5/3] bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0">
                    {/* Video Player */}
                    <video 
                      className="w-full h-full object-cover rounded-lg sm:rounded-xl"
                      autoPlay 
                      muted 
                      loop 
                      playsInline
                      preload="metadata"
                      onLoadedData={() => handleVideoLoad(index)}
                      aria-label={feature.videoAlt}
                    >
                      <source src={feature.video} type="video/mp4" />
                      <p>
                        {t("features.video_fallback", "Your browser does not support the video tag.")}{" "}
                        {feature.videoAlt}
                      </p>
                    </video>
                    {!videosLoaded[index] && (
                      <div className="absolute inset-0 bg-transparent rounded-lg sm:rounded-xl" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tombol Navigasi - Responsif */}
        <div className="flex justify-center mt-4 sm:mt-6 lg:mt-8 gap-3 sm:gap-4">
          <button 
            onClick={scrollLeft}
            className="w-14 h-14 sm:w-12 sm:h-12 lg:w-10 lg:h-10 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white hover:shadow-xl transition-all border border-gray-200/50 touch-manipulation features-nav-button active:scale-95"
            aria-label={t("features.nav_left", "Scroll left to see previous features")}
          >
            <svg className="w-7 h-7 sm:w-6 sm:h-6 lg:w-5 lg:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={scrollRight}
            className="w-14 h-14 sm:w-12 sm:h-12 lg:w-10 lg:h-10 bg-gray-900/95 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 hover:shadow-xl transition-all touch-manipulation features-nav-button active:scale-95"
            aria-label={t("features.nav_right", "Scroll right to see more features")}
          >
            <svg className="w-7 h-7 sm:w-6 sm:h-6 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}


