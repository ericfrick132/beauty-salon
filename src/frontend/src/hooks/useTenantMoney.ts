import { useCallback, useMemo } from 'react';
import { useTenantOptional } from '../contexts/TenantContext';
import { CURRENCIES, formatMoney, FormatMoneyOptions, getCountry } from '../utils/intl';

/**
 * Moneda, locale y país del negocio actual + formateador de montos.
 * Sin config (o sin país) = Argentina/ARS/es-AR, que se ve igual que antes.
 */
export const useTenantMoney = () => {
  const config = useTenantOptional()?.config ?? null;
  const country = useMemo(() => getCountry(config?.country), [config?.country]);
  const currency = config?.currency || country.currency;
  const locale = config?.locale || country.locale;
  const features = config?.countryFeatures ?? {
    arcaInvoicing: country.arcaInvoicing,
    chytapay: country.chytapay,
    transferDetection: country.transferDetection,
  };

  /** Monto del negocio (precios, cobros, ventas). Para precios de la plataforma pasar currency: 'ARS'. */
  const format = useCallback(
    (value: number | null | undefined, opts: FormatMoneyOptions = {}) =>
      formatMoney(value, { currency, locale, ...opts }),
    [currency, locale],
  );

  /**
   * Para pantallas que ya mostraban pesos a su manera ("$" + número): en ARS devuelve ese texto tal
   * cual (se ve igual que siempre); en otra moneda formatea con la moneda y el locale del negocio.
   */
  const formatKeepingArs = useCallback(
    (value: number | null | undefined, arsText: string, opts: FormatMoneyOptions = {}) =>
      currency === 'ARS' ? arsText : format(value, opts),
    [currency, format],
  );

  /** Símbolo para adornos de inputs de montos ("$", "€"). */
  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol ?? '$';

  return { formatMoney: format, formatKeepingArs, currency, currencySymbol, locale, country, features };
};

export default useTenantMoney;
