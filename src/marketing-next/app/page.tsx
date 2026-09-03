import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';
import { pageAlternates } from '@/app/(lib)/seo';
import { organizationSchema, softwareAppSchema, faqSchema } from '@/app/(lib)/schema';
import { faqs } from '@/app/(lib)/content';
import LandingClient from '@/app/(components)/(sections)/LandingClient';

export const metadata: Metadata = {
  title: 'TurnosPro | Agenda con IA, señas con MercadoPago y WhatsApp',
  description:
    '80% menos cancelaciones: agente de IA que confirma turnos por WhatsApp, señas con MercadoPago y recordatorios automáticos.',
  alternates: pageAlternates('/'),
  openGraph: {
    title: 'TurnosPro | Agenda con IA, señas con MercadoPago y WhatsApp',
    description:
      'Publica tu web de turnos, activa pagos anticipados y un agente de IA que confirma tus turnos por WhatsApp. Sin descargas ni apps nativas.',
    url: `${brand.brand_domain}${brand.marketing_path}`,
    siteName: brand.brand_name,
    images: [{ url: brand.og_image, width: 1200, height: 630 }],
    locale: brand.lang,
    type: 'website',
  },
};

export default function Page() {
  const jsonLd = [
    organizationSchema(),
    softwareAppSchema(),
    faqSchema(faqs),
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingClient />
    </>
  );
}
