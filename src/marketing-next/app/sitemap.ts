import type { MetadataRoute } from 'next';
import { brand } from '@/app/(lib)/brand';
import { verticals } from '@/app/(lib)/verticals';

// /turnos queda afuera a propósito: es duplicado de la home (canonical '/', noindex).
// /blog tampoco va acá: lo sirve el backend con su propio sitemap (/blog/sitemap.xml, listado en robots.txt).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.brand_domain;
  const now = new Date();

  const home: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
  ];

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

  return [...home, ...verticalPages, ...legal];
}
