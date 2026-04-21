'use client';
import { Box, Container } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import { palette } from '@/app/(lib)/theme';

export default function FeatureHighlight() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 9, md: 13 },
        bgcolor: palette.ink,
        color: palette.paper,
        borderTop: `1.5px solid ${palette.ink}`,
        borderBottom: `1.5px solid ${palette.ink}`,
        overflow: 'hidden',
      }}
    >
      {/* Big "24" graphic mark */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: -40, md: 40 },
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-fraunces), serif',
          fontWeight: 600,
          fontSize: { xs: '14rem', md: '22rem' },
          lineHeight: 0.85,
          color: 'transparent',
          WebkitTextStrokeWidth: '2px',
          WebkitTextStrokeColor: palette.amber,
          fontVariationSettings: '"opsz" 144, "SOFT" 100',
          opacity: 0.4,
          letterSpacing: '-0.05em',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        24
      </Box>

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <AnimatedSection>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.2,
              px: 1.5,
              py: 0.6,
              border: `1.5px solid ${palette.amber}`,
              borderRadius: 999,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: palette.amber,
              mb: 4,
            }}
          >
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: palette.amber,
                animation: 'tpPulse 1.6s ease-in-out infinite',
                '@keyframes tpPulse': {
                  '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
                  '50%': { opacity: 1, transform: 'scale(1.3)' },
                },
              }}
            />
            Nunca duerme
          </Box>

          <Box
            sx={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 500,
              fontVariationSettings: '"opsz" 144, "SOFT" 80',
              fontSize: { xs: '2rem', sm: '2.6rem', md: '3.6rem' },
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: palette.paper,
              maxWidth: 760,
            }}
          >
            Mientras vos descansás,{' '}
            <Box
              component="span"
              sx={{
                color: palette.amber,
                fontStyle: 'italic',
                fontWeight: 600,
              }}
            >
              TurnosPro
            </Box>{' '}
            potencia tu negocio las{' '}
            <Box
              component="span"
              sx={{
                position: 'relative',
                display: 'inline-block',
                color: palette.coral,
                fontStyle: 'italic',
                fontWeight: 600,
              }}
            >
              24 horas
              <Box
                component="svg"
                aria-hidden
                viewBox="0 0 220 14"
                preserveAspectRatio="none"
                sx={{
                  position: 'absolute',
                  left: 0,
                  bottom: '-8px',
                  width: '100%',
                  height: '0.3em',
                  color: palette.coral,
                }}
              >
                <path
                  d="M2 8 Q 50 2 110 7 T 218 6"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </Box>
            </Box>
            <Box component="span" sx={{ color: palette.amber }}>.</Box>
          </Box>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
