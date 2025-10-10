import { brand } from '@/app/(lib)/brand';

export default function sitemap() {
  const base = brand.brand_domain;
  const pages = ['', brand.marketing_path];
  const now = new Date();
  return pages.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: p === brand.marketing_path ? 1.0 : 0.8,
  }));
}

