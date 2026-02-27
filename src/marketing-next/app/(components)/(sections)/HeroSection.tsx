'use client';
import { Box, Container, Typography, Button, Chip, Stack } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { heroContent } from '@/app/(lib)/content';
import { useSignupModal } from './SignupModal';

const gradientKeyframes = `
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

export default function HeroSection() {
  const { open } = useSignupModal();
  return (
    <>
      <style>{gradientKeyframes}</style>
      <Box
        id="hero"
        component="section"
        sx={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'linear-gradient(-45deg, #2563EB, #7C3AED, #EC4899, #F97316, #10B981)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
        }}
      >
        {/* Overlay for readability */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 1,
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2, textAlign: 'center', py: 8 }}>
          <Chip
            label={heroContent.eyebrow}
            sx={{
              mb: 3,
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}
          />
          <Typography
            variant="h2"
            component="h1"
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.75rem' },
              lineHeight: 1.15,
              mb: 2.5,
              letterSpacing: '-0.02em',
            }}
          >
            {heroContent.headline}
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 400,
              maxWidth: 600,
              mx: 'auto',
              mb: 4,
              fontSize: { xs: '1rem', md: '1.2rem' },
              lineHeight: 1.6,
            }}
          >
            {heroContent.subheadline}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => open()}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.05rem',
                fontWeight: 700,
                bgcolor: '#fff',
                color: '#2563EB',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}
            >
              {heroContent.cta}
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
            {heroContent.microcopy}
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
            sx={{ gap: 1.5 }}
          >
            {heroContent.trustBadges.map((badge) => (
              <Chip
                key={badge}
                icon={<VerifiedUserIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8) !important' }} />}
                label={badge}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(4px)',
                }}
              />
            ))}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
