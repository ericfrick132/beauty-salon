import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';
import { countryAlternates } from '@/app/(lib)/seo';
import { breadcrumbSchema, faqSchema, planOffers } from '@/app/(lib)/schema';
import { MARKET_COUNTRIES, estimateFromArs, type MarketCountryCode } from '@/app/(lib)/countries';
import CountryLanding from './CountryLanding';

/** Metadata de /uy, /mx y /es: canonical propio + hreflang recíproco con la home de Argentina. */
export function countryMetadata(code: MarketCountryCode): Metadata {
  const c = MARKET_COUNTRIES[code];
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: countryAlternates(c.path),
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      url: `${brand.brand_domain}${c.path}`,
      siteName: brand.brand_name,
      images: [{ url: brand.og_image, width: 1200, height: 630 }],
      locale: c.hreflang.replace('-', '_'),
      type: 'website',
    },
  };
}

/** Página de país: JSON-LD (migas, app y FAQ del país) + la landing. */
export default function CountryPage({ code }: { code: MarketCountryCode }) {
  const c = MARKET_COUNTRIES[code];
  const jsonLd = [
    breadcrumbSchema([
      { name: 'TurnosPro', path: '/' },
      { name: c.name, path: c.path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: brand.brand_name,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: c.hreflang,
      areaServed: c.name,
      offers: planOffers(
        c.currency,
        (ars) => estimateFromArs(ars, c.currency),
        (code) => c.copy.pricing.plans[code as keyof typeof c.copy.pricing.plans]?.tagline,
      ),
      url: `${brand.brand_domain}${c.path}`,
      featureList: Array.from(new Set(Object.values(c.copy.pricing.plans).flatMap((p) => p.features))),
    },
    faqSchema([...c.faqs, ...c.copy.pricing.comparison.faqs]),
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <CountryLanding code={code} />
    </>
  );
}
