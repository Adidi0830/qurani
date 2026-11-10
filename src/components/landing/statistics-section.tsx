"use client"

import { Star } from "lucide-react"
import Image from "next/image"
import { useCallback, useState, useRef, useEffect } from "react"
import { useI18n } from "@/components/providers/i18n-provider"

export function StatisticsSection() {
  const { t } = useI18n()
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  
  const handleVideoClick = useCallback(() => {
    window.open('https://youtu.be/_XTxAHcIxA0', '_blank', 'noopener,noreferrer')
  }, [])
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])
  return (
    <section ref={sectionRef} className="py-12 sm:py-16 lg:py-24 bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {t("stats.title_prefix", "What's the")}{" "}
                <span className="italic">{t("stats.title_emphasis", "big")}</span>{" "}
                {t("stats.title_mid", "deal with")}
                <br className="hidden md:block" />
                {t("stats.title_brand", "Qurani")}{" "}
                <span className="italic">{t("stats.title_premium", "Premium")}</span>{" "}
                {t("stats.title_suffix", "anyway?")}
              </h2>
              
              <div className="text-4xl sm:text-5xl lg:text-6xl">
                😳
              </div>
              
              {/* Star Rating */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-4">
                <div className="flex gap-1" role="img" aria-label={t("stats.stars_aria", "5 out of 5 stars")}>
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-5 h-5 sm:w-6 sm:h-6 fill-green-500 text-green-500 transition-transform duration-200 hover:scale-110" 
                      aria-hidden="true"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <span className="text-sm sm:text-base text-gray-600 font-medium">
                  {t("stats.reviews", "91,000+ 5 Star Reviews")}
                </span>
              </div>
            </div>
          </div>

          {/* Right Content - YouTube Video Thumbnail */}
          <div className="relative order-1 lg:order-2">
            <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden shadow-lg">
              {!isImageLoaded && (
                <div className="absolute inset-0 bg-gray-300 animate-pulse rounded-lg" />
              )}
              <Image
                src="https://img.youtube.com/vi/_XTxAHcIxA0/maxresdefault.jpg"
                alt={t(
                  "stats.thumbnail_alt",
                  "Qurani Premium features demonstration - Video showing advanced mistake detection and personalized learning features"
                )}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  isImageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                priority={isVisible}
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onLoad={() => setIsImageLoaded(true)}
                onError={() => setIsImageLoaded(true)}
              />
              {/* Play button overlay */}
              <button 
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 cursor-pointer group transition-colors duration-200"
                onClick={handleVideoClick}
                aria-label={t("stats.play_aria", "Play Qurani Premium demonstration video")}
                style={{ willChange: 'background-color' }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                  <div className="w-0 h-0 border-l-[12px] sm:border-l-[16px] border-l-red-600 border-y-[8px] sm:border-y-[10px] border-y-transparent ml-1" aria-hidden="true"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
