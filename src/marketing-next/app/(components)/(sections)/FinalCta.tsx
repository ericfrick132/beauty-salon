'use client';
import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Stack } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { useSignupModal } from './SignupModal';
import { finalCtaContent } from '@/app/(lib)/content';
import { palette } from '@/app/(lib)/theme';

function sanitizeSubdomain(value: string): string {
  const normalized = value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export default function FinalCta() {
  const { open } = useSignupModal();
  const [subdomain, setSubdomain] = useState('');
  const display = subdomain || 'tunegocio';

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 10, md: 16 },
        bgcolor: palette.ink,
        color: palette.paper,
        borderTop: `1.5px solid ${palette.ink}`,
        overflow: 'hidden',
      }}
    >
      {/* Big editorial typography mark in background */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: { xs: -60, md: -80 },
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-fraunces), serif',
          fontWeight: 600,
          fontVariationSettings: '"opsz" 144, "SOFT" 100',
          fontSize: { xs: '12rem', md: '22rem' },
          lineHeight: 0.85,
          color: 'transparent',
          WebkitTextStrokeWidth: '1.5px',
          WebkitTextStrokeColor: 'rgba(244,239,230,0.08)',
          letterSpacing: '-0.03em',
          pointerEvents: 'none',
          userSelect: 'none',
          fontStyle: 'italic',
        }}
      >
        empezá hoy
      </Box>

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <AnimatedSection>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: palette.amber,
              }}
            >
              <Box component="span" sx={{ width: 36, height: '1.5px', bgcolor: palette.amber }} />
              Nº 08 · Empezá ahora
              <Box component="span" sx={{ width: 36, height: '1.5px', bgcolor: palette.amber }} />
            </Box>
          </Box>
        </AnimatedSection>

        <AnimatedSection>
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              fontSize: { xs: '2.2rem', md: '3.6rem', lg: '4.2rem' },
              fontVariationSettings: '"opsz" 144, "SOFT" 80',
              color: palette.paper,
              mb: 4,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
            }}
          >
            {finalCtaContent.headline.split('al siguiente nivel')[0]}
            <Box component="span" sx={{ fontStyle: 'italic', color: palette.amber, fontWeight: 600 }}>
              al siguiente nivel?
            </Box>
          </Typography>
        </AnimatedSection>

        {/* URL ticket */}
        <AnimatedSection>
          <Box
            sx={{
              maxWidth: 540,
              mx: 'auto',
              mb: 3,
              border: `1.5px solid ${palette.amber}`,
              borderRadius: 2,
              bgcolor: 'rgba(244,192,56,0.06)',
              overflow: 'hidden',
              boxShadow: `5px 5px 0 ${palette.amber}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1,
                borderBottom: `1.5px dashed ${palette.amber}`,
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.62rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: palette.amber,
              }}
            >
              <span>Tu URL</span>
              <span>· en vivo en 15 min</span>
            </Box>
            <Box
              sx={{
                px: { xs: 2.5, md: 4 },
                py: { xs: 3, md: 3.5 },
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 500,
                  fontVariationSettings: '"opsz" 144',
                  fontSize: { xs: '1.4rem', md: '2rem' },
                  letterSpacing: '-0.02em',
                  color: palette.paper,
                  lineHeight: 1.1,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    color: palette.amber,
                    fontWeight: 600,
                    fontStyle: 'italic',
                    mr: 0.4,
                  }}
                >
                  {display}
                </Box>
                <Box component="span" sx={{ color: 'rgba(244,239,230,0.55)' }}>
                  .turnos-pro.com
                </Box>
              </Box>
            </Box>
          </Box>
        </AnimatedSection>

        <AnimatedSection>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              maxWidth: 540,
              mx: 'auto',
              mb: 4,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <TextField
              placeholder="tunegocio"
              value={subdomain}
              onChange={(e) => setSubdomain(sanitizeSubdomain(e.target.value))}
              size="medium"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: palette.paper,
                  borderRadius: 999,
                  px: 1,
                  '& fieldset': { borderColor: palette.amber, borderWidth: 1.5 },
                  '&:hover fieldset': { borderColor: `${palette.amber} !important` },
                  '&.Mui-focused fieldset': { borderColor: `${palette.amber} !important`, borderWidth: 2 },
                  '& input': { color: palette.ink, fontFamily: 'var(--font-mono), monospace' },
                  '& input::placeholder': { color: palette.inkSoft, opacity: 0.7 },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={() => open(subdomain || undefined)}
              sx={{
                whiteSpace: 'nowrap',
                bgcolor: palette.amber,
                color: palette.ink,
                fontWeight: 700,
                fontSize: '1rem',
                px: 4,
                py: 1.4,
                border: `1.5px solid ${palette.paper}`,
                boxShadow: `4px 4px 0 ${palette.paper}`,
                '&:hover': {
                  bgcolor: palette.coral,
                  color: palette.paperSoft,
                  borderColor: palette.paper,
                },
              }}
            >
              {finalCtaContent.cta}
              <Box component="span" sx={{ ml: 1 }} aria-hidden>→</Box>
            </Button>
          </Box>
        </AnimatedSection>

        <AnimatedSection>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
            sx={{ gap: 1.5, mt: 1 }}
          >
            {finalCtaContent.guarantees.map((g) => (
              <Box
                key={g}
                sx={{
                  px: 1.4,
                  py: 0.5,
                  border: `1.5px solid rgba(244,239,230,0.3)`,
                  borderRadius: 999,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(244,239,230,0.7)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.7,
                  '&::before': {
                    content: '""',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    bgcolor: palette.amber,
                  },
                }}
              >
                {g}
              </Box>
            ))}
          </Stack>

          <Typography
            sx={{
              textAlign: 'center',
              mt: 3,
              fontSize: '0.92rem',
              color: 'rgba(244,239,230,0.6)',
              maxWidth: 480,
              mx: 'auto',
            }}
          >
            {finalCtaContent.subtext}
          </Typography>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
