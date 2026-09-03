import { brand } from '@/app/(lib)/brand';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.brand_name,
    url: brand.brand_domain,
    logo: `${brand.brand_domain}${brand.logo_url}`,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: brand.support_email,
        telephone: brand.support_phone,
        areaServed: 'AR',
      },
    ],
    sameAs: ['https://www.linkedin.com/company/efcloud'],
  } as const;
}

export function softwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: brand.brand_name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: `${brand.brand_domain}${brand.marketing_path}`,
    featureList: [
      'Reservas con seña',
      'MercadoPago integrado',
      'Recordatorios automáticos por WhatsApp',
      'Agenda online 24/7',
      'Reportes en vivo',
      'Reducción de ausencias',
    ],
  } as const;
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } as const;
}

export function videoSchema({ url, name, description }: { url: string; name: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description,
    thumbnailUrl: [`${brand.brand_domain}${brand.og_image}`],
    uploadDate: new Date().toISOString(),
    contentUrl: url,
    publisher: {
      '@type': 'Organization',
      name: brand.brand_name,
      logo: {
        '@type': 'ImageObject',
        url: `${brand.brand_domain}${brand.logo_url}`,
      },
    },
  } as const;
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, brand.brand_domain).toString(),
    })),
  } as const;
}

export function articleSchema({
  headline,
  description,
  path,
  datePublished,
  dateModified,
}: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}) {
  const url = new URL(path, brand.brand_domain).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    inLanguage: brand.lang,
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: [`${brand.brand_domain}${brand.og_image}`],
    author: { '@type': 'Organization', name: brand.brand_name, url: brand.brand_domain },
    publisher: {
      '@type': 'Organization',
      name: brand.brand_name,
      logo: { '@type': 'ImageObject', url: `${brand.brand_domain}${brand.logo_url}` },
    },
  } as const;
}
