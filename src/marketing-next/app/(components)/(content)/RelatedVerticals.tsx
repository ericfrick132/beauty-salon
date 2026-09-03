'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import Link from 'next/link';
import { palette } from '@/app/(lib)/theme';

interface Props {
  items: { label: string; path: string }[];
  title?: string;
  number?: string;
}

/** Links cruzados entre landings por vertical. */
export default function RelatedVerticals({ items, title = 'TurnosPro también es para', number = '04' }: Props) {
  return (
    <Box
      component="section"
      aria-labelledby="related-verticals"
      sx={{ py: { xs: 7, md: 10 }, bgcolor: palette.rose, borderTop: `1.5px solid ${palette.ink}`, borderBottom: `1.5px solid ${palette.ink}` }}
    >
      <Container maxWidth="md">
        <Box className="tp-rule" sx={{ mb: 3 }}>
          Nº {number} · Verticales
        </Box>
        <Typography
          id="related-verticals"
          variant="h2"
          sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, fontVariationSettings: '"opsz" 144', color: palette.ink, mb: 4 }}
        >
          {title}{' '}
          <Box component="span" sx={{ fontStyle: 'italic', color: palette.forestDeep }}>
            otros rubros.
          </Box>
        </Typography>
        <Grid container spacing={2}>
          {items.map((it) => (
            <Grid item xs={12} sm={6} key={it.path}>
              <Box
                component={Link}
                href={it.path}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                  p: { xs: 2, md: 2.5 },
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 2,
                  bgcolor: palette.paperSoft,
                  color: palette.ink,
                  textDecoration: 'none',
                  boxShadow: `3px 3px 0 ${palette.ink}`,
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { transform: 'translate(-1px,-1px)', boxShadow: `5px 5px 0 ${palette.ink}` },
                }}
              >
                <Box>
                  <Box
                    sx={{
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: '0.64rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: palette.inkMute,
                      mb: 0.5,
                    }}
                  >
                    Sistema de turnos para
                  </Box>
                  <Box sx={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
                    {it.label}
                  </Box>
                </Box>
                <Box component="span" aria-hidden sx={{ fontSize: '1.4rem', color: palette.coral }}>
                  →
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
