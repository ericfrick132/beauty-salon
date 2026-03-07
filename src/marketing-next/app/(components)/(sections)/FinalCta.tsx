'use client';
import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Stack, Chip } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AnimatedSection from './AnimatedSection';
import { useSignupModal } from './SignupModal';
import { finalCtaContent } from '@/app/(lib)/content';

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

  const displaySubdomain = subdomain || 'tunegocio';

  const handleStart = () => {
    open(subdomain || undefined);
  };

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
        color: '#fff',
      }}
    >
      <Container maxWidth="sm">
        <AnimatedSection>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              mb: 3,
              letterSpacing: '-0.02em',
              color: '#fff',
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            {finalCtaContent.headline}
          </Typography>

          {/* Live URL preview */}
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              mb: 3,
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.15rem' },
            }}
          >
            <Box
              component="span"
              sx={{ color: '#60a5fa', fontWeight: 600 }}
            >
              {displaySubdomain}
            </Box>
            .turnos-pro.com
          </Typography>

          {/* Input + Button */}
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              mb: 4,
              flexDirection: { xs: 'column', sm: 'row' },
              maxWidth: 440,
              mx: 'auto',
            }}
          >
            <TextField
              placeholder="tunegocio"
              value={subdomain}
              onChange={(e) => setSubdomain(sanitizeSubdomain(e.target.value))}
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.95)',
                  borderRadius: 2,
                  '& input::placeholder': { color: '#94a3b8' },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleStart}
              sx={{
                px: 4,
                py: 1,
                whiteSpace: 'nowrap',
                bgcolor: '#2563EB',
                fontSize: '1rem',
                fontWeight: 700,
                '&:hover': { bgcolor: '#1d4ed8' },
                flexShrink: 0,
              }}
            >
              {finalCtaContent.cta}
            </Button>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            {finalCtaContent.guarantees.map((g) => (
              <Chip
                key={g}
                icon={<VerifiedUserIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7) !important' }} />}
                label={g}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </Stack>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
