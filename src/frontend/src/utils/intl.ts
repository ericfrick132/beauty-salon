/**
 * Países soportados y formato de montos/fechas por país del negocio.
 * Espejo de CountryProfile del backend. Sin país = Argentina, y ARS se ve igual que siempre.
 */

export type CountryCode = 'AR' | 'UY' | 'MX' | 'ES';

export interface CountryProfile {
  code: CountryCode;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  timezone: string;
  locale: string;
  documentLabel: string;
  phonePlaceholder: string;
  arcaInvoicing: boolean;
  chytapay: boolean;
  transferDetection: boolean;
  /** Cómo se conecta Mercado Pago: OAuth (AR), pegando credenciales (UY/MX) o no hay (ES). */
  mercadoPagoConnect: MercadoPagoConnectMode;
  /** Señas con Stripe Connect (ES). */
  stripeDeposits: boolean;
  /** Con qué cobra la plataforma la suscripción. */
  platformBilling: 'mercadopago' | 'stripe';
  /** Moneda de la suscripción a la plataforma (UY en USD). */
  platformCurrency: string;
}

export type MercadoPagoConnectMode = 'oauth' | 'credentials' | 'none';

export const COUNTRIES: CountryProfile[] = [
  {
    code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '54', currency: 'ARS',
    timezone: 'America/Argentina/Buenos_Aires', locale: 'es-AR', documentLabel: 'DNI',
    phonePlaceholder: '11 2345 6789', arcaInvoicing: true, chytapay: true, transferDetection: true,
    mercadoPagoConnect: 'oauth', stripeDeposits: false, platformBilling: 'mercadopago', platformCurrency: 'ARS',
  },
  {
    code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '598', currency: 'UYU',
    timezone: 'America/Montevideo', locale: 'es-UY', documentLabel: 'CI',
    phonePlaceholder: '94 123 456', arcaInvoicing: false, chytapay: false, transferDetection: false,
    mercadoPagoConnect: 'credentials', stripeDeposits: false, platformBilling: 'stripe', platformCurrency: 'USD',
  },
  {
    code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '52', currency: 'MXN',
    timezone: 'America/Mexico_City', locale: 'es-MX', documentLabel: 'CURP',
    phonePlaceholder: '55 1234 5678', arcaInvoicing: false, chytapay: false, transferDetection: false,
    mercadoPagoConnect: 'credentials', stripeDeposits: false, platformBilling: 'stripe', platformCurrency: 'MXN',
  },
  {
    code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '34', currency: 'EUR',
    timezone: 'Europe/Madrid', locale: 'es-ES', documentLabel: 'DNI/NIE',
    phonePlaceholder: '612 34 56 78', arcaInvoicing: false, chytapay: false, transferDetection: false,
    mercadoPagoConnect: 'none', stripeDeposits: true, platformBilling: 'stripe', platformCurrency: 'EUR',
  },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export const getCountry = (code?: string | null): CountryProfile =>
  COUNTRIES.find((c) => c.code === (code || '').toUpperCase()) || DEFAULT_COUNTRY;

/** País por el código de discado de un teléfono ("+598 94..." → UY). */
export const countryFromPhone = (phone?: string | null): CountryProfile | null => {
  const raw = (phone || '').trim();
  if (!raw.startsWith('+') && !raw.startsWith('00')) return null;
  const digits = raw.replace(/\D/g, '').replace(/^00/, '');
  return [...COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => digits.startsWith(c.dialCode)) || null;
};

/** Zonas horarias que ofrece Configuración (IANA). */
export const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Cancun', label: 'México (Cancún)' },
  { value: 'America/Tijuana', label: 'México (Tijuana)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'Atlantic/Canary', label: 'España (Canarias)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { value: 'America/La_Paz', label: 'Bolivia (La Paz)' },
  { value: 'America/Lima', label: 'Perú (Lima)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Guayaquil', label: 'Ecuador (Guayaquil)' },
  { value: 'America/Caracas', label: 'Venezuela (Caracas)' },
  { value: 'America/New_York', label: 'Estados Unidos (Este)' },
  { value: 'America/Los_Angeles', label: 'Estados Unidos (Oeste)' },
  { value: 'Europe/London', label: 'Reino Unido (Londres)' },
];

const LEGACY_OFFSETS: Record<string, string> = {
  '-8': 'America/Los_Angeles',
  '-6': 'America/Mexico_City',
  '-5': 'America/Bogota',
  '-4': 'America/La_Paz',
  '-3': 'America/Argentina/Buenos_Aires',
  '-2': 'America/Noronha',
  '0': 'Europe/London',
  '+0': 'Europe/London',
  '1': 'Europe/Madrid',
  '+1': 'Europe/Madrid',
  '2': 'Europe/Athens',
  '+2': 'Europe/Athens',
};

/** Zona guardada (IANA o el offset viejo "-3") → IANA. Vacío/"UTC" → la del país. */
export const toIanaTimezone = (value?: string | null, country?: string | null): string => {
  const v = (value || '').trim();
  const profile = getCountry(country);
  if (!v || v.toUpperCase() === 'UTC') return profile.timezone;
  if (/^[+-]?\d{1,2}$/.test(v)) {
    if (v === '-3' && (profile.code === 'AR' || profile.code === 'UY')) return profile.timezone;
    return LEGACY_OFFSETS[v] || profile.timezone;
  }
  return v;
};

export const CURRENCIES = [
  { value: 'ARS', label: 'Peso Argentino (ARS)', symbol: '$' },
  { value: 'UYU', label: 'Peso Uruguayo (UYU)', symbol: '$' },
  { value: 'MXN', label: 'Peso Mexicano (MXN)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'USD', label: 'Dólar Americano (USD)', symbol: '$' },
  { value: 'BRL', label: 'Real Brasileño (BRL)', symbol: 'R$' },
  { value: 'CLP', label: 'Peso Chileno (CLP)', symbol: '$' },
  { value: 'COP', label: 'Peso Colombiano (COP)', symbol: '$' },
  { value: 'PEN', label: 'Sol Peruano (PEN)', symbol: 'S/' },
];

const localeForCurrency = (currency: string): string => {
  switch (currency) {
    case 'UYU': return 'es-UY';
    case 'MXN': return 'es-MX';
    case 'EUR': return 'es-ES';
    default: return 'es-AR';
  }
};

export interface FormatMoneyOptions {
  currency?: string | null;
  locale?: string | null;
  /** Decimales máximos (default 0). */
  maximumFractionDigits?: number;
  /**
   * 'plain' = "$15.000" (símbolo pegado, como el panel siempre mostró pesos);
   * 'intl' = Intl.NumberFormat con style currency ("$ 15.000", "15.000 €").
   * Solo afecta a ARS: el resto de las monedas siempre usa Intl, que pone el símbolo donde corresponde.
   */
  variant?: 'plain' | 'intl';
}

/** Monto con la moneda y el locale del negocio. ARS en es-AR sale idéntico a como estaba. */
export const formatMoney = (value: number | null | undefined, opts: FormatMoneyOptions = {}): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  const currency = (opts.currency || 'ARS').toUpperCase();
  const locale = opts.locale || localeForCurrency(currency);
  const maxFD = opts.maximumFractionDigits ?? 0;
  const variant = opts.variant ?? 'plain';

  if (currency === 'ARS' && variant === 'plain') {
    return `$${value.toLocaleString(locale, { maximumFractionDigits: maxFD })}`;
  }

  try {
    const defaultFD = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().minimumFractionDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: Math.min(defaultFD, maxFD),
      maximumFractionDigits: maxFD,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(locale, { maximumFractionDigits: maxFD })}`;
  }
};
