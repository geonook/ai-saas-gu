import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/features/landing/hero-section';
import { FeaturesSection } from '@/components/features/landing/features-section';
import { PricingPreview } from '@/components/features/landing/pricing-preview';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PricingPreview />
      </main>
      <Footer />
    </div>
  );
}
