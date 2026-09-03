'use client';
import { Box, Container, Typography } from '@mui/material';
import Link from 'next/link';
import type { ReactNode } from 'react';
import SectionLabel from '../(sections)/SectionLabel';
import { palette } from '@/app/(lib)/theme';

export interface Crumb {
  name: string;
  path: string;
}

interface Props {
  number?: string;
  label: string;
  h1: string;
  intro?: string[];
  crumbs?: Crumb[];
  /** Línea de metadatos (p. ej. fecha de publicación en el blog). */
  meta?: string;
  children?: ReactNode;
}

/** Cabecera editorial de páginas de contenido: migas, eyebrow, H1, intro y CTA. */
export default function PageHero({ number = '01', label, h1, intro = [], crumbs = [], meta, children }: Props) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: palette.paper,
        borderBottom: `1.5px solid ${palette.ink}`,
        pt: { xs: 5, md: 8 },
        pb: { xs: 5, md: 7 },
      }}
    >
      <Container maxWidth="md">
        {crumbs.length > 0 && (
          <Box
            component="nav"
            aria-label="Migas de pan"
            sx={{
              mb: 3,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.68rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: palette.inkMute,
            }}
          >
            <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <Box component="li" key={c.path} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {last ? (
                      <Box component="span" aria-current="page" sx={{ color: palette.ink }}>
                        {c.name}
                      </Box>
                    ) : (
                      <Link href={c.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                    )}
                    {!last && <Box component="span" aria-hidden>›</Box>}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        <SectionLabel number={number} label={label} />

        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '2.3rem', sm: '2.9rem', md: '3.7rem' },
            fontVariationSettings: '"opsz" 144, "SOFT" 60',
            color: palette.ink,
            mb: 3,
            maxWidth: 820,
          }}
        >
          {h1}
        </Typography>

        {meta && (
          <Box
            sx={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.68rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: palette.inkMute,
              mb: 2.5,
            }}
          >
            {meta}
          </Box>
        )}

        {intro.map((p, i) => (
          <Typography
            key={i}
            sx={{
              fontSize: { xs: '1.08rem', md: '1.2rem' },
              lineHeight: 1.65,
              color: i === 0 ? palette.ink : palette.inkSoft,
              mb: 2,
              maxWidth: 760,
            }}
          >
            {p}
          </Typography>
        ))}

        {children}
      </Container>
    </Box>
  );
}
