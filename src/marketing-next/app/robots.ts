import { brand } from '@/app/(lib)/brand';

export default function robots() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    rules: isProd ? [{ userAgent: '*', allow: '/' }] : [{ userAgent: '*', disallow: '/' }],
    // El blog central lo sirve el backend (/blog) con su propio sitemap.
    sitemap: [`${brand.brand_domain}/sitemap.xml`, `${brand.brand_domain}/blog/sitemap.xml`],
  };
}

