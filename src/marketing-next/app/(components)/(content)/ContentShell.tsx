'use client';
import type { ReactNode } from 'react';
import { SignupModalProvider } from '../(sections)/SignupModal';
import Header from '../Header';
import Footer from '../Footer';
import { MARKET_COUNTRY_LIST, type MarketCountry } from '@/app/(lib)/countries';

/**
 * Cascarón compartido para páginas de contenido (verticales, blog):
 * mismo header, footer y modal de registro que la home.
 */
export default function ContentShell({ children, country }: { children: ReactNode; country?: MarketCountry }) {
  if (!country) {
    return (
      <SignupModalProvider>
        <Header />
        <main>{children}</main>
        <Footer />
      </SignupModalProvider>
    );
  }
  // Landing por país: el alta preselecciona el país y el footer habla con su vocabulario.
  const countryLinks = [
    { path: '/', name: 'Argentina' },
    ...MARKET_COUNTRY_LIST.map((c) => ({ path: c.path, name: c.name })),
  ].filter((c) => c.path !== country.path);
  return (
    <SignupModalProvider country={country}>
      <Header homePath={country.path} />
      <main>{children}</main>
      <Footer tagline={country.copy.footerTagline} findUsLabel={country.copy.footerFindUs} countryLinks={countryLinks} />
    </SignupModalProvider>
  );
}
