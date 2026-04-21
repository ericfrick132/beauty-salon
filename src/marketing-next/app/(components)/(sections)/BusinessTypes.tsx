'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { businessTypesContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

export default function BusinessTypes() {
  const types = businessTypesContent.types;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 9, md: 14 },
        bgcolor: palette.rose,
        borderTop: `1.5px solid ${palette.ink}`,
        borderBottom: `1.5px solid ${palette.ink}`,
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <AnimatedSection>
          <SectionLabel number="04" label="Verticales" />
        </AnimatedSection>

        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="flex-start">
          <Grid item xs={12} md={5}>
            <AnimatedSection>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '2.6rem' },
                  fontVariationSettings: '"opsz" 144',
                  color: palette.ink,
                  mb: 3,
                }}
              >
                Ideal para todo negocio{' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: palette.forestDeep }}>
                  que trabaja con turnos.
                </Box>
              </Typography>

              <Typography
                sx={{
                  fontSize: '1.05rem',
                  color: palette.ink,
                  opacity: 0.75,
                  lineHeight: 1.65,
                  mb: 4,
                  maxWidth: 460,
                }}
              >
                {businessTypesContent.description}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {types.map((t) => (
                  <Box
                    key={t}
                    sx={{
                      px: 1.6,
                      py: 0.6,
                      border: `1.5px solid ${palette.ink}`,
                      borderRadius: 999,
                      bgcolor: palette.paperSoft,
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: '0.7rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: palette.ink,
                      transition: 'transform 0.18s',
                      '&:hover': {
                        transform: 'translate(-1px,-1px)',
                        bgcolor: palette.ink,
                        color: palette.paperSoft,
                      },
                    }}
                  >
                    {t}
                  </Box>
                ))}
              </Box>
            </AnimatedSection>
          </Grid>

          <Grid item xs={12} md={7}>
            <AnimatedSection delay={0.15}>
              {/* Editorial vertical typographic display of business types */}
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: { xs: 'center', md: 'flex-end' },
                  gap: { xs: 1.2, md: 1.6 },
                }}
              >
                {types.map((t, i) => (
                  <Typography
                    key={t}
                    component="div"
                    sx={{
                      fontFamily: 'var(--font-fraunces), serif',
                      fontWeight: i % 3 === 0 ? 600 : 500,
                      fontStyle: i % 2 === 1 ? 'italic' : 'normal',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80',
                      fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.8rem', lg: '5.6rem' },
                      lineHeight: 0.95,
                      letterSpacing: '-0.035em',
                      color: i === 0 || i === 3 ? palette.ink : palette.forestDeep,
                      WebkitTextStroke: i === 2 ? `1.5px ${palette.ink}` : undefined,
                      WebkitTextFillColor: i === 2 ? 'transparent' : undefined,
                      textAlign: { xs: 'center', md: 'right' },
                      transition: 'transform 240ms ease, color 240ms ease',
                      '&:hover': {
                        transform: 'translateX(-6px)',
                        color: palette.coral,
                      },
                    }}
                  >
                    {t}
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.85rem',
                        letterSpacing: '0.16em',
                        verticalAlign: 'super',
                        color: palette.ink,
                        opacity: 0.55,
                      }}
                    >
                      0{i + 1}
                    </Box>
                  </Typography>
                ))}
              </Box>
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
