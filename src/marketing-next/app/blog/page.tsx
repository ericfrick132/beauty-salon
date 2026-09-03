import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/app/(lib)/brand';
import { blogArticles } from '@/app/(lib)/blog';
import { verticalLinks } from '@/app/(lib)/vertical-links';
import { pageAlternates } from '@/app/(lib)/seo';
import { breadcrumbSchema } from '@/app/(lib)/schema';
import ContentShell from '@/app/(components)/(content)/ContentShell';
import PageHero from '@/app/(components)/(content)/PageHero';
import Prose from '@/app/(components)/(content)/Prose';
import FinalCta from '@/app/(components)/(sections)/FinalCta';

export const metadata: Metadata = {
  title: 'Blog de TurnosPro: guías sobre turnos online',
  description:
    'Guías y comparativas para elegir y sacarle provecho a un sistema de turnos online en Argentina: señas, WhatsApp, precios y casos por rubro.',
  alternates: pageAlternates('/blog'),
  openGraph: {
    title: 'Blog de TurnosPro: guías sobre turnos online',
    description: 'Guías y comparativas para elegir un sistema de turnos online en Argentina.',
    url: `${brand.brand_domain}/blog`,
    siteName: brand.brand_name,
    images: [{ url: brand.og_image, width: 1200, height: 630 }],
    locale: brand.lang,
    type: 'website',
  },
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogIndexPage() {
  const jsonLd = [
    breadcrumbSchema([
      { name: 'Inicio', path: '/' },
      { name: 'Blog', path: '/blog' },
    ]),
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <ContentShell>
        <PageHero
          number="01"
          label="Blog"
          h1="Guías sobre turnos online para negocios de servicios"
          intro={[
            'Comparativas, criterios y casos por rubro para que elijas bien y le saques el jugo a tu agenda online.',
          ]}
          crumbs={[
            { name: 'Inicio', path: '/' },
            { name: 'Blog', path: '/blog' },
          ]}
        />
        <Prose>
          <section>
            <h2>Artículos</h2>
            <ul>
              {blogArticles.map((a) => (
                <li key={a.path}>
                  <Link href={a.path}>{a.h1}</Link>
                  <br />
                  <span>{a.excerpt}</span>
                  <br />
                  <small>Publicado el {fmtDate(a.datePublished)}</small>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Sistema de turnos por rubro</h2>
            <ul>
              {verticalLinks.map((v) => (
                <li key={v.path}>
                  <Link href={v.path}>Sistema de turnos para {v.label.toLowerCase()}</Link>
                </li>
              ))}
            </ul>
          </section>
        </Prose>
        <FinalCta />
      </ContentShell>
    </>
  );
}
