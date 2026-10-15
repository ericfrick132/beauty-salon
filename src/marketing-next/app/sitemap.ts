import type { MetadataRoute } from 'next';
import { brand } from '@/app/(lib)/brand';
import { verticals } from '@/app/(lib)/verticals';
import { MARKET_COUNTRY_LIST } from '@/app/(lib)/countries';

// /turnos queda afuera a propósito: es duplicado de la home (canonical '/', noindex).
// /blog tampoco va acá: lo sirve el backend con su propio sitemap (/blog/sitemap.xml, listado en robots.txt).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.brand_domain;
  const now = new Date();

  // Home de Argentina + versiones por país (/uy, /mx, /es) con hreflang recíproco.
  const languages: Record<string, string> = {
    'es-AR': `${base}/`,
    ...Object.fromEntries(MARKET_COUNTRY_LIST.map((c) => [c.hreflang, `${base}${c.path}`])),
    'x-default': `${base}/`,
  };
  const home: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0, alternates: { languages } },
  ];

  const countryPages: MetadataRoute.Sitemap = MARKET_COUNTRY_LIST.map((c) => ({
    url: `${base}${c.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: { languages },
  }));

  const verticalPages: MetadataRoute.Sitemap = verticals.map((v) => ({
    url: `${base}${v.path}`,
    lastModified: new Date(v.dateModified),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const legal: MetadataRoute.Sitemap = ['/privacidad', '/terminos'].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date('2026-06-04'),
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  const demos: MetadataRoute.Sitemap = ['/demo-admin', '/demo-app'].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date('2026-09-14'),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...home, ...countryPages, ...verticalPages, ...demos, ...legal];
}
