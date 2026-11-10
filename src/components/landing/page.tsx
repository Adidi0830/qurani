import {
  Header,
  HeroSection,
  FeaturesSection,
  StatisticsSection,
  TestimonialsSection,
  FAQSection,
  Footer
} from './index'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-amber-700">
      <Header />
      <main>
        <HeroSection />
        <div id="features" className="bg-white">
          <FeaturesSection />
        </div>
        <div id="about" className="bg-gray-50">
          <StatisticsSection />
        </div>
        <div className="bg-white">
          <TestimonialsSection />
        </div>
        <div className="bg-white">
          <FAQSection />
        </div>
      </main>
      <div id="contact" className="bg-gray-900">
        <Footer />
      </div>
    </div>
  )
}
