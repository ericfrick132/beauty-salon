'use client';
import { Box, Container, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { howItWorksSteps } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

export default function HowItWorks() {
  const total = howItWorksSteps.length;

  return (
    <Box id="como-funciona" component="section" sx={{ py: { xs: 9, md: 14 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <SectionLabel number="05" label="Paso a paso" />
        </AnimatedSection>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 4, md: 8 },
            alignItems: 'flex-end',
            mb: { xs: 5, md: 7 },
          }}
        >
          <AnimatedSection>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2.2rem', md: '3.4rem', lg: '4rem' },
                fontVariationSettings: '"opsz" 144',
                color: palette.ink,
              }}
            >
              De cero a recibir reservas{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>
                en 15 minutos.
              </Box>
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <Typography
              sx={{
                fontSize: '1rem',
                color: palette.inkSoft,
                lineHeight: 1.65,
                borderLeft: `2px solid ${palette.ink}`,
                pl: 2.5,
                maxWidth: 380,
              }}
            >
              Sin instalaciones. Sin contratos. Sin el clásico "te aviso por mail
              cuándo lo activamos". Te lo armás vos en una sentada.
            </Typography>
          </AnimatedSection>
        </Box>

        {/* Vertical timeline */}
        <Box sx={{ position: 'relative', maxWidth: 920, mx: 'auto' }}>
          {/* The connecting ink rule */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: { xs: 28, md: 60 },
              top: 0,
              bottom: 0,
              width: '1.5px',
              bgcolor: palette.ink,
              zIndex: 0,
            }}
          />

          {howItWorksSteps.map((step, i) => (
            <AnimatedSection key={step.number} delay={i * 0.08}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: { xs: '60px 1fr', md: '120px 1fr 110px' },
                  gap: { xs: 2.5, md: 3 },
                  alignItems: 'flex-start',
                  py: { xs: 3, md: 4 },
                  zIndex: 1,
                }}
              >
                {/* Number badge */}
                <Box
                  sx={{
                    width: { xs: 56, md: 120 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 0.6,
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 44, md: 72 },
                      height: { xs: 44, md: 72 },
                      borderRadius: '50%',
                      bgcolor: i === total - 1 ? palette.coral : palette.paperSoft,
                      border: `1.5px solid ${palette.ink}`,
                      boxShadow: `4px 4px 0 ${palette.ink}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-fraunces), serif',
                      fontWeight: 600,
                      fontSize: { xs: '1.1rem', md: '1.6rem' },
                      color: i === total - 1 ? palette.paperSoft : palette.ink,
                      flexShrink: 0,
                    }}
                  >
                    {String(step.number).padStart(2, '0')}
                  </Box>
                  <Box
                    sx={{
                      display: { xs: 'none', md: 'block' },
                      mt: 1,
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: '0.62rem',
                      letterSpacing: '0.14em',
                      color: palette.inkSoft,
                      textTransform: 'uppercase',
                    }}
                  >
                    Paso {step.number}/{total}
                  </Box>
                </Box>

                {/* Content */}
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-fraunces), serif',
                      fontWeight: 500,
                      fontVariationSettings: '"opsz" 144',
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      lineHeight: 1.1,
                      color: palette.ink,
                      mb: 1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.95rem', md: '1.05rem' },
                      color: palette.inkSoft,
                      lineHeight: 1.6,
                      maxWidth: 520,
                    }}
                  >
                    {step.description}
                  </Typography>
                  {/* Mobile-only time chip */}
                  {step.time && (
                    <Box
                      sx={{
                        display: { xs: 'inline-block', md: 'none' },
                        mt: 1.5,
                        px: 1.2,
                        py: 0.4,
                        border: `1.5px solid ${palette.ink}`,
                        borderRadius: 999,
                        bgcolor: palette.amber,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.68rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {step.time}
                    </Box>
                  )}
                </Box>

                {/* Time chip — desktop */}
                {step.time && (
                  <Box
                    sx={{
                      display: { xs: 'none', md: 'flex' },
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      pt: 1,
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.4,
                        py: 0.5,
                        border: `1.5px solid ${palette.ink}`,
                        borderRadius: 999,
                        bgcolor: palette.amber,
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: '0.7rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: palette.ink,
                      }}
                    >
                      {step.time}
                    </Box>
                  </Box>
                )}
              </Box>
            </AnimatedSection>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
