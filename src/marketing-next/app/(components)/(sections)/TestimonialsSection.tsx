'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { testimonials } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

const accentColors = [palette.coral, palette.forest, palette.amber];

function StarRow({ count }: { count: number }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.4 }} aria-label={`${count} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box
          key={i}
          component="svg"
          aria-hidden
          viewBox="0 0 24 24"
          sx={{
            width: 16,
            height: 16,
            color: i < count ? palette.ink : 'rgba(23,20,16,0.2)',
          }}
        >
          <path
            d="M12 2.5l2.7 6.6 7.1.5-5.4 4.6 1.7 6.9L12 17.4l-6.1 3.7 1.7-6.9-5.4-4.6 7.1-.5L12 2.5z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </Box>
      ))}
    </Box>
  );
}

export default function TestimonialsSection() {
  return (
    <Box component="section" sx={{ py: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="06" label="Testimonios" />
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2.2rem', md: '3.4rem', lg: '4rem' },
              fontVariationSettings: '"opsz" 144',
              color: palette.ink,
              maxWidth: 760,
              mb: { xs: 5, md: 8 },
            }}
          >
            Lo que dicen quienes{' '}
            <Box component="span" sx={{ fontStyle: 'italic', color: palette.forest }}>
              ya lo viven.
            </Box>
          </Typography>
        </AnimatedSection>

        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="stretch">
          {testimonials.map((t, i) => {
            const accent = accentColors[i % accentColors.length];
            // Stagger card vertical offset for asymmetry on desktop.
            const offset = [0, 32, 0][i] || 0;
            return (
              <Grid item xs={12} md={4} key={t.name}>
                <AnimatedSection delay={i * 0.1}>
                  <Box
                    sx={{
                      mt: { xs: 0, md: `${offset}px` },
                      bgcolor: palette.paperSoft,
                      border: `1.5px solid ${palette.ink}`,
                      borderRadius: 2,
                      boxShadow: `5px 5px 0 ${palette.ink}`,
                      p: { xs: 3, md: 3.5 },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      transition: 'transform 220ms ease, box-shadow 220ms ease',
                      '&:hover': {
                        transform: 'translate(-2px,-2px)',
                        boxShadow: `7px 7px 0 ${accent}`,
                      },
                    }}
                  >
                    {/* Oversized quote mark in accent */}
                    <Box
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: 18,
                        fontFamily: 'var(--font-fraunces), serif',
                        fontWeight: 700,
                        fontVariationSettings: '"opsz" 144',
                        fontSize: '5rem',
                        lineHeight: 1,
                        color: accent,
                      }}
                    >
                      &ldquo;
                    </Box>

                    <StarRow count={t.rating} />

                    <Typography
                      sx={{
                        mt: 2.5,
                        fontFamily: 'var(--font-fraunces), serif',
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 100',
                        fontSize: { xs: '1.25rem', md: '1.4rem' },
                        lineHeight: 1.35,
                        color: palette.ink,
                        flex: 1,
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {t.quote}
                    </Typography>

                    <Box
                      sx={{
                        mt: 3,
                        pt: 2.5,
                        borderTop: `1.5px dashed ${palette.ink}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          bgcolor: accent,
                          border: `1.5px solid ${palette.ink}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-fraunces), serif',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: palette.paperSoft,
                          flexShrink: 0,
                        }}
                      >
                        {t.name.charAt(0)}
                      </Box>
                      <Box>
                        <Box sx={{ fontWeight: 600, fontSize: '0.92rem', color: palette.ink, lineHeight: 1.2 }}>
                          {t.name}
                        </Box>
                        <Box
                          sx={{
                            fontFamily: 'var(--font-mono), monospace',
                            fontSize: '0.66rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: palette.inkSoft,
                            mt: 0.3,
                          }}
                        >
                          {t.role}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </AnimatedSection>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
