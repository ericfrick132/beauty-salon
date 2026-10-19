/**
 * Prueba social REAL para /login y /register (y el login de cada negocio).
 *
 * Lee GET /api/public/stats (PublicStatsController: contadores agregados de toda la plataforma,
 * caché de 10 min en el backend, sin datos personales). Regla: nunca un número inventado — si el
 * endpoint falla o el número es bajo (< MIN_TO_SHOW) se muestra un texto sin cifra.
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SpaOutlinedIcon from '@mui/icons-material/SpaOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import api from '../../services/api';

interface PublicStats {
  bookingsLast7Days: number;
  bookingsLast30Days: number;
  activeBusinessesLast30Days: number;
}

const MIN_TO_SHOW = 20;

const tokens = {
  card: '#FBF8F2',
  line: 'rgba(23, 20, 16, 0.10)',
  ink: '#171410',
  inkSoft: '#5C5347',
  paper: '#F4EFE6',
  forest: '#1E5E3F',
  coral: '#E8593C',
  amber: '#F4C038',
  sans: '"Inter", "Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

let statsPromise: Promise<PublicStats | null> | null = null;
function fetchStats(): Promise<PublicStats | null> {
  if (!statsPromise) {
    statsPromise = api
      .get('/public/stats')
      .then((r) => (r.data && typeof r.data.bookingsLast7Days === 'number' ? (r.data as PublicStats) : null))
      .catch(() => null);
  }
  return statsPromise;
}

function usePublicStats(): PublicStats | null {
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

// Íconos de rubro — nada de fotos genéricas de "clientes".
const RUBROS = [
  { Icon: ContentCutIcon, bg: tokens.forest, fg: tokens.paper, label: 'Peluquerías' },
  { Icon: FaceRetouchingNaturalIcon, bg: tokens.coral, fg: tokens.paper, label: 'Barberías' },
  { Icon: SpaOutlinedIcon, bg: tokens.amber, fg: tokens.ink, label: 'Estética' },
  { Icon: MedicalServicesOutlinedIcon, bg: tokens.ink, fg: tokens.paper, label: 'Consultorios' },
];

export const RubroIcons: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto' }} aria-hidden>
    {RUBROS.map(({ Icon, bg, fg, label }, i) => (
      <Box
        key={label}
        title={label}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          bgcolor: bg,
          color: fg,
          border: `2px solid ${tokens.paper}`,
          ml: i === 0 ? 0 : `-${Math.round(size / 3.5)}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sx={{ fontSize: size * 0.52 }} />
      </Box>
    ))}
  </Box>
);

/** Card debajo del formulario: contador real + "Usado por…". */
export const AuthSocialProof: React.FC = () => {
  const s = usePublicStats();

  let headline = 'Tus clientes reservan solos, a cualquier hora.';
  if (s && s.bookingsLast7Days >= MIN_TO_SHOW) headline = `${fmt(s.bookingsLast7Days)} turnos reservados con TurnosPro en los últimos 7 días.`;
  else if (s && s.bookingsLast30Days >= MIN_TO_SHOW) headline = `${fmt(s.bookingsLast30Days)} turnos reservados con TurnosPro en los últimos 30 días.`;

  const usedBy =
    s && s.activeBusinessesLast30Days >= MIN_TO_SHOW
      ? `Usado por ${fmt(s.activeBusinessesLast30Days)} negocios que recibieron reservas en los últimos 30 días`
      : 'Usado por peluquerías, barberías, centros de estética y consultorios';

  return (
    <Box sx={{ bgcolor: tokens.card, borderRadius: '24px', border: `1px solid ${tokens.line}`, p: { xs: 2.5, sm: 3 } }}>
      <Typography sx={{ fontFamily: tokens.sans, fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em', color: tokens.ink, lineHeight: 1.35 }}>
        {headline}
      </Typography>
      <Typography sx={{ mt: 0.75, fontFamily: tokens.sans, fontSize: 14, color: tokens.inkSoft, lineHeight: 1.5 }}>
        Plan Gratuito para siempre: $0 por mes, sin tarjeta. Pasate de plan cuando lo necesites.
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <RubroIcons size={28} />
        <Typography sx={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.inkSoft, lineHeight: 1.35 }}>{usedBy}</Typography>
      </Box>
    </Box>
  );
};

/**
 * Testimonios REALES de negocios que usan TurnosPro. Vacío = no se renderiza.
 * Cargar solo con autorización del negocio (nombre real, rubro, frase textual, foto/logo propio).
 * Nunca fotos de stock, pravatar ni randomuser.
 */
export interface RealTestimonial {
  quote: string;
  name: string;
  business: string;
  imageUrl?: string;
}

export const REAL_TESTIMONIALS: RealTestimonial[] = [];

export const AuthTestimonial: React.FC = () => {
  if (REAL_TESTIMONIALS.length === 0) return null;
  const t = REAL_TESTIMONIALS[0];
  return (
    <Box component="figure" sx={{ m: 0, bgcolor: tokens.card, borderRadius: '24px', border: `1px solid ${tokens.line}`, p: { xs: 2.5, sm: 3 } }}>
      <Typography component="blockquote" sx={{ m: 0, fontFamily: tokens.sans, fontSize: 15, color: tokens.ink, lineHeight: 1.5 }}>
        “{t.quote}”
      </Typography>
      <Box component="figcaption" sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {t.imageUrl && <Box component="img" src={t.imageUrl} alt={t.business} sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
        <Typography sx={{ fontFamily: tokens.sans, fontSize: 13, color: tokens.inkSoft }}>
          <Box component="span" sx={{ color: tokens.ink, fontWeight: 600 }}>{t.name}</Box> · {t.business}
        </Typography>
      </Box>
    </Box>
  );
};
