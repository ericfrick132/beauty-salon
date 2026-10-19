'use client';
import { useEffect, useState } from 'react';
import { apiUrl } from '@/app/(lib)/countries';

/**
 * Prueba social real: GET /api/public/stats (PublicStatsController, caché de 10 min en el backend).
 * Contadores agregados de toda la plataforma, sin datos personales.
 *
 * Regla: nunca un número inventado. Si el endpoint falla o el número es bajo (< MIN_TO_SHOW),
 * se muestra un texto sin cifra.
 */
export interface PublicStats {
  bookingsLast7Days: number;
  bookingsLast30Days: number;
  activeBusinessesLast30Days: number;
}

export const MIN_TO_SHOW = 20;

let cache: Promise<PublicStats | null> | null = null;

function fetchStats(): Promise<PublicStats | null> {
  if (!cache) {
    cache = fetch(apiUrl('/public/stats'), { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        d && typeof d.bookingsLast7Days === 'number'
          ? {
              bookingsLast7Days: d.bookingsLast7Days,
              bookingsLast30Days: d.bookingsLast30Days ?? 0,
              activeBusinessesLast30Days: d.activeBusinessesLast30Days ?? 0,
            }
          : null,
      )
      .catch(() => null);
  }
  return cache;
}

/** null mientras carga o si falló: los componentes muestran el texto sin número. */
export function usePublicStats(): PublicStats | null {
  const [stats, setStats] = useState<PublicStats | null>(null);
  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}

const fmt = (n: number) => n.toLocaleString('es-AR');

export interface SocialProofCopy {
  /** Texto principal (con número solo si es real y >= MIN_TO_SHOW). */
  text: string;
  /** true si el texto lleva un número del endpoint. */
  hasNumber: boolean;
}

/** Píldora del hero: prioriza turnos de la semana; si son pocos, negocios activos; si no, sin número. */
export function heroProofCopy(s: PublicStats | null): SocialProofCopy {
  if (s && s.bookingsLast7Days >= MIN_TO_SHOW)
    return { text: `${fmt(s.bookingsLast7Days)} turnos reservados con TurnosPro en los últimos 7 días`, hasNumber: true };
  if (s && s.bookingsLast30Days >= MIN_TO_SHOW)
    return { text: `${fmt(s.bookingsLast30Days)} turnos reservados en los últimos 30 días`, hasNumber: true };
  if (s && s.activeBusinessesLast30Days >= MIN_TO_SHOW)
    return { text: `${fmt(s.activeBusinessesLast30Days)} negocios recibieron turnos en los últimos 30 días`, hasNumber: true };
  return { text: 'Peluquerías, barberías, estética y consultorios ya reservan con TurnosPro', hasNumber: false };
}

/** Tarjeta del login/registro: "Usado por..." */
export function usedByCopy(s: PublicStats | null): SocialProofCopy {
  if (s && s.activeBusinessesLast30Days >= MIN_TO_SHOW)
    return { text: `Usado por ${fmt(s.activeBusinessesLast30Days)} negocios que recibieron reservas en los últimos 30 días`, hasNumber: true };
  return { text: 'Usado por peluquerías, barberías, centros de estética y consultorios', hasNumber: false };
}
