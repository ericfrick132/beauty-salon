/**
 * AuthShell — split-screen "Editorial Gazette" layout for /login and /register.
 *
 * Aesthetic: weekly fashion magazine. Cream paper, dramatic typographic
 * hierarchy, asymmetric columns, testimonials that escape the column gutter
 * and overlap the vertical rule between panels.
 *
 * Structure:
 *   Desktop (>=1024px): 50/50 split. Left = editorial cover (dark photo,
 *   masthead, dropcap numeral, hand-drawn scissor/eye flourishes, the 3
 *   testimonial cards stacked at the bottom but ONE of them juts right
 *   across the vertical rule). Right = printed-paper form (SVG grain +
 *   underline fields + pill CTA with coral slide accent).
 *   Mobile (<1024px): form only. Grain + a single flourish survive as
 *   subtle accents; the left cover is dropped.
 *
 * Typography: Fraunces (display) / Space Grotesk (body) / JetBrains Mono
 * (kickers). Fonts injected into <head> on first mount so this shell
 * works on any subdomain without relying on the landing.
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
  paperDeep: '#EDE5D5',
  ink: '#171410',
  inkSoft: '#5C5347',
  inkFaint: '#8C8275',
  rule: 'rgba(23, 20, 16, 0.16)',
  primary: '#1E5E3F',
  primaryDeep: '#174A32',
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

/**
 * Issue number string. Based on the current date — changes weekly-ish so
 * each week the masthead looks freshly printed.
 */
function issueKicker(): string {
  const now = new Date();
  // Week number of year, rough.
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  const months = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ];
  const issue = String(week).padStart(3, '0');
  return `N°${issue} · EDICIÓN ${months[now.getMonth()]} · TURNOS PRO WEEKLY`;
}

// ---------- Decorative SVG: printed paper grain ----------
// Single instance of an SVG noise pattern; used as a background-image url()
// via encodeURIComponent. 7% opacity on top of the cream paper.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.09  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml;utf8,${GRAIN_SVG}")`;

// ---------- Decorative hand-drawn single-line SVG flourishes ----------
const ScissorFlourish: React.FC<{
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ color = '#F4EFE6', size = 120, style }) => (
  <svg
    viewBox="0 0 200 80"
    width={size}
    height={(size * 80) / 200}
    style={style}
    fill="none"
    stroke={color}
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* two connected loops (scissor handles) + two crossing blades */}
    <circle cx="22" cy="24" r="10" />
    <circle cx="22" cy="56" r="10" />
    <path d="M31 28 C 70 34, 110 38, 170 40" />
    <path d="M31 52 C 70 46, 110 42, 170 40" />
    {/* small rivet at pivot */}
    <circle cx="46" cy="40" r="1.4" fill={color} />
    {/* tips open slightly */}
    <path d="M170 40 L 186 36" />
    <path d="M170 40 L 186 44" />
  </svg>
);

const EyeFlourish: React.FC<{
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ color = '#E8593C', size = 82, style }) => (
  <svg
    viewBox="0 0 120 60"
    width={size}
    height={(size * 60) / 120}
    style={style}
    fill="none"
    stroke={color}
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 30 C 30 6, 90 6, 114 30 C 90 54, 30 54, 6 30 Z" />
    <circle cx="60" cy="30" r="9" />
    <circle cx="60" cy="30" r="3" fill={color} />
    {/* three tiny lashes */}
    <path d="M34 12 L 30 7" />
    <path d="M60 8 L 60 3" />
    <path d="M86 12 L 90 7" />
  </svg>
);

const RibbonFlourish: React.FC<{
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ color = '#E8593C', size = 120, style }) => (
  <svg
    viewBox="0 0 240 40"
    width={size}
    height={(size * 40) / 240}
    style={style}
    fill="none"
    stroke={color}
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 22 C 30 6, 56 38, 82 22 S 134 6, 160 22 S 212 38, 236 22" />
  </svg>
);

const Stars: React.FC<{ color?: string }> = ({ color = palette.star }) => (
  <Box sx={{ display: 'flex', gap: 0.25, mb: 0.5 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <StarIcon key={i} sx={{ fontSize: 12, color }} />
    ))}
  </Box>
);

interface AuthShellProps {
  /** Right-panel form content. */
  children: React.ReactNode;
  /** Optional max-width for the right-panel form column. */
  rightPanelMaxWidth?: number;
}

