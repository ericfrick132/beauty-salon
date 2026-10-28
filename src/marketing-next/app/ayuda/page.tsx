import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';
import { pageAlternates, absUrl } from '@/app/(lib)/seo';
import { breadcrumbSchema } from '@/app/(lib)/schema';
import { LECCIONES, MODULOS } from '@/app/(lib)/curso';
import ContentShell from '@/app/(components)/(content)/ContentShell';
import CourseIndex from '@/app/(components)/(curso)/CourseIndex';

const title = 'Centro de ayuda de TurnosPro | Curso paso a paso';
const description = `Aprendé TurnosPro de principio a fin: ${MODULOS.length} módulos y ${LECCIONES.length} lecciones cortas para configurar tu negocio, dar turnos, cobrar señas y usar WhatsApp.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates('/ayuda'),
  openGraph: {
    title,
    description,
    url: absUrl('/ayuda'),
    siteName: brand.brand_name,
    images: [{ url: brand.og_image, width: 1200, height: 630 }],
    locale: brand.lang,
    type: 'website',
  },
};

export default function AyudaPage() {
  const jsonLd = [
    breadcrumbSchema([
      { name: 'Inicio', path: '/' },
      { name: 'Centro de ayuda', path: '/ayuda' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Curso de TurnosPro',
      itemListElement: LECCIONES.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/ayuda/${l.slug}`), name: l.titulo })),
    },
  ];
  return (
    <ContentShell>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <CourseIndex />
    </ContentShell>
  );
}
