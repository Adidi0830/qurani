"use client"

import { useState, useCallback, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

export function FAQSection() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const faqs = useMemo(
    () => [
      {
        question: t("faq.items.0.question", "What is Qurani?"),
        answer: t(
          "faq.items.0.answer",
          "Qurani is a digital platform that helps Muslims memorize the Quran. The application provides a memorization tracking system, progress monitoring, and community features to make your Quran memorization journey easier and more effective."
        ),
      },
      {
        question: t("faq.items.1.question", "How do I use Qurani?"),
        answer: t(
          "faq.items.1.answer",
          "After registering, you can start by creating daily memorization reports, joining memorization groups, and tracking your progress. The application also provides a digital mushaf for easy Quran reading and memorization."
        ),
      },
      {
        question: t("faq.items.2.question", "Is Qurani free?"),
        answer: t(
          "faq.items.2.answer",
          "Yes, Qurani provides basic features for free including the memorization tracking system, progress monitoring, and access to the digital mushaf. Some premium features may be available for a more complete experience."
        ),
      },
      {
        question: t("faq.items.3.question", "How do I join a memorization group?"),
        answer: t(
          "faq.items.3.answer",
          "You can search for available memorization groups in the 'Find Group' menu or create your own group in 'My Groups'. After joining, you can interact with other group members and track progress together."
        ),
      },
      {
        question: t("faq.items.4.question", "How does the memorization tracking system work?"),
        answer: t(
          "faq.items.4.answer",
          "The memorization tracking system allows you to report your daily memorization. You can select the surah or juz you have memorized, and the system will record your progress. You can view your memorization results in the dashboard to monitor your development."
        ),
      },
      {
        question: t("faq.items.5.question", "Are there features to track memorization progress?"),
        answer: t(
          "faq.items.5.answer",
          "Yes, Qurani provides comprehensive statistics to track your memorization progress. You can view daily, weekly, and monthly progress. A recap feature is also available to see a summary of your achievements."
        ),
      },
      {
        question: t("faq.items.6.question", "How do I add friends on Qurani?"),
        answer: t(
          "faq.items.6.answer",
          "You can search for friends in the 'Find Friends' menu and send friend requests. After becoming friends, you can view each other's memorization progress and provide mutual motivation."
        ),
      },
      {
        question: t("faq.items.7.question", "Are there notifications to remind me about memorization?"),
        answer: t(
          "faq.items.7.answer",
          "Yes, Qurani's notification system will remind you about daily memorization reports, friend requests, and group activities. You can customize your notification preferences according to your needs."
        ),
      },
      {
        question: t("faq.items.8.question", "How do I use the digital mushaf?"),
        answer: t(
          "faq.items.8.answer",
          "The digital mushaf is available with easy-to-read Arabic fonts. You can navigate by surah or juz and use features like zoom and bookmark to facilitate the memorization process."
        ),
      },
      {
        question: t("faq.items.9.question", "Is my memorization data secure?"),
        answer: t(
          "faq.items.9.answer",
          "Yes, all your memorization data and personal information are protected with strict security systems. Your data can only be accessed by you and people you authorize within your memorization groups."
        ),
      },
    ],
    [t]
  )

  const toggleFAQ = useCallback((index: number) => {
    setOpenIndex(prevIndex => prevIndex === index ? null : index)
  }, [])

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-white" aria-labelledby="faq-heading">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-start">
          {/* Left Content */}
          <div className="space-y-8 lg:sticky lg:top-8 lg:self-start">
            <div className="space-y-2">
              <div className="relative">
                <h2 id="faq-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  {t("faq.title", "Frequently Asked Questions")}
                </h2>

                {/* Decorative elements */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-100 rounded-full opacity-60"></div>
                <div className="absolute top-8 -left-4 w-6 h-6 bg-purple-200 rounded-full opacity-40"></div>
              </div>

              {/* Decorative pattern */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                <div className="w-8 h-1 bg-purple-300 rounded-full"></div>
                <div className="w-6 h-1 bg-purple-200 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Right Content - FAQ Items */}
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${openIndex === index ? 'transform rotate-180' : ''
                      }`}
                    aria-hidden="true"
                  />
                </button>

                {openIndex === index && (
                  <div id={`faq-answer-${index}`} className="px-4 sm:px-6 pb-3 sm:pb-4" role="region" aria-labelledby={`faq-question-${index}`}>
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
