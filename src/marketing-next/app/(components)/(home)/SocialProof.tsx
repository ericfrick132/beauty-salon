'use client';
import { Box, Typography } from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SpaOutlinedIcon from '@mui/icons-material/SpaOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import { usePublicStats, heroProofCopy, usedByCopy } from '@/app/(lib)/publicStats';
import { home, sans } from './ui';

// Íconos de rubro (no fotos de "clientes": nada de caras genéricas).
const RUBRO_ICONS = [
  { Icon: ContentCutIcon, bg: home.forest, label: 'Peluquerías' },
  { Icon: FaceRetouchingNaturalIcon, bg: home.coral, label: 'Barberías' },
  { Icon: SpaOutlinedIcon, bg: home.amber, label: 'Estética' },
  { Icon: MedicalServicesOutlinedIcon, bg: home.ink, label: 'Consultorios' },
];

export function RubroIcons({ size = 26 }: { size?: number }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden>
      {RUBRO_ICONS.map(({ Icon, bg, label }, i) => (
        <Box
          key={label}
          title={label}
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            bgcolor: bg,
            color: bg === home.amber ? home.ink : home.paper,
            border: `2px solid ${home.paper}`,
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
}

/** Píldora de prueba social arriba del H1: íconos + contador real (o texto sin número). */
export function ProofPill() {
  const stats = usePublicStats();
  const copy = heroProofCopy(stats);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        pl: 0.75,
        pr: 1.75,
        py: 0.6,
        borderRadius: 999,
        bgcolor: home.card,
        border: `1px solid ${home.line}`,
        boxShadow: '0 1px 2px rgba(23,20,16,0.05)',
        maxWidth: '100%',
      }}
    >
      <RubroIcons size={24} />
      <Typography
        component="span"
        aria-live="polite"
        sx={{ fontFamily: sans, fontSize: { xs: '0.8rem', sm: '0.88rem' }, fontWeight: 500, color: home.ink, letterSpacing: '-0.01em', lineHeight: 1.3, textAlign: 'left' }}
      >
        {copy.text}
      </Typography>
    </Box>
  );
}

/** Card de prueba social debajo del formulario de alta. */
export function ProofCard() {
  const stats = usePublicStats();
  const hero = heroProofCopy(stats);
  const usedBy = usedByCopy(stats);
  return (
    <Box sx={{ bgcolor: home.card, borderRadius: home.radius, border: `1px solid ${home.line}`, p: { xs: 2.5, sm: 3 } }}>
      <Typography sx={{ fontFamily: sans, fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.02em', color: home.ink, lineHeight: 1.35 }}>
        {hero.hasNumber ? hero.text : 'Tus clientes reservan solos, a cualquier hora.'}
      </Typography>
      <Typography sx={{ mt: 0.75, fontFamily: sans, fontSize: '0.92rem', color: home.inkSoft, lineHeight: 1.5 }}>
        Plan Gratuito para siempre: $0 por mes, sin tarjeta. Pasate de plan cuando lo necesites.
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <RubroIcons size={28} />
        <Typography sx={{ fontFamily: sans, fontSize: '0.85rem', color: home.inkSoft, lineHeight: 1.35 }}>{usedBy.text}</Typography>
      </Box>
    </Box>
  );
}

/**
 * Testimonios REALES de negocios que usan TurnosPro. Vacío = no se renderiza.
 * Cargar solo con autorización del negocio: nombre real, rubro, frase textual y (opcional) foto propia
 * o logo del negocio. Nunca fotos de stock ni de randomuser/pravatar.
 */
export interface RealTestimonial {
  quote: string;
  name: string;
  business: string;
  /** Logo o foto real del negocio (opcional). */
  imageUrl?: string;
  /** Link público del negocio (su /book o Instagram), opcional. */
  url?: string;
}

export const REAL_TESTIMONIALS: RealTestimonial[] = [];

export function RealTestimonials() {
  if (REAL_TESTIMONIALS.length === 0) return null;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(3, REAL_TESTIMONIALS.length)}, 1fr)` } }}>
      {REAL_TESTIMONIALS.map((t) => (
        <Box key={t.name + t.business} component="figure" sx={{ m: 0, bgcolor: home.card, borderRadius: home.radius, border: `1px solid ${home.line}`, p: 3 }}>
          <Typography component="blockquote" sx={{ m: 0, fontFamily: sans, fontSize: '1.05rem', color: home.ink, lineHeight: 1.5 }}>
            “{t.quote}”
          </Typography>
          <Box component="figcaption" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {t.imageUrl && <Box component="img" src={t.imageUrl} alt={t.business} sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
            <Box sx={{ fontFamily: sans, fontSize: '0.88rem', color: home.inkSoft }}>
              <Box component="span" sx={{ color: home.ink, fontWeight: 600 }}>{t.name}</Box> · {t.url ? <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{t.business}</a> : t.business}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
