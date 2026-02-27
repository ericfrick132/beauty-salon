'use client';
import { SignupModalProvider } from './SignupModal';
import Header from '../Header';
import Footer from '../Footer';
import HeroSection from './HeroSection';
import LogoCarousel from './LogoCarousel';
import SolutionSection from './SolutionSection';
import FeatureHighlight from './FeatureHighlight';
import FeatureGrid from './FeatureGrid';
import AgendaSection from './AgendaSection';
import BusinessTypes from './BusinessTypes';
import HowItWorks from './HowItWorks';
import TestimonialsSection from './TestimonialsSection';
import FaqSection from './FaqSection';
import FinalCta from './FinalCta';
import { logoCarouselTitle } from '@/app/(lib)/content';

export default function LandingClient() {
  return (
    <SignupModalProvider>
      <Header />
      <main>
        <HeroSection />
        <LogoCarousel title={logoCarouselTitle} />
        <SolutionSection />
        <FeatureHighlight />
        <FeatureGrid />
        <AgendaSection />
        <BusinessTypes />
        <HowItWorks />
        <LogoCarousel />
        <TestimonialsSection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </SignupModalProvider>
  );
}
