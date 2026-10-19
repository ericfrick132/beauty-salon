'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { palette } from '@/app/(lib)/theme';

/**
 * Primitivas de la home estilo Ascend: mucho aire, cards de fondo suave con radio grande,
 * títulos Inter con tracking negativo (peso 600, sin itálicas) y la paleta de TurnosPro.
 */
export const sans = 'var(--font-inter), var(--font-grotesk), system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

export const home = {
  ...palette,
  card: '#FBF8F2',
  cardAlt: '#EFE8DB',
  line: 'rgba(23,20,16,0.10)',
  lineStrong: 'rgba(23,20,16,0.18)',
  forestSoft: '#E3EEE6',
  coralSoft: '#FBE4DC',
  radius: '24px',
  radiusSm: '16px',
  shadow: '0 1px 2px rgba(23,20,16,0.04), 0 12px 32px -12px rgba(23,20,16,0.14)',
};

export const titleSx = {
  fontFamily: sans,
  fontWeight: 600,
  letterSpacing: '-0.035em',
  lineHeight: 1.05,
  color: home.ink,
  fontStyle: 'normal',
} as const;

/** Contenedor con gutter de 16px en mobile. */
export function Wrap({ children, max = 1120 }: { children: ReactNode; max?: number }) {
  return <Box sx={{ width: '100%', maxWidth: max, mx: 'auto', px: { xs: 2, sm: 3 } }}>{children}</Box>;
}

export function Section({ id, children, py }: { id?: string; children: ReactNode; py?: object }) {
  return (
    <Box id={id} component="section" sx={{ py: py ?? { xs: 7, md: 12 }, scrollMarginTop: 96 }}>
      {children}
    </Box>
  );
}

/** H2 corto + una sola línea debajo, centrado. */
export function SectionHead({
  title,
  line,
  badge,
  align = 'center',
}: {
  title: ReactNode;
  line?: ReactNode;
  badge?: ReactNode;
  align?: 'center' | 'left';
}) {
  return (
    <Box sx={{ textAlign: align, maxWidth: align === 'center' ? 760 : 560, mx: align === 'center' ? 'auto' : 0, mb: { xs: 4, md: 6 } }}>
      {badge && <Box sx={{ mb: 2, display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>{badge}</Box>}
      <Typography component="h2" sx={{ ...titleSx, fontSize: { xs: '2rem', sm: '2.4rem', md: '3.1rem' } }}>
        {title}
      </Typography>
      {line && (
        <Typography sx={{ mt: 2, fontFamily: sans, fontSize: { xs: '1.02rem', md: '1.15rem' }, color: home.inkSoft, lineHeight: 1.55 }}>
          {line}
        </Typography>
      )}
    </Box>
  );
}

/** Parte destacada de un título: color de marca, nunca cursiva. */
export function Accent({ children, color = home.forest }: { children: ReactNode; color?: string }) {
  return (
    <Box component="span" sx={{ color, fontStyle: 'normal' }}>
      {children}
    </Box>
  );
}

export function Badge({ children, tone = 'forest' }: { children: ReactNode; tone?: 'forest' | 'coral' | 'ink' }) {
  const map = {
    forest: { bg: home.forestSoft, fg: home.forestDeep },
    coral: { bg: home.coralSoft, fg: home.coralDeep },
    ink: { bg: home.ink, fg: home.paper },
  } as const;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 999,
        bgcolor: map[tone].bg,
        color: map[tone].fg,
        fontFamily: sans,
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </Box>
  );
}

/** Marca "Desde Plus" para funciones que el plan Gratuito no incluye (WhatsApp, recordatorios, asistente). */
export function PlusBadge({ label = 'Desde Plus' }: { label?: string }) {
  return <Badge tone="coral">{label}</Badge>;
}

export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.25 }}>
      {items.map((it, i) => (
        <Box component="li" key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', fontFamily: sans, fontSize: '1rem', color: home.ink, lineHeight: 1.45 }}>
          <Box
            component="span"
            aria-hidden
            sx={{
              flex: '0 0 22px',
              height: 22,
              mt: '1px',
              borderRadius: '50%',
              bgcolor: home.forest,
              color: home.paper,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            ✓
          </Box>
          <span>{it}</span>
        </Box>
      ))}
    </Box>
  );
}

