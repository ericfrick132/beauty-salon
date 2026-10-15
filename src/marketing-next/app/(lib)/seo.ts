import type { Metadata } from 'next';
import { brand } from '@/app/(lib)/brand';

/** URL absoluta a partir de un path relativo ('/', '/terminos'). */
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

/**
 * Canonical auto-referencial + hreflang de la home por país: '/' es Argentina y x-default,
 * '/uy', '/mx' y '/es' las versiones de Uruguay, México y España. Las cuatro URLs llevan el mismo
 * juego de alternates (Google pide que sean recíprocos).
 */
export function countryAlternates(path: '/' | '/uy' | '/mx' | '/es'): NonNullable<Metadata['alternates']> {
  return {
    canonical: path,
    languages: {
      'es-AR': '/',
      'es-UY': '/uy',
      'es-MX': '/mx',
      'es-ES': '/es',
      'x-default': '/',
    },
  };
}
