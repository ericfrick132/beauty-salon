import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';
import { getVertical } from '@/app/(lib)/verticals';
import { pageAlternates } from '@/app/(lib)/seo';
import { softwareAppSchema, faqSchema, breadcrumbSchema } from '@/app/(lib)/schema';
import VerticalLanding from '@/app/(components)/(content)/VerticalLanding';

const v = getVertical('sistema-de-turnos-para-barberias');

export const metadata: Metadata = {
  title: v.title,
  description: v.description,
  alternates: pageAlternates(v.path),
  openGraph: {
    title: v.title,
    description: v.description,
    url: `${brand.brand_domain}${v.path}`,
    siteName: brand.brand_name,
    images: [{ url: brand.og_image, width: 1200, height: 630 }],
    locale: brand.lang,
    type: 'website',
  },
};

export default function Page() {
  const jsonLd = [
    breadcrumbSchema([
      { name: 'Inicio', path: '/' },
      { name: v.h1, path: v.path },
    ]),
    softwareAppSchema(),
    faqSchema(v.faqs),
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <VerticalLanding v={v} />
    </>
  );
}