/** Card de fondo suave con radio grande que contiene el producto "en vivo". */
export function ProductCard({ children, tone = 'card', sx }: { children: ReactNode; tone?: 'card' | 'alt' | 'forest'; sx?: object }) {
  const bg = tone === 'alt' ? home.cardAlt : tone === 'forest' ? home.forestSoft : home.card;
  return (
    <Box
      sx={{
        bgcolor: bg,
        borderRadius: home.radius,
        border: `1px solid ${home.line}`,
        p: { xs: 2, sm: 3, md: 4 },
        overflow: 'hidden',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  borderRadius: 999,
  fontFamily: sans,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
  cursor: 'pointer',
  border: 'none',
  transition: 'background 160ms ease, transform 160ms ease',
  whiteSpace: 'nowrap',
  '&:hover': { transform: 'translateY(-1px)' },
  '&:focus-visible': { outline: `2px solid ${home.forest}`, outlineOffset: 3 },
} as const;

const sizes = {
  md: { px: 2.5, py: 1.1, fontSize: '0.95rem' },
  lg: { px: 3.25, py: 1.6, fontSize: '1.05rem' },
  sm: { px: 2, py: 0.8, fontSize: '0.88rem' },
} as const;

export function PrimaryButton({ children, onClick, size = 'lg', fullWidth }: { children: ReactNode; onClick?: () => void; size?: keyof typeof sizes; fullWidth?: boolean }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{ ...btnBase, ...sizes[size], width: fullWidth ? '100%' : 'auto', bgcolor: home.forest, color: home.paperSoft, '&:hover': { ...btnBase['&:hover'], bgcolor: home.forestDeep } }}
    >
      {children}
    </Box>
  );
}

export function SecondaryButton({ children, href, size = 'lg', fullWidth, external }: { children: ReactNode; href: string; size?: keyof typeof sizes; fullWidth?: boolean; external?: boolean }) {
  const sx = {
    ...btnBase,
    ...sizes[size],
    width: fullWidth ? '100%' : 'auto',
    bgcolor: 'rgba(23,20,16,0.06)',
    color: home.ink,
    '&:hover': { ...btnBase['&:hover'], bgcolor: 'rgba(23,20,16,0.11)' },
  };
  // /login es la SPA (no es una página del export): <a> común, no next/link.
  if (external) return <Box component="a" href={href} sx={sx}>{children}</Box>;
  return <Box component={Link} href={href} sx={sx}>{children}</Box>;
}

/** Logo de TurnosPro: el mismo cuadrado con la T y el punto coral. */
export function BrandMark({ size = 32, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <Box component="svg" aria-hidden viewBox="0 0 38 38" sx={{ width: size, height: size, flex: `0 0 ${size}px` }}>
      <rect x="2" y="2" width="34" height="34" rx="8" fill={inverted ? home.paper : home.ink} />
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-fraunces), serif" fontWeight="600" fontSize="22" fill={inverted ? home.ink : home.amber}>
        T
      </text>
      <circle cx="29" cy="28" r="2.5" fill={home.coral} />
    </Box>
  );
}

export function Wordmark({ size = '1.15rem', color = home.ink }: { size?: string; color?: string }) {
  return (
    <Box component="span" sx={{ fontFamily: sans, fontWeight: 650, fontSize: size, letterSpacing: '-0.035em', color, lineHeight: 1 }}>
      Turnos<Box component="span" sx={{ color: home.coral }}>Pro</Box>
    </Box>
  );
}
