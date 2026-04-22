'use client';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { heroContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';
import { useSignupModal } from './SignupModal';
import BookingTicket from './BookingTicket';

function FadeUp({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  const { open } = useSignupModal();

  return (
    <Box
      id="hero"
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: palette.paper,
        borderBottom: `1.5px solid ${palette.ink}`,
        pt: { xs: 8, md: 12 },
        pb: { xs: 14, md: 18 },
      }}
    >
      {/* Editorial corner marks */}
      <CornerMarks />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 7, md: 6 },
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
            alignItems: 'center',
          }}
        >
          {/* LEFT — typography */}
          <Box>
            <FadeUp delay={0}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1.2,
                  px: 1.4,
                  py: 0.6,
                  border: `1.5px solid ${palette.ink}`,
                  borderRadius: 999,
                  bgcolor: palette.paperSoft,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: palette.ink,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: palette.forest,
                    display: 'inline-block',
                  }}
                />
                Turnos · Cobros · WhatsApp
              </Box>
            </FadeUp>

            <FadeUp delay={0.08}>
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  mt: 3,
                  mb: 3.5,
                  fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.4rem', lg: '5rem' },
                  fontVariationSettings: '"opsz" 144, "SOFT" 50',
                  color: palette.ink,
                }}
              >
                Agendá{' '}
                <Box
                  component="span"
                  sx={{
                    position: 'relative',
                    display: 'inline-block',
                    px: 0.4,
                  }}
                >
                  más
                  {/* Hand-drawn underline */}
                  <Box
                    component="svg"
                    aria-hidden
                    viewBox="0 0 180 24"
                    preserveAspectRatio="none"
                    sx={{
                      position: 'absolute',
                      left: '-2%',
                      bottom: '-12px',
                      width: '104%',
                      height: '0.45em',
                      color: palette.coral,
                      pointerEvents: 'none',
                    }}
                  >
                    <path
                      d="M2 14 Q 30 4 60 12 T 120 10 T 178 16"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </Box>
                </Box>{' '}
                con tu sitio listo
                <br />
                para reservas
                <Box
                  component="span"
                  sx={{
                    color: palette.coral,
                    fontFamily: 'inherit',
                    fontStyle: 'italic',
                  }}
                >
                  .
                </Box>
              </Typography>
            </FadeUp>

            <FadeUp delay={0.16}>
              <Typography
                sx={{
                  fontSize: { xs: '1.05rem', md: '1.18rem' },
                  color: palette.inkSoft,
                  maxWidth: 520,
                  lineHeight: 1.55,
                  mb: 4,
                }}
              >
                Publicá tu web de turnos, activá pagos anticipados y recordatorios
                por WhatsApp.{' '}
                <Box component="span" sx={{ color: palette.ink, fontWeight: 600 }}>
                  Sin apps ni descargas.
                </Box>
              </Typography>
            </FadeUp>

            <FadeUp delay={0.24}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ mb: 3 }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  href="/register"
                  sx={{ px: 3.5, py: 1.4, fontSize: '1rem' }}
                >
                  {heroContent.cta}
                  <Box
                    component="span"
                    aria-hidden
                    sx={{ ml: 1, display: 'inline-block', transition: 'transform 200ms' }}
                  >
                    →
                  </Box>
                </Button>
                <Button
                  variant="text"
                  size="large"
                  href="#como-funciona"
                  sx={{
                    px: 2,
                    py: 1.4,
                    fontSize: '1rem',
                    color: palette.ink,
                    '&:hover': { background: 'transparent', color: palette.coral },
                  }}
                >
                  Ver cómo funciona
                </Button>
              </Stack>
            </FadeUp>

            <FadeUp delay={0.32}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: { xs: 1.5, md: 2.5 },
                  pt: 2.5,
                  borderTop: `1.5px dashed ${palette.ink}`,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: palette.inkSoft,
                  maxWidth: 520,
                }}
              >
                <Box component="span">{heroContent.microcopy}</Box>
                {heroContent.trustBadges.map((b) => (
                  <Box
                    key={b}
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.7,
                      '&::before': {
                        content: '""',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: palette.ink,
                        opacity: 0.4,
                        display: 'inline-block',
                      },
                    }}
                  >
                    {b}
                  </Box>
                ))}
              </Box>
            </FadeUp>
          </Box>

          {/* RIGHT — booking artifact */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: { xs: 380, md: 480 },
            }}
          >
            <BookingTicket />
          </Box>
        </Box>

        {/* Stats bar at the bottom */}
        <FadeUp delay={0.4}>
          <Box
            sx={{
              mt: { xs: 8, md: 10 },
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              border: `1.5px solid ${palette.ink}`,
              borderRadius: 2,
              bgcolor: palette.paperSoft,
              overflow: 'hidden',
            }}
          >
            {[
              { num: '80%', label: 'menos no-shows' },
              { num: '24/7', label: 'reservas online' },
              { num: '15 min', label: 'puesta a punto' },
              { num: '+1.200', label: 'turnos por mes' },
            ].map((s, i) => (
              <Box
                key={s.label}
                sx={{
                  px: { xs: 2, md: 3 },
                  py: { xs: 2.5, md: 3 },
                  borderRight: { md: i < 3 ? `1.5px solid ${palette.ink}` : 'none' },
                  borderBottom: { xs: i < 2 ? `1.5px solid ${palette.ink}` : 'none', md: 'none' },
                  ...(i === 1 && { borderRight: `1.5px solid ${palette.ink}` }),
                  textAlign: { xs: 'left', md: 'left' },
                }}
              >
                <Box
                  sx={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontWeight: 500,
                    fontVariationSettings: '"opsz" 100',
                    fontSize: { xs: '1.7rem', md: '2.2rem' },
                    lineHeight: 1,
                    color: palette.ink,
                    mb: 0.6,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.num}
                </Box>
                <Box
                  sx={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '0.7rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: palette.inkSoft,
                  }}
                >
                  {s.label}
                </Box>
              </Box>
            ))}
          </Box>
        </FadeUp>
      </Container>
    </Box>
  );
}

function CornerMarks() {
  // Editorial crop-mark corners — pure decoration.
  const mark = (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 32 32"
      sx={{ width: 22, height: 22, color: palette.ink }}
    >
      <path d="M2 12 L2 2 L12 2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </Box>
  );
  return (
    <>
      <Box sx={{ position: 'absolute', top: 14, left: 14, transform: 'rotate(0deg)' }}>{mark}</Box>
      <Box sx={{ position: 'absolute', top: 14, right: 14, transform: 'rotate(90deg)' }}>{mark}</Box>
      <Box sx={{ position: 'absolute', bottom: 14, left: 14, transform: 'rotate(-90deg)' }}>{mark}</Box>
      <Box sx={{ position: 'absolute', bottom: 14, right: 14, transform: 'rotate(180deg)' }}>{mark}</Box>
    </>
  );
}
