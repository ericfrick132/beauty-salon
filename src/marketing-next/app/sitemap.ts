import type { MetadataRoute } from 'next';
import { brand } from '@/app/(lib)/brand';
import { verticals } from '@/app/(lib)/verticals';
import { blogArticles } from '@/app/(lib)/blog';

// /turnos queda afuera a propósito: es duplicado de la home (canonical '/', noindex).
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

  const guias: MetadataRoute.Sitemap = [
    { url: `${base}/guias`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    ...blogArticles.map((a) => ({
      url: `${base}${a.path}`,
      lastModified: new Date(a.dateModified),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  const legal: MetadataRoute.Sitemap = ['/privacidad', '/terminos'].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date('2026-06-04'),
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [...home, ...verticalPages, ...guias, ...legal];
}
