"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useI18n } from "@/components/providers/i18n-provider"

export function HeroSection() {
  const { t } = useI18n()
  const rollingWords = useMemo(
    () => [
      t("hero.rolling.anytime", "anytime"),
      t("hero.rolling.faster", "faster"),
      t("hero.rolling.smarter", "smarter"),
      t("hero.rolling.easier", "easier"),
      t("hero.rolling.stronger", "stronger"),
      t("hero.rolling.anywhere", "anywhere"),
      t("hero.rolling.confidently", "confidently"),
      t("hero.rolling.independently", "independently"),
    ],
    [t]
  )
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [scrollHeight, setScrollHeight] = useState(3)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const updateScrollHeight = useCallback(() => {
    if (window.innerWidth < 640) {
      setScrollHeight(3)      // h-12 = 3rem
    } else if (window.innerWidth < 768) {
      setScrollHeight(4)      // h-16 = 4rem
    } else if (window.innerWidth < 1024) {
      setScrollHeight(5)      // h-20 = 5rem
    } else if (window.innerWidth < 1280) {
      setScrollHeight(6)      // h-24 = 6rem
    } else {
      setScrollHeight(7)      // h-28 = 7rem
    }
  }, [])

  useEffect(() => {
    updateScrollHeight()
    window.addEventListener('resize', updateScrollHeight, { passive: true })

    // Intersection Observer for performance
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    const interval = setInterval(() => {
      if (isVisible) {
        setCurrentWordIndex((prevIndex) => (prevIndex + 1) % rollingWords.length)
      }
    }, 2500)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', updateScrollHeight)
      observer.disconnect()
    }
  }, [rollingWords.length, updateScrollHeight, isVisible])
  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Video */}
      <div className="absolute inset-0">
        <video 
          className="w-full h-full object-cover"
          autoPlay 
          muted 
          loop 
          playsInline
          poster="/images/hero-poster.jpg"
          preload="metadata"
          onLoadedData={() => setIsVideoLoaded(true)}
          onError={() => setIsVideoLoaded(true)}
          aria-label={t("hero.video_aria", "Background video showing Quran memorization")}
        >
          <source src="/videos/V-utama.mp4" type="video/mp4" />
          <p>
            {t(
              "hero.video_fallback",
              "Your browser does not support the video tag. Please use a modern browser to view this content."
            )}
          </p>
        </video>
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-black/20" />
        )}
      </div>
      
      {/* Black overlay */}
      <div className="absolute inset-0 bg-black/20">
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl text-center sm:text-left">
          <h1 className="font-bold text-white mb-6 sm:mb-8 hero-text" role="banner">
            {/* Memorize text with responsive sizing */}
            <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-none mb-1 sm:mb-2">
              {t("hero.title", "Memorize")}
            </div>
            
            {/* Rolling words container with fixed height */}
            <div className="relative">
              <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-none h-12 sm:h-16 md:h-20 lg:h-24 xl:h-28 overflow-hidden">
                <div 
                  className="flex flex-col transition-transform duration-1000 ease-in-out"
                  style={{ 
                    transform: `translateY(-${currentWordIndex * scrollHeight}rem)` 
                  }}
                >
                  {rollingWords.map((word, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-center sm:justify-start leading-none rolling-word h-12 sm:h-16 md:h-20 lg:h-24 xl:h-28"
                      style={{ willChange: currentWordIndex === index ? 'transform' : 'auto' }}
                    >
                      {word}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Underline */}
            <div className="w-16 sm:w-20 md:w-24 lg:w-32 h-1 bg-white mt-2 sm:mt-3 mx-auto sm:mx-0"></div>
          </h1>
          
          {/* CTA Button */}
          <div className="mt-6 sm:mt-8 md:mt-12 flex justify-center sm:justify-start">
            <Button 
              size="lg" 
              className="group bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg rounded-full backdrop-blur-md font-medium"
              asChild
            >
              <Link href="/register" className="flex items-center gap-2 sm:gap-3">
                {t("hero.cta", "Get Started")}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Additional background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/8 w-80 h-80 bg-orange-300/10 rounded-full blur-3xl" />
    </section>
  )
}