const AuthShell: React.FC<AuthShellProps> = ({
  children,
  rightPanelMaxWidth = 460,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  const leftFade = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: {
          duration: 0.7,
          ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
        },
      };

  const rightSlide = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.7,
          delay: 0.25,
          ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
        },
      };

  const kicker = issueKicker();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: palette.paper,
        fontFamily: fonts.body,
        color: palette.ink,
        position: 'relative',
      }}
    >
      {/* ============================================================ */}
      {/*  LEFT PANEL — desktop only. "Editorial cover."                */}
      {/* ============================================================ */}
      {isDesktop && (
        <Box
          component={motion.div}
          {...leftFade}
          sx={{
            flex: '1 1 50%',
            minHeight: '100vh',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${authBackgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: palette.paper,
            padding: '44px 56px 52px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${palette.rule}`,
          }}
        >
          {/* Dark gradient overlay for text contrast */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(172deg, rgba(23,20,16,0.58) 0%, rgba(23,20,16,0.66) 45%, rgba(23,20,16,0.82) 100%)`,
            }}
          />

          {/* Grain texture on the left panel too */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: GRAIN_URL,
              backgroundSize: '220px 220px',
              opacity: 0.18,
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
            }}
          />

          {/* ───── Masthead rule: top-left kicker, top-right date ───── */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 2,
              borderBottom: '1px solid rgba(244, 239, 230, 0.22)',
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'rgba(244, 239, 230, 0.72)',
              }}
            >
              {kicker}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: 'rgba(244, 239, 230, 0.72)',
              }}
            >
              PESOS ARGENTINOS · BUENOS AIRES
            </Typography>
          </Box>

          {/* ───── Wordmark ───── */}
          <Box sx={{ position: 'relative', zIndex: 2, mt: 3 }}>
            <Typography
              component="a"
              href="/"
              sx={{
                fontFamily: fonts.display,
                fontWeight: 600,
                fontSize: 30,
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
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: palette.secondary,
                  display: 'inline-block',
                  mb: 0.5,
                }}
              />
            </Typography>
          </Box>

          {/* ───── Hero block: dropcap numeral + headline + caption ───── */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              mt: 5,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 3,
              alignItems: 'start',
              maxWidth: 620,
            }}
          >
            {/* Gigantic italic numeral — the "issue dropcap" */}
            <Typography
              aria-hidden
              sx={{
                fontFamily: fonts.display,
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(108px, 12vw, 168px)',
                lineHeight: 0.85,
                letterSpacing: '-0.05em',
                color: palette.secondary,
                textShadow: '0 2px 22px rgba(0,0,0,0.35)',
                fontVariationSettings: '"opsz" 144, "SOFT" 60',
                ml: '-6px',
                mt: '-14px',
              }}
            >
              N°
            </Typography>

            <Box sx={{ pt: 2 }}>
              <Typography
                sx={{
                  fontFamily: fonts.mono,
                  fontSize: 10.5,
                  letterSpacing: '0.2em',
                  color: 'rgba(244, 239, 230, 0.72)',
                  mb: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Portada · Columna principal
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontFamily: fonts.display,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  fontSize: 'clamp(56px, 6.4vw, 96px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.025em',
                  color: palette.paper,
                  fontVariationSettings: '"opsz" 144, "SOFT" 30',
                  // Dramatic hierarchy: first word upright, rest italic for contrast.
                  '& .upright': { fontStyle: 'normal', fontWeight: 500 },
                }}
              >
                <span className="upright">Más</span> reservas,
                <br />
                menos <span className="upright">no-shows.</span>
              </Typography>

              {/* ribbon flourish under headline */}
              <Box sx={{ mt: 2, opacity: 0.9 }}>
                <RibbonFlourish color={palette.secondary} size={220} />
              </Box>

              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: 'rgba(244, 239, 230, 0.88)',
                  mt: 2.5,
                  maxWidth: 440,
                  '&::before': {
                    content: '"— "',
                    color: palette.secondary,
                    fontWeight: 500,
                  },
                }}
              >
                {authSubtitle} {authHeadline.toLowerCase()}
              </Typography>
            </Box>
          </Box>

          {/* ───── Decorative scissor flourish in top-right ───── */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 100,
              right: -28,
              zIndex: 2,
              opacity: 0.55,
              transform: 'rotate(-12deg)',
              pointerEvents: 'none',
            }}
          >
            <ScissorFlourish color="#F4EFE6" size={180} />
          </Box>

          {/* ───── Eye flourish mid-left ───── */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: '45%',
              right: 80,
              zIndex: 2,
              opacity: 0.5,
              transform: 'rotate(8deg)',
              pointerEvents: 'none',
            }}
          >
            <EyeFlourish color={palette.secondary} size={96} />
          </Box>

          {/* ───── Testimonials section — asymmetric, last card escapes gutter ───── */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 3,
              mt: 'auto',
              pt: 4,
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                letterSpacing: '0.2em',
                color: 'rgba(244, 239, 230, 0.65)',
                mb: 2,
                textTransform: 'uppercase',
                '&::before': {
                  content: '""',
                  display: 'inline-block',
                  width: 24,
                  height: 1,
                  backgroundColor: 'rgba(244, 239, 230, 0.5)',
                  verticalAlign: 'middle',
                  mr: 1.5,
                },
              }}
            >
              Columna · Testimonios verificados
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.75,
                maxWidth: 540,
                position: 'relative',
              }}
            >
              {authTestimonials.map((t, idx) => {
                const isLast = idx === authTestimonials.length - 1;
                return (
                  <Box
                    key={t.handle}
                    component={motion.div}
                    initial={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -14 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0.2 : 0.55,
                      delay: prefersReducedMotion ? 0 : 0.45 + idx * 0.15,
                      ease: [0.22, 0.61, 0.36, 1] as [
                        number,
                        number,
                        number,
                        number,
                      ],
                    }}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr',
                      columnGap: 2,
                      alignItems: 'start',
                      backdropFilter: 'blur(8px)',
                      backgroundColor: isLast
                        ? 'rgba(244, 239, 230, 0.96)'
                        : 'rgba(23, 20, 16, 0.42)',
                      color: isLast ? palette.ink : palette.paper,
                      border: isLast
                        ? `1px solid ${palette.ink}`
                        : '1px solid rgba(244, 239, 230, 0.14)',
                      borderRadius: 0, // sharp corners for editorial feel
                      padding: '14px 18px 16px',
                      // Last testimonial escapes gutter, overlaps vertical rule.
                      ml: isLast ? 'auto' : idx === 1 ? 3 : 0,
                      mr: isLast ? '-64px' : 0,
                      width: isLast ? 360 : 'auto',
                      boxShadow: isLast
                        ? '0 22px 40px -24px rgba(0,0,0,0.55)'
                        : 'none',
                      position: 'relative',
                    }}
                  >
                    {/* coral corner tab on the escaping card */}
                    {isLast && (
                      <Box
                        aria-hidden
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 4,
                          height: '100%',
                          backgroundColor: palette.secondary,
                        }}
                      />
                    )}

                    <Box
                      component="img"
                      src={`https://i.pravatar.cc/88?img=${t.avatarSeed}`}
                      alt=""
                      loading="lazy"
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 0,
                        objectFit: 'cover',
                        filter: isLast ? 'grayscale(0.15)' : 'grayscale(0.35) contrast(1.05)',
                        border: isLast
                          ? `1px solid ${palette.ink}`
                          : '1px solid rgba(244, 239, 230, 0.4)',
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Stars
                        color={isLast ? palette.secondary : palette.star}
                      />
                      <Typography
                        sx={{
                          fontFamily: fonts.mono,
                          fontSize: 10.5,
                          fontWeight: 500,
                          letterSpacing: '0.06em',
                          color: isLast
                            ? palette.inkSoft
                            : 'rgba(244, 239, 230, 0.78)',
                          mb: 0.75,
                          textTransform: 'uppercase',
                        }}
                      >
                        {t.handle}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: fonts.display,
                          fontStyle: 'italic',
                          fontWeight: 400,
                          fontSize: 14.5,
                          lineHeight: 1.45,
                          color: isLast
                            ? palette.ink
                            : 'rgba(244, 239, 230, 0.94)',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontVariationSettings: '"opsz" 144',
                        }}
                      >
                        &ldquo;{t.quote}&rdquo;
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Page-footer kicker */}
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'rgba(244, 239, 230, 0.5)',
                mt: 3,
                pt: 1.5,
                borderTop: '1px solid rgba(244, 239, 230, 0.14)',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Pág. 01 · Portada</span>
              <span>TURNOSPRO.COM</span>
            </Typography>
          </Box>
        </Box>
      )}

      {/* ============================================================ */}
      {/*  RIGHT PANEL — always visible. Printed paper form.            */}
      {/* ============================================================ */}
      <Box
        component={motion.div}
        {...rightSlide}
        sx={{
          flex: isDesktop ? '1 1 50%' : '1 1 100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: {
            xs: '28px 20px 36px',
            sm: '36px 32px 44px',
            md: '44px 56px 48px',
          },
          position: 'relative',
          backgroundColor: palette.paper,
        }}
      >
        {/* Grain overlay — 7% opacity, covers full panel */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: GRAIN_URL,
            backgroundSize: '220px 220px',
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Subtle deeper-cream radial in top-right corner to imply paper warmth */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '45%',
            height: '55%',
            background: `radial-gradient(ellipse at top right, ${palette.paperDeep} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Masthead strip on the right panel: kicker + step counter */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1.5,
            mb: 3,
            borderBottom: `1px solid ${palette.rule}`,
          }}
        >
          {!isDesktop ? (
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
          ) : (
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                letterSpacing: '0.2em',
                color: palette.inkFaint,
                textTransform: 'uppercase',
              }}
            >
              Sección · Acceso
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: fonts.mono,
              fontSize: 10.5,
              letterSpacing: '0.2em',
              color: palette.inkFaint,
              textTransform: 'uppercase',
            }}
          >
            Pág. 02
          </Typography>
        </Box>

        {/* Mobile-only ribbon flourish (desktop has the full left panel) */}
        {!isDesktop && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 100,
              right: -20,
              opacity: 0.35,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <ScissorFlourish color={palette.ink} size={140} />
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: rightPanelMaxWidth,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Box>

        {/* Right-panel footer rule */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: 4,
            pt: 1.5,
            borderTop: `1px solid ${palette.rule}`,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: '0.22em',
            color: palette.inkFaint,
            textTransform: 'uppercase',
          }}
        >
          <span>© TurnosPro {new Date().getFullYear()}</span>
          <span>Impreso en Argentina</span>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthShell;

// Shared tokens re-exported so Login/Register compose against the same values.
export const authPalette = palette;
export const authFonts = fonts;
