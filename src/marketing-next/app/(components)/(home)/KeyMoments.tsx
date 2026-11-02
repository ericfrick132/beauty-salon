'use client';
import { Box, Typography } from '@mui/material';
import { Accent, Section, SectionHead, Wrap, home, sans } from './ui';

/**
 * "Así se ve por dentro" (cards #22 y #33): capturas reales de TurnosPro (demos con datos de
 * ejemplo) en grande, en collage con fotos reales de personas del rubro (Unsplash, créditos en
 * public/media/CREDITOS.txt). Sin testimonios: las fotos ilustran, no hablan.
 */
type Shot = { src: string; alt: string; caption: string; w: number; h: number };

const AGENDA: Shot = {
  src: '/media/captura-agenda-v1.jpg',
  alt: 'Panel de inicio de TurnosPro con los turnos de hoy, los ingresos del día y las confirmaciones del bot de WhatsApp',
  caption: 'Abrís el panel y ves los turnos de hoy, lo que ingresó y cuántos confirmó el bot por WhatsApp.',
  w: 1440,
  h: 900,
};
const SENA: Shot = {
  src: '/media/captura-sena-v1.jpg',
  alt: 'Nueva reserva en TurnosPro: el servicio pide seña y al cliente le llega el link de Mercado Pago',
  caption: 'Si el servicio pide seña, al cliente le llega el link de Mercado Pago.',
  w: 1440,
  h: 900,
};
const RESERVA: Shot = {
  src: '/media/captura-reserva-v1.jpg',
  alt: 'Página de reservas de TurnosPro en el celular: el cliente elige con qué profesional atenderse',
  caption: 'Tu cliente elige servicio, profesional y horario desde tu link.',
  w: 390,
  h: 844,
};

const PEOPLE = {
  duena: { src: '/media/duena-peluqueria-v1.jpg', alt: 'Dueña de una peluquería sonriendo en su local, sentada frente al espejo', w: 1600, h: 1068 },
  estilista: { src: '/media/estilista-v1.jpg', alt: 'Estilista en su salón de belleza, sentada junto a su puesto de trabajo', w: 1600, h: 1066 },
  barbero: { src: '/media/barbero-v1.jpg', alt: 'Barbero parado en su barbería, con delantal, listo para atender', w: 1600, h: 1066 },
};

const frameSx = {
  m: 0,
  borderRadius: home.radius,
  overflow: 'hidden',
  bgcolor: home.cardAlt,
  border: `1px solid ${home.line}`,
  boxShadow: home.shadow,
};

const imgSx = { display: 'block', width: '100%', height: '100%', objectFit: 'cover' as const };

function Capture({ shot, contain = false }: { shot: Shot; contain?: boolean }) {
  return (
    <Box component="figure" sx={{ m: 0, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ ...frameSx, flex: 1, ...(contain ? { display: 'grid', placeItems: 'center', py: { xs: 2, md: 3 } } : {}) }}>
        <Box
          component="img"
          src={shot.src}
          alt={shot.alt}
          width={shot.w}
          height={shot.h}
          loading="lazy"
          decoding="async"
          sx={contain ? { display: 'block', width: 'auto', maxWidth: '78%', height: 'auto', maxHeight: 520, borderRadius: '18px', boxShadow: home.shadow } : { ...imgSx, objectPosition: 'top left' }}
        />
      </Box>
      <Box component="figcaption" sx={{ fontFamily: sans, fontSize: { xs: '0.95rem', md: '1rem' }, color: home.inkSoft, lineHeight: 1.45, px: 0.5 }}>
        {shot.caption}
      </Box>
    </Box>
  );
}

function Person({ p, minH }: { p: (typeof PEOPLE)[keyof typeof PEOPLE]; minH: object }) {
  return (
    <Box sx={{ ...frameSx, minHeight: minH, position: 'relative' }}>
      <Box component="img" src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" sx={{ ...imgSx, position: 'absolute', inset: 0 }} />
    </Box>
  );
}

export default function KeyMoments() {
  return (
    <Section id="por-dentro">
      <Wrap>
        <SectionHead
          title={<>Así se ve <Accent>por dentro.</Accent></>}
          line="Capturas reales de TurnosPro, con datos de ejemplo. Lo mismo que vas a usar vos."
        />
        <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 } }}>
          {/* Fila 1: agenda grande + dueña de peluquería. */}
          <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '1.45fr 0.85fr' }, alignItems: 'stretch' }}>
            <Capture shot={AGENDA} />
            <Person p={PEOPLE.duena} minH={{ xs: 260, md: 'auto' }} />
          </Box>
          {/* Fila 2: estilista + seña por Mercado Pago. */}
          <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.45fr' }, alignItems: 'stretch' }}>
            <Person p={PEOPLE.estilista} minH={{ xs: 260, md: 'auto' }} />
            <Capture shot={SENA} />
          </Box>
          {/* Fila 3: la reserva desde el celular + barbero. */}
          <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.4fr' }, alignItems: 'stretch' }}>
            <Capture shot={RESERVA} contain />
            <Person p={PEOPLE.barbero} minH={{ xs: 260, md: 440 }} />
          </Box>
        </Box>
        <Typography sx={{ mt: 2, fontFamily: sans, fontSize: '0.75rem', color: home.inkMute }}>
          Fotos de personas: Unsplash.
        </Typography>
      </Wrap>
    </Section>
  );
}
