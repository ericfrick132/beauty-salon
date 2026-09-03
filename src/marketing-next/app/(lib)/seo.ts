import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';

/** URL absoluta a partir de un path relativo ('/', '/guias/...'). */
export function absUrl(path: string) {
  return new URL(path, brand.brand_domain).toString();
}

/**
 * Canonical + hreflang auto-referencial para una página.
 * Next resuelve los paths relativos contra metadataBase (layout.tsx).
 */
export function pageAlternates(path: string): NonNullable<Metadata['alternates']> {
  return {
    canonical: path,
    languages: { [brand.lang]: path },
  };
}
