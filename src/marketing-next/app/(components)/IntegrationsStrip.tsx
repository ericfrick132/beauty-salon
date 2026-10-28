'use client';
import { Box } from '@mui/material';

const font = 'var(--font-inter), var(--font-grotesk), system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

// Con quién trabajamos. Los tres son ciertos (confirmado por Eric 28/10/2026): la línea de WhatsApp usa
// la API oficial de Meta, la infraestructura corre en AWS y estamos en Claude for Startups de Anthropic.
const items = [
  { src: '/integraciones/wordmark-meta.svg', alt: 'Meta', w: 74, title: 'API oficial de WhatsApp', line: 'plataforma de Meta' },
  { src: '/integraciones/wordmark-aws.svg', alt: 'AWS', w: 40, title: 'Infraestructura', line: 'en AWS' },
  { src: '/integraciones/wordmark-claude.svg', alt: 'Claude', w: 74, title: 'Claude for Startups', line: 'programa de Anthropic' },
];

/** Franja de logos arriba del footer (fondo oscuro): logo monocromo, separador y dos líneas de texto. */
export default function IntegrationsStrip() {
  return (
    <Box
      component="ul"
      aria-label="Con quién trabajamos"
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 1.5,
      }}
    >
      {items.map((it) => (
        <Box
          component="li"
          key={it.alt}
          sx={{
            flex: { xs: '1 1 100%', sm: '0 1 auto' },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.75,
            borderRadius: '16px',
            border: '1px solid rgba(244,239,230,0.12)',
            bgcolor: 'rgba(244,239,230,0.04)',
          }}
        >
          <Box
            component="img"
            src={it.src}
            alt={it.alt}
            loading="lazy"
            sx={{ width: it.w, height: 'auto', maxHeight: 26, flex: `0 0 ${it.w}px`, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.92 }}
          />
          <Box aria-hidden sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'rgba(244,239,230,0.16)' }} />
          <Box sx={{ minWidth: 0, fontFamily: font, lineHeight: 1.3 }}>
            <Box sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(244,239,230,0.95)', letterSpacing: '-0.01em' }}>{it.title}</Box>
            <Box sx={{ fontSize: '0.8rem', color: 'rgba(244,239,230,0.55)' }}>{it.line}</Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
