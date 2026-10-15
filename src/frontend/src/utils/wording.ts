/**
 * Cómo se le habla al usuario según el país del negocio. Espejo de Utilities/Wording.cs del backend.
 *
 * El copy original está en voseo rioplatense y así sigue para Argentina y Uruguay: el texto voseo se
 * devuelve tal cual (Argentina se ve exactamente igual que antes). México y España se tutean y cambian
 * algunas palabras: "turno" → "cita", "seña" → "anticipo" (MX) / "señal" (ES), "celular" → "móvil" (ES).
 *
 * Uso: `const w = useTenantWording(); w.t('Elegí un horario', 'Elige un horario')`. Si México y España
 * dicen distinto: `w.pick('Pagá la seña', 'Paga el anticipo', 'Paga la señal')`. No es un i18n completo:
 * cada texto lleva sus variantes al lado.
 */
import { useMemo } from 'react';
import { useTenantOptional } from '../contexts/TenantContext';
import { CountryCode, getCountry } from './intl';

export interface Wording {
  country: CountryCode;
  /** México y España: tú en lugar de vos. */
  usesTu: boolean;
  /** Voseo (AR/UY, sin cambios) o tú (MX/ES). */
  t: (voseo: string, tu: string) => string;
  /** Voseo (AR/UY) o la variante de México o la de España. */
  pick: (voseo: string, mexico: string, spain: string) => string;
  /** "turno" / "cita". */
  turno: string;
  /** "Turno" / "Cita". */
  Turno: string;
  /** "turnos" / "citas". */
  turnos: string;
  /** "Turnos" / "Citas". */
  Turnos: string;
  /** "seña" / "anticipo" / "señal". */
  sena: string;
  /** "Seña" / "Anticipo" / "Señal". */
  Sena: string;
  /** "celular" / "móvil". */
  celular: string;
  /** "Celular" / "Móvil". */
  Celular: string;
}

const cache = new Map<CountryCode, Wording>();

export const getWording = (country?: string | null): Wording => {
  const code = getCountry(country).code;
  const hit = cache.get(code);
  if (hit) return hit;
  const usesTu = code === 'MX' || code === 'ES';
  const sena = code === 'MX' ? 'anticipo' : code === 'ES' ? 'señal' : 'seña';
  const celular = code === 'ES' ? 'móvil' : 'celular';
  const w: Wording = {
    country: code,
    usesTu,
    t: (voseo, tu) => (usesTu ? tu : voseo),
    pick: (voseo, mexico, spain) => (code === 'MX' ? mexico : code === 'ES' ? spain : voseo),
    turno: usesTu ? 'cita' : 'turno',
    Turno: usesTu ? 'Cita' : 'Turno',
    turnos: usesTu ? 'citas' : 'turnos',
    Turnos: usesTu ? 'Citas' : 'Turnos',
    sena,
    Sena: sena.charAt(0).toUpperCase() + sena.slice(1),
    celular,
    Celular: celular.charAt(0).toUpperCase() + celular.slice(1),
  };
  cache.set(code, w);
  return w;
};

/** Wording del negocio actual (TenantContext). Sin config = Argentina. */
export const useTenantWording = (): Wording => {
  const country = useTenantOptional()?.config?.country;
  return useMemo(() => getWording(country), [country]);
};

export default getWording;
