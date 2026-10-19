/**
 * AuthShell — layout de /login y /register (y login, recuperar y restablecer contraseña de cada negocio).
 *
 * Estilo Ascend, igual que la home nueva: fondo crema, logo arriba, el formulario en una card blanca
 * con radio grande y, debajo, una card con la prueba social REAL (GET /api/public/stats) y la fila de
 * íconos "Usado por…". Títulos Inter sin itálicas. Sin testimonios inventados ni fotos de stock:
 * los testimonios reales se cargan en REAL_TESTIMONIALS (AuthSocialProof.tsx); vacío = no se ve.
 *
 * Desktop: dos columnas (formulario a la izquierda, prueba social a la derecha).
 * Mobile: una columna, la prueba social debajo del formulario. Gutter de 16px.
 */

import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { AuthSocialProof, AuthTestimonial } from './AuthSocialProof';

// Paleta de TurnosPro (la misma de la landing): crema + verde + coral.
const palette = {
  paper: '#F4EFE6',
  paperDeep: '#EDE5D5',
  card: '#FFFFFF',
  ink: '#171410',
  inkSoft: '#5C5347',
  inkFaint: '#8C8275',
  rule: 'rgba(23, 20, 16, 0.10)',
  primary: '#1E5E3F',
  primaryDeep: '#174A32',
  secondary: '#E8593C',
  overlay: 'rgba(23, 20, 16, 0.55)',
  star: '#E8B94A',
};

const fonts = {
  // "display" quedó en Inter: los títulos van sans, con tracking negativo y sin itálicas.
  display: '"Inter", "Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  body: '"Inter", "Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
};

const FONT_HREFS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
];

function ensureFontsLoaded() {
  if (typeof document === 'undefined') return;
  for (const href of FONT_HREFS) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

/** Logo de TurnosPro: cuadrado oscuro con la T y el punto coral + wordmark. */
const Logo: React.FC = () => (
  <Box
    component="a"
    href="/"
    aria-label="TurnosPro"
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}
  >
    <Box component="svg" aria-hidden viewBox="0 0 38 38" sx={{ width: 30, height: 30 }}>
      <rect x="2" y="2" width="34" height="34" rx="8" fill={palette.ink} />
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontFamily='"Fraunces", Georgia, serif' fontWeight="600" fontSize="22" fill="#F4C038">
        T
      </text>
      <circle cx="29" cy="28" r="2.5" fill={palette.secondary} />
    </Box>
    <Box component="span" sx={{ fontFamily: fonts.display, fontWeight: 650, fontSize: 19, letterSpacing: '-0.035em', color: palette.ink }}>
      Turnos<Box component="span" sx={{ color: palette.secondary }}>Pro</Box>
    </Box>
  </Box>
);

interface AuthShellProps {
  /** Contenido del formulario. */
  children: React.ReactNode;
  /** Ancho máximo de la card del formulario. */
  rightPanelMaxWidth?: number;
}

const AuthShell: React.FC<AuthShellProps> = ({ children, rightPanelMaxWidth = 460 }) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  const rise = (delay: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
        };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: palette.paper,
        fontFamily: fonts.body,
        color: palette.ink,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Barra superior: logo */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 1, width: '100%', maxWidth: 1080, mx: 'auto' }}>
        <Logo />
      </Box>

      <Box
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 1080,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, md: 6 },
          display: 'grid',
          gap: { xs: 2, md: 5 },
          gridTemplateColumns: { xs: '1fr', md: `minmax(0, ${rightPanelMaxWidth + 80}px) minmax(0, 380px)` },
          justifyContent: 'center',
          alignItems: 'start',
        }}
      >
        {/* Formulario en card */}
        <Box
          component={motion.div}
          {...rise(0.05)}
          sx={{
            backgroundColor: palette.card,
            borderRadius: '24px',
            border: `1px solid ${palette.rule}`,
            boxShadow: '0 1px 2px rgba(23,20,16,0.04), 0 18px 40px -18px rgba(23,20,16,0.18)',
            p: { xs: 2.5, sm: 4, md: 5 },
            width: '100%',
            minWidth: 0,
          }}
        >
          <Box sx={{ maxWidth: rightPanelMaxWidth, mx: 'auto' }}>{children}</Box>
        </Box>

        {/* Prueba social real (+ testimonio real cuando exista) */}
        <Box component={motion.div} {...rise(0.15)} sx={{ display: 'grid', gap: 2, minWidth: 0, position: { md: 'sticky' }, top: { md: 32 } }}>
          <AuthSocialProof />
          <AuthTestimonial />
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 3,
          width: '100%',
          maxWidth: 1080,
          mx: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ fontFamily: fonts.body, fontSize: 13, color: palette.inkFaint }}>© TurnosPro {new Date().getFullYear()}</Typography>
        <Typography sx={{ fontFamily: fonts.body, fontSize: 13, color: palette.inkFaint }}>Hecho en Buenos Aires</Typography>
      </Box>
    </Box>
  );
};

export default AuthShell;

// Tokens compartidos para que Login/Register usen los mismos valores.
export const authPalette = palette;
export const authFonts = fonts;
