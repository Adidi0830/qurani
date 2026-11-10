"use client"

import Image from "next/image"
import { useState, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

const podcastEpisodes = [
  {
    title: "Quran revision Burnout? Try This 20-Minute Plan!",
    subtitle: "Dari Younus Rahman | re:Verses Episode 51",
    date: "25.07.2025",
    thumbnail: "https://img.youtube.com/vi/hwig-OJz88Y/hqdefault.jpg",
    videoUrl: "https://youtu.be/hwig-OJz88Y?si=iQXitkyAJC-64PaL",
    duration: "1 JUZ IN 20 MINUTES"
  },
  {
    title: "How to Practically Do Tadabbur of The Quran | Ust. Dawoud Yahya",
    subtitle: "re:Verses Episode 49",
    date: "27.04.2025",
    thumbnail: "https://img.youtube.com/vi/ptmfvHHuXKU/maxresdefault.jpg",
    videoUrl: "https://youtu.be/ptmfvHHuXKU?si=P5VDFkdyHQcA0IZr",
    badge: "THIS ONE HABIT WILL COMPLETELY CHANGE HOW YOU READ THE QURAN!"
  },
  {
    title: "How to Improve Your Tajweed | Ust. Dawoud Yahya",
    subtitle: "re:Verses Episode 48",
    date: "14.04.2025",
    thumbnail: "https://img.youtube.com/vi/Pjwr276ALGU/maxresdefault.jpg",
    videoUrl: "https://youtu.be/Pjwr276ALGU?si=meQhGXK7GdVLMSJn",
    badge: "Tajweed Tips That Work!"
  },
  {
    title: "How to Memorize the Quran with a Busy Schedule",
    subtitle: "Ust. Dawoud Yahya | re:Verses Episode 47",
    date: "19.03.2025",
    thumbnail: "https://img.youtube.com/vi/8CJDo4FS-Sg/maxresdefault.jpg",
    videoUrl: "https://youtu.be/8CJDo4FS-Sg?si=UhH4e0y9Zg-I3rpI",
    isCompleted: true
  },
  {
    title: "Why Most People Struggle With Memorizing the Quran",
    subtitle: "Ust. Dawoud Yahya re:Verses Episode 46",
    date: "02.03.2025",
    thumbnail: "https://img.youtube.com/vi/6fvIMcigRsk/maxresdefault.jpg",
    videoUrl: "https://youtu.be/6fvIMcigRsk?si=KI2HLqNP3eemkI8S",
    badge: "THEY SAID IT WAS 'IMPOSSIBLE' UNTIL THEY TRIED THIS!"
  },
  {
    title: "The Quran Journey, Traits of the True Carriers of the Quran",
    subtitle: "Ahmad Al-Qattani re:Verses Episode 4",
    date: "19.01.2025",
    thumbnail: "https://img.youtube.com/vi/r93czlwot1k/maxresdefault.jpg",
    videoUrl: "https://youtu.be/r93czlwot1k?si=vyqp0cjmVjKGTIpu",
    badge: "TRAITS OF THE CARRIERS OF THE QURAN"
  }
]

const blogPosts = [
  {
    title: "How to Prepare for Ramadan 2026 - Starting Now (6-Month Plan)",
    date: "20.08.2025",
    thumbnail: "https://img.youtube.com/vi/jY4XAavPfdc/maxresdefault.jpg",
    videoUrl: "https://youtu.be/jY4XAavPfdc?si=UOm52J1YsGl8bjcT"
  },
  {
    title: "Spaced Repetition and Quran Memorization: How to Make Your Hifz Stick for Life",
    date: "18.08.2025",
    thumbnail: "https://img.youtube.com/vi/rwwOzt0HDhQ/maxresdefault.jpg",
    videoUrl: "https://youtu.be/rwwOzt0HDhQ?si=AIij60ZlRz67AgXh"
  },
  {
    title: "The 6446 Method for Quran Memorization",
    date: "15.08.2025",
    thumbnail: "https://img.youtube.com/vi/jY4XAavPfdc/maxresdefault.jpg",
    videoUrl: "https://youtu.be/jY4XAavPfdc?si=UOm52J1YsGl8bjcT"
  },
  {
    title: "8 Simple Ways to Restart Your Quran Journey | Sh. Ahmad Al Nufais",
    date: "15.08.2025",
    thumbnail: "https://img.youtube.com/vi/rwwOzt0HDhQ/maxresdefault.jpg",
    videoUrl: "https://youtu.be/rwwOzt0HDhQ?si=AIij60ZlRz67AgXh",
    badge: "Return to the Quran"
  },
  {
    title: "On Happiness, Gratitude and Not Just Waiting For the Milestones",
    date: "13.08.2025",
    thumbnail: "https://img.youtube.com/vi/jY4XAavPfdc/maxresdefault.jpg",
    videoUrl: "https://youtu.be/jY4XAavPfdc?si=UOm52J1YsGl8bjcT"
  },
  {
    title: "How to Memorize the Quran with a Busy Schedule",
    date: "11.08.2025",
    thumbnail: "https://img.youtube.com/vi/rwwOzt0HDhQ/maxresdefault.jpg",
    videoUrl: "https://youtu.be/rwwOzt0HDhQ?si=AIij60ZlRz67AgXh"
  }
]

export function TestimonialsSection() {
  const { t } = useI18n()
  const [podcastIndex, setPodcastIndex] = useState(0)
  const [blogIndex, setBlogIndex] = useState(0)
  const podcastRef = useRef<HTMLDivElement>(null)
  const blogRef = useRef<HTMLDivElement>(null)

  // Touch gesture states
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isPodcastScrolling, setIsPodcastScrolling] = useState(false)
  const [isBlogScrolling, setIsBlogScrolling] = useState(false)

  // Dynamic calculation for mobile responsiveness - memoized
  const getItemsPerView = useCallback(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth
      if (width < 640) return 1.2 // Show 1.2 items on mobile for better UX
      if (width < 768) return 2
      if (width < 1024) return 2.5
      return 3
    }
    return 3
  }, [])

  const itemsPerView = getItemsPerView()
  const maxPodcastIndex = Math.max(0, podcastEpisodes.length - itemsPerView)
  const maxBlogIndex = Math.max(0, blogPosts.length - itemsPerView)

  const scrollToPodcast = useCallback((index: number) => {
    if (podcastRef.current && !isPodcastScrolling) {
      setIsPodcastScrolling(true)
      const container = podcastRef.current
      // Use window width for consistent calculation
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
      const itemWidth = isMobile ? 240 : 320 // Dynamic width based on screen size
      const gap = 16 // gap-4 = 16px
      const scrollLeft = index * (itemWidth + gap)

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })

      // Reset scrolling state after animation
      setTimeout(() => setIsPodcastScrolling(false), 300)
    }
  }, [isPodcastScrolling])

  const scrollToBlog = useCallback((index: number) => {
    if (blogRef.current && !isBlogScrolling) {
      setIsBlogScrolling(true)
      const container = blogRef.current
      // Use window width for consistent calculation
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
      const itemWidth = isMobile ? 240 : 320 // Dynamic width based on screen size
      const gap = 16 // gap-4 = 16px
      const scrollLeft = index * (itemWidth + gap)

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })

      // Reset scrolling state after animation
      setTimeout(() => setIsBlogScrolling(false), 300)
    }
  }, [isBlogScrolling])

  const handlePodcastPrev = useCallback(() => {
    const newIndex = Math.max(0, podcastIndex - 1)
    setPodcastIndex(newIndex)
    scrollToPodcast(newIndex)
  }, [podcastIndex, scrollToPodcast])

  const handlePodcastNext = useCallback(() => {
    const newIndex = Math.min(maxPodcastIndex, podcastIndex + 1)
    setPodcastIndex(newIndex)
    scrollToPodcast(newIndex)
  }, [podcastIndex, maxPodcastIndex, scrollToPodcast])

  const handleBlogPrev = useCallback(() => {
    const newIndex = Math.max(0, blogIndex - 1)
    setBlogIndex(newIndex)
    scrollToBlog(newIndex)
  }, [blogIndex, scrollToBlog])

  const handleBlogNext = useCallback(() => {
    const newIndex = Math.min(maxBlogIndex, blogIndex + 1)
    setBlogIndex(newIndex)
    scrollToBlog(newIndex)
  }, [blogIndex, maxBlogIndex, scrollToBlog])

  // Enhanced touch gesture handlers for better mobile experience
  const minSwipeDistance = 30 // Reduced for more responsive touch
  const [touchVelocity, setTouchVelocity] = useState(0)
  const [lastTouchTime, setLastTouchTime] = useState(0)
  const [lastTouchPosition, setLastTouchPosition] = useState(0)

  const onTouchStart = (e: React.TouchEvent, type: 'podcast' | 'blog') => {
    const isScrolling = type === 'podcast' ? isPodcastScrolling : isBlogScrolling
    if (isScrolling) return // Prevent touch during scroll animation

    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setLastTouchPosition(e.targetTouches[0].clientX)
    setLastTouchTime(Date.now())
    setTouchVelocity(0)
  }

  const onTouchMove = (e: React.TouchEvent, type: 'podcast' | 'blog') => {
    const isScrolling = type === 'podcast' ? isPodcastScrolling : isBlogScrolling
    if (!touchStart || isScrolling) return

    const currentTouch = e.targetTouches[0].clientX
    const currentTime = Date.now()
    const timeDiff = currentTime - lastTouchTime

    if (timeDiff > 0) {
      // Calculate velocity based on last position, not initial touch
      const velocity = Math.abs(currentTouch - lastTouchPosition) / timeDiff
      setTouchVelocity(velocity)
      setLastTouchPosition(currentTouch)
      setLastTouchTime(currentTime)
    }

    setTouchEnd(currentTouch)
  }

  const onTouchEnd = (type: 'podcast' | 'blog') => {
    const isScrolling = type === 'podcast' ? isPodcastScrolling : isBlogScrolling
    if (!touchStart || !touchEnd || isScrolling) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    const isFastSwipe = touchVelocity > 0.5 // Fast swipe threshold

    // Only trigger navigation if it's a clear swipe gesture
    if (Math.abs(distance) < minSwipeDistance && !isFastSwipe) return

    if (type === 'podcast') {
      if (isLeftSwipe && podcastIndex < maxPodcastIndex) {
        handlePodcastNext()
      } else if (isRightSwipe && podcastIndex > 0) {
        handlePodcastPrev()
      }
    } else if (type === 'blog') {
      if (isLeftSwipe && blogIndex < maxBlogIndex) {
        handleBlogNext()
      } else if (isRightSwipe && blogIndex > 0) {
        handleBlogPrev()
      }
    }
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-gradient-to-br from-white via-white to-teal-400">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        {/* re:Verses podcast Section */}
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t("testimonials.podcast_title", "re:Verses Podcast")}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Left Navigation Button - Hidden on mobile */}
            <button
              onClick={handlePodcastPrev}
              disabled={podcastIndex === 0}
              className="hidden sm:flex flex-shrink-0 w-12 h-12 bg-white hover:bg-gray-50 shadow-lg rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200"
              aria-label={t("testimonials.podcast_prev", "Previous podcast episodes")}
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" aria-hidden="true" />
            </button>

            {/* Podcast Cards Container */}
            <div
              ref={podcastRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide flex-1 snap-x snap-mandatory"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
                scrollBehavior: 'smooth'
              }}
              onTouchStart={(e) => onTouchStart(e, 'podcast')}
              onTouchMove={(e) => onTouchMove(e, 'podcast')}
              onTouchEnd={() => onTouchEnd('podcast')}
            >
              {podcastEpisodes.map((episode, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-60 sm:w-64 md:w-72 lg:w-80 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow snap-start"
                >
                  <a
                    href={episode.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <div className="relative">
                      <Image
                        src={episode.thumbnail}
                        alt={t("testimonials.thumbnail_podcast", "Thumbnail for {{title}} - {{subtitle}}", {
                          title: episode.title,
                          subtitle: episode.subtitle,
                        })}
                        width={320}
                        height={180}
                        className="w-full h-36 sm:h-40 lg:h-44 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to hqdefault if maxresdefault fails
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('maxresdefault')) {
                            target.src = target.src.replace('maxresdefault', 'hqdefault');
                          }
                        }}
                      />

                      {episode.isCompleted && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="text-xs text-gray-500 mb-2">{episode.date}</div>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight text-sm sm:text-base">
                        {episode.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{episode.subtitle}</p>
                    </div>
                  </a>
                </div>
              ))}
              {/* Spacer for mobile to ensure last item is fully visible */}
              <div className="flex-shrink-0 w-4 sm:hidden"></div>
            </div>

            {/* Right Navigation Button - Hidden on mobile */}
            <button
              onClick={handlePodcastNext}
              disabled={podcastIndex >= maxPodcastIndex}
              className="hidden sm:flex flex-shrink-0 w-12 h-12 bg-white hover:bg-gray-50 shadow-lg rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200"
              aria-label={t("testimonials.podcast_next", "Next podcast episodes")}
            >
              <ChevronRight className="w-6 h-6 text-gray-700" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Qurani Blog Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t("testimonials.blog_title", "Qurani Blog")}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Left Navigation Button - Hidden on mobile */}
            <button
              onClick={handleBlogPrev}
              disabled={blogIndex === 0}
              className="hidden sm:flex flex-shrink-0 w-12 h-12 bg-white hover:bg-gray-50 shadow-lg rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200"
              aria-label={t("testimonials.blog_prev", "Previous blog posts")}
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" aria-hidden="true" />
            </button>

            {/* Blog Cards Container */}
            <div
              ref={blogRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide flex-1 snap-x snap-mandatory"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
                scrollBehavior: 'smooth'
              }}
              onTouchStart={(e) => onTouchStart(e, 'blog')}
              onTouchMove={(e) => onTouchMove(e, 'blog')}
              onTouchEnd={() => onTouchEnd('blog')}
            >
              {blogPosts.map((post, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-60 sm:w-64 md:w-72 lg:w-80 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow snap-start"
                >
                  <a
                    href={post.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <div className="relative">
                      <Image
                        src={post.thumbnail}
                        alt={t("testimonials.thumbnail_blog", "Thumbnail for blog post: {{title}}", {
                          title: post.title,
                        })}
                        width={320}
                        height={180}
                        className="w-full h-36 sm:h-40 lg:h-44 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to hqdefault if maxresdefault fails
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('maxresdefault')) {
                            target.src = target.src.replace('maxresdefault', 'hqdefault');
                          }
                        }}
                      />

                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="text-xs text-gray-500 mb-2">{post.date}</div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight text-sm sm:text-base">
                        {post.title}
                      </h3>
                    </div>
                  </a>
                </div>
              ))}
              {/* Spacer for mobile to ensure last item is fully visible */}
              <div className="flex-shrink-0 w-4 sm:hidden"></div>
            </div>

            {/* Right Navigation Button - Hidden on mobile */}
            <button
              onClick={handleBlogNext}
              disabled={blogIndex >= maxBlogIndex}
              className="hidden sm:flex flex-shrink-0 w-12 h-12 bg-white hover:bg-gray-50 shadow-lg rounded-full items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200"
              aria-label={t("testimonials.blog_next", "Next blog posts")}
            >
              <ChevronRight className="w-6 h-6 text-gray-700" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
