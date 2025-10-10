import { brand } from '@/app/(lib)/brand';

export default function robots() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    rules: isProd ? [{ userAgent: '*', allow: '/' }] : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${brand.brand_domain}/sitemap.xml`,
  };
}

