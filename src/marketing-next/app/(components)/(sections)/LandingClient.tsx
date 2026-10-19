'use client';
import { SignupModalProvider } from './SignupModal';
import HomeNav from '../(home)/HomeNav';
import HomeHero from '../(home)/HomeHero';
import {
  BookingLinkSection,
  DepositSection,
  ReminderSection,
  AssistantSection,
  AgendaSection,
  DemoSection,
  RubrosSection,
  AppSection,
} from '../(home)/HomeSections';
import HomePricing from '../(home)/HomePricing';
import HomeFaq from '../(home)/HomeFaq';
import HomeClosing from '../(home)/HomeClosing';
import HomeFooter from '../(home)/HomeFooter';

// Home de Argentina (/) con el estilo comunicacional de Ascend: prueba social real arriba del H1,
// secciones de H2 corto + una línea + producto en card, precios desde la base y cierre con alta.
export default function LandingClient() {
  return (
    <SignupModalProvider>
      <HomeNav />
      <main>
        <HomeHero />
        <BookingLinkSection />
        <DepositSection />
        <ReminderSection />
        <AssistantSection />
        <AgendaSection />
        <DemoSection />
        <HomePricing />
        <RubrosSection />
        <AppSection />
        <HomeFaq />
        <HomeClosing />
      </main>
      <HomeFooter />
    </SignupModalProvider>
  );
}
