import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { brand } from '@/app/(lib)/brand';
import { pageAlternates, absUrl } from '@/app/(lib)/seo';
import { breadcrumbSchema } from '@/app/(lib)/schema';
import { LECCIONES, leccionPorSlug } from '@/app/(lib)/curso';
import ContentShell from '@/app/(components)/(content)/ContentShell';
import LessonView from '@/app/(components)/(curso)/LessonView';

export const dynamicParams = false;

export function generateStaticParams() {
  return LECCIONES.map((l) => ({ slug: l.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const l = leccionPorSlug(params.slug);
  if (!l) return {};
  const path = `/ayuda/${l.slug}`;
  const title = `${l.titulo} | Centro de ayuda de TurnosPro`;
  return {
    title,
    description: l.descripcion,
    alternates: pageAlternates(path),
    openGraph: {
      title,
      description: l.descripcion,
      url: absUrl(path),
      siteName: brand.brand_name,
      images: [{ url: brand.og_image, width: 1200, height: 630 }],
      locale: brand.lang,
      type: 'article',
    },
  };
}

/** "1:05" → "PT1M5S" */
function isoDuration(d: string) {
  const [m, s] = d.split(':').map((x) => parseInt(x, 10) || 0);
  return `PT${m}M${s}S`;
}

export default function LeccionPage({ params }: { params: { slug: string } }) {
  const l = leccionPorSlug(params.slug);
  if (!l) notFound();
  const path = `/ayuda/${l.slug}`;
  const video = l.video
    ? {
        '@type': 'VideoObject',
        name: l.titulo,
        description: l.descripcion,
        thumbnailUrl: [absUrl(`/ayuda/${l.slug}.jpg`)],
        contentUrl: absUrl(`/ayuda/${l.slug}.mp4`),
        duration: isoDuration(l.video.duracion),
        // Cuando se suban los videos, cambiar por la fecha real de publicación.
        uploadDate: '2026-11-01',
      }
    : undefined;
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: l.titulo,
    description: l.descripcion,
    inLanguage: brand.lang,
    ...(l.video ? { totalTime: isoDuration(l.video.duracion), video } : {}),
    step: l.pasos.map((p, i) => ({ '@type': 'HowToStep', position: i + 1, text: p, url: `${absUrl(path)}#paso-${i + 1}` })),
  };
  const jsonLd = [
    howTo,
    breadcrumbSchema([
      { name: 'Inicio', path: '/' },
      { name: 'Centro de ayuda', path: '/ayuda' },
      { name: l.titulo, path },
    ]),
  ];
  return (
    <ContentShell>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <LessonView slug={l.slug} />
    </ContentShell>
  );
}
