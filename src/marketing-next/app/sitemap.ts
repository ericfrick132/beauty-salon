import { brand } from '@/app/(lib)/brand';

export default function sitemap() {
  const base = brand.brand_domain;
  const pages = ['', brand.marketing_path];
  return pages.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p === brand.marketing_path ? 1.0 : 0.9,
  }));
}

