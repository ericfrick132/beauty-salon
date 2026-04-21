/**
 * AuthShell — shared split-screen layout for /login and /register.
 *
 * Follows the Harbiz pattern (see onboarding-spec/LOGIN_REGISTER_SPEC.md):
 *   Desktop (>=1024px): 50/50 split. Left = dark photo + TurnosPro logo +
 *   editorial headline + 3 testimonials. Right = form on warm paper.
 *   Mobile (<1024px): left panel dropped entirely; form full-width with a
 *   small colored wordmark top-left.
 *
 * Typography mirrors the landing's "Editorial Agenda" theme:
 *   Fraunces (display serif) / Space Grotesk (body) / JetBrains Mono
 *   (kickers). Fonts are injected into <head> on first mount so this shell
 *   works on the main domain or any tenant subdomain without relying on
 *   CompletarPerfil having run first.
 */

import React, { useEffect } from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';
import {
  authTestimonials,
  authHeadline,
  authSubtitle,
  authBackgroundUrl,
} from '../../config/authTestimonials';

// Landing "Editorial Agenda" palette — forest + coral + warm cream paper.
const palette = {
  paper: '#F4EFE6',
  ink: '#171410',
  inkSoft: '#5C5347',
  inkFaint: '#8C8275',
  primary: '#1E5E3F',
  secondary: '#E8593C',
  overlay: 'rgba(23, 20, 16, 0.55)',
  star: '#E8B94A',
};

const fonts = {
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  body: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
};

const FONT_HREFS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,SOFT,wght@0,9..144,0..100,300..700;1,9..144,0..100,300..700&display=swap',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap',
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

interface AuthShellProps {
  /**
   * Right-side panel content — the actual form.
   */
  children: React.ReactNode;
  /**
   * Optional eyebrow/kicker shown in mono above the main title on the
   * right panel's form header (e.g. "CREAR CUENTA" / "INICIAR SESIÓN").
   * The AuthShell does not render this — each consumer is free to
   * compose its own right-panel header; this is exported only for
   * consistency through the `authPalette` / `authFonts` exports below.
   */
  rightPanelMaxWidth?: number;
}

const Stars: React.FC = () => (
  <Box sx={{ display: 'flex', gap: 0.25, mb: 0.75 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <StarIcon key={i} sx={{ fontSize: 14, color: palette.star }} />
    ))}
  </Box>
);

const AuthShell: React.FC<AuthShellProps> = ({
  children,
  rightPanelMaxWidth = 460,
}) => {
  const prefersReducedMotion = useReducedMotion();
  // MUI's default `lg` breakpoint (1200px) — we treat ≥ 1024px as desktop
  // per spec, so we wire our own media query.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  const fadeIn = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
      };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: palette.paper,
        fontFamily: fonts.body,
        color: palette.ink,
      }}
    >
      {/* ============================================================ */}
      {/*  LEFT PANEL — desktop only                                   */}
      {/* ============================================================ */}
      {isDesktop && (
        <Box
          component={motion.div}
          {...fadeIn}
          sx={{
            flex: '1 1 50%',
            minHeight: '100vh',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${authBackgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            color: palette.paper,
            padding: '48px 56px 56px',
          }}
        >
          {/* dark overlay for text contrast */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, rgba(23,20,16,0.45) 0%, ${palette.overlay} 55%, rgba(23,20,16,0.72) 100%)`,
            }}
          />

          {/* Logo top-left */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              component="a"
              href="/"
              sx={{
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 28,
                letterSpacing: '-0.02em',
                color: palette.paper,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.5,
                fontVariationSettings: '"opsz" 144, "SOFT" 30',
              }}
            >
              TurnosPro
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: palette.secondary,
                  display: 'inline-block',
                  mb: 0.5,
                }}
              />
            </Typography>
          </Box>

          {/* Headline block */}
          <Box sx={{ position: 'relative', zIndex: 1, mt: 8, maxWidth: 520 }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: fonts.display,
                fontWeight: 500,
                fontSize: { lg: 48, xl: 56 },
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: palette.paper,
                mb: 2.5,
                fontVariationSettings: '"opsz" 144, "SOFT" 30',
              }}
            >
              {authHeadline}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.5,
                color: 'rgba(244, 239, 230, 0.78)',
                maxWidth: 440,
              }}
            >
              {authSubtitle}
            </Typography>
          </Box>

          {/* Testimonials */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              mt: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              maxWidth: 520,
            }}
          >
            {authTestimonials.map((t, idx) => (
              <Box
                key={t.handle}
                component={motion.div}
                initial={
                  prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0.2 : 0.5,
                  delay: prefersReducedMotion ? 0 : 0.35 + idx * 0.12,
                  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
                }}
                sx={{
                  display: 'flex',
                  gap: 1.75,
                  alignItems: 'flex-start',
                  backdropFilter: 'blur(6px)',
                  backgroundColor: 'rgba(23, 20, 16, 0.28)',
                  border: '1px solid rgba(244, 239, 230, 0.12)',
                  borderRadius: 2,
                  padding: '14px 16px',
                }}
              >
                <Box
                  component="img"
                  src={`https://i.pravatar.cc/88?img=${t.avatarSeed}`}
                  alt=""
                  loading="lazy"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '1.5px solid rgba(244, 239, 230, 0.35)',
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Stars />
                  <Typography
                    sx={{
                      fontFamily: fonts.mono,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      color: 'rgba(244, 239, 230, 0.85)',
                      mb: 0.5,
                    }}
                  >
                    {t.handle}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontStyle: 'italic',
                      fontSize: 14,
                      lineHeight: 1.45,
                      color: 'rgba(244, 239, 230, 0.92)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    “{t.quote}”
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ============================================================ */}
      {/*  RIGHT PANEL — always visible                                 */}
      {/* ============================================================ */}
      <Box
        sx={{
          flex: isDesktop ? '1 1 50%' : '1 1 100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: {
            xs: '24px 20px 32px',
            sm: '32px 32px 40px',
            md: '40px 48px 48px',
          },
          backgroundColor: palette.paper,
        }}
      >
        {/* Mobile-only mini wordmark (desktop shows the big logo on the
            left). Kept small and in the brand primary color. */}
        {!isDesktop && (
          <Box sx={{ mb: 3 }}>
            <Typography
              component="a"
              href="/"
              sx={{
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: palette.primary,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.5,
                fontVariationSettings: '"opsz" 144, "SOFT" 30',
              }}
            >
              TurnosPro
              <Box
                component="span"
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: palette.secondary,
                  display: 'inline-block',
                  mb: 0.25,
                }}
              />
            </Typography>
          </Box>
        )}

        <Box
          component={motion.div}
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: prefersReducedMotion ? 0 : 0.15 }}
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: rightPanelMaxWidth,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AuthShell;

// Shared tokens re-exported so Login/Register can compose headers/CTAs
// against the same values without importing internal styles.
export const authPalette = palette;
export const authFonts = fonts;
