'use client';
import { Box, Container, Typography, Stack } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import { SignupForm } from './SignupModal';
import { signupSectionContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

const dim = 'rgba(244,239,230,0.68)';

/**
 * Sección #registro al final de la landing: a la izquierda vende (qué va a pasar, paso a paso,
 * y qué pasa cuando termina la prueba), a la derecha convierte con el mismo formulario del modal.
 * En mobile el formulario va justo debajo del titular y los pasos quedan abajo.
 */
export default function SignupSection() {
  const c = signupSectionContent;
  const [before, after] = c.headline.split(c.accent);

  return (
    <Box
      component="section"
      id="registro"
      sx={{
        position: 'relative',
        py: { xs: 9, md: 14 },
        bgcolor: palette.ink,
        color: palette.paper,
        borderTop: `1.5px solid ${palette.ink}`,
        scrollMarginTop: 88,
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' },
            gridTemplateAreas: { xs: '"head" "form" "steps"', md: '"head form" "steps form"' },
            columnGap: { md: 8, lg: 10 },
            rowGap: { xs: 4, md: 5 },
            alignItems: 'start',
          }}
        >
          {/* Titular */}
          <Box sx={{ gridArea: 'head' }}>
            <AnimatedSection>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: { xs: 3, md: 4 },
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: palette.amber,
                }}
              >
                <Box component="span" sx={{ width: 36, height: '1.5px', bgcolor: palette.amber }} />
                {c.eyebrow}
              </Box>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2.3rem', md: '3.3rem', lg: '3.8rem' },
                  fontVariationSettings: '"opsz" 144, "SOFT" 80',
                  color: palette.paper,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.02,
                  mb: 2.5,
                }}
              >
                {before}
                <Box component="span" sx={{ fontStyle: 'italic', color: palette.amber, fontWeight: 600 }}>
                  {c.accent}
                </Box>
                {after}
              </Typography>
              <Typography sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, color: dim, maxWidth: 520, lineHeight: 1.6 }}>
                {c.subheadline}
              </Typography>
            </AnimatedSection>
          </Box>

          {/* Formulario */}
          <Box sx={{ gridArea: 'form' }}>
            <AnimatedSection direction="right" delay={0.1}>
              <Box
                sx={{
                  bgcolor: palette.paperSoft,
                  color: palette.ink,
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 3,
                  boxShadow: `8px 8px 0 ${palette.amber}`,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    bgcolor: palette.amber,
                    color: palette.ink,
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '0.68rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    py: 0.9,
                    fontWeight: 700,
                  }}
                >
                  {c.ribbon}
                </Box>
                <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 3, sm: 3.5 } }}>
                  <SignupForm variant="inline" />
                </Box>
              </Box>
            </AnimatedSection>
          </Box>

          {/* Pasos + garantía */}
          <Box sx={{ gridArea: 'steps' }}>
            <AnimatedSection delay={0.15}>
              <Stack
                component="ol"
                spacing={0.5}
                sx={{ listStyle: 'none', m: 0, p: 0, mb: 3 }}
              >
                {c.steps.map((step, i) => {
                  const current = i === 0;
                  return (
                    <Box
                      component="li"
                      key={step.title}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'flex-start',
                        px: 2,
                        py: 1.6,
                        borderRadius: 2,
                        border: `1.5px solid ${current ? palette.amber : 'rgba(244,239,230,0.14)'}`,
                        bgcolor: current ? 'rgba(244,192,56,0.08)' : 'transparent',
                      }}
                    >
                      <Box
                        sx={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontFamily: 'var(--font-mono), monospace',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: `1.5px solid ${palette.amber}`,
                          bgcolor: current ? palette.amber : 'transparent',
                          color: current ? palette.ink : palette.amber,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: palette.paper, lineHeight: 1.3 }}>
                          {step.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', color: dim, lineHeight: 1.5, mt: 0.3 }}>
                          {step.description}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>

              <Box
                sx={{
                  borderLeft: `3px solid ${palette.amber}`,
                  bgcolor: 'rgba(244,192,56,0.08)',
                  px: 2.5,
                  py: 1.8,
                  borderRadius: '0 8px 8px 0',
                  fontSize: '0.95rem',
                  lineHeight: 1.55,
                  color: palette.paper,
                }}
              >
                {c.guarantee}
              </Box>
            </AnimatedSection>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
