'use client';
import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Typography, Paper, IconButton } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AnimatedSection from './AnimatedSection';
import { howItWorksSteps } from '@/app/(lib)/content';

function StepCard({ step, index }: { step: (typeof howItWorksSteps)[number]; index: number }) {
  return (
    <AnimatedSection delay={index * 0.1}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <CheckCircleOutlineIcon sx={{ color: 'secondary.main', mt: 0.3, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {step.description}
          </Typography>
          {step.time && (
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {step.time}
            </Typography>
          )}
        </Box>
      </Box>
    </AnimatedSection>
  );
}

function CarouselSlide({ index }: { index: number }) {
  const colors = ['#2563EB', '#10B981', '#7C3AED'];
  const color = colors[index % colors.length];
  const labels = ['Crear cuenta', 'Configurar servicios', 'Compartir link'];
  return (
    <Paper
      elevation={0}
      sx={{
        aspectRatio: '9/16',
        maxHeight: 400,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${color}10, ${color}20)`,
        border: `1px solid ${color}30`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        mx: 'auto',
      }}
    >
      <svg width="120" height="200" viewBox="0 0 120 200" fill="none">
        <rect x="5" y="5" width="110" height="190" rx="16" stroke={color} strokeWidth="2" opacity="0.3" />
        <rect x="40" y="10" width="40" height="6" rx="3" fill={color} opacity="0.2" />
        <rect x="15" y="30" width="90" height="10" rx="3" fill={color} opacity="0.15" />
        <rect x="15" y="50" width="70" height="6" rx="3" fill={color} opacity="0.1" />
        <rect x="15" y="65" width="90" height="40" rx="6" fill={color} opacity="0.08" />
        <rect x="15" y="115" width="60" height="6" rx="3" fill={color} opacity="0.1" />
        <rect x="15" y="130" width="90" height="30" rx="6" fill={color} opacity="0.12" />
        <rect x="30" y="170" width="60" height="16" rx="8" fill={color} opacity="0.25" />
      </svg>
      <Typography variant="caption" sx={{ mt: 2, color, fontWeight: 600 }}>
        {labels[index]}
      </Typography>
    </Paper>
  );
}

const SLIDE_COUNT = 3;
const AUTO_PLAY_MS = 3000;

function SimpleCarousel() {
  const [active, setActive] = useState(0);

  const next = useCallback(() => setActive((a) => (a + 1) % SLIDE_COUNT), []);
  const prev = useCallback(() => setActive((a) => (a - 1 + SLIDE_COUNT) % SLIDE_COUNT), []);

  useEffect(() => {
    const id = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(id);
  }, [next]);

  return (
    <Box sx={{ position: 'relative', maxWidth: 280, mx: 'auto' }}>
      <Box sx={{ overflow: 'hidden', borderRadius: 4 }}>
        <Box
          sx={{
            display: 'flex',
            transition: 'transform 0.4s ease',
            transform: `translateX(-${active * 100}%)`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ flex: '0 0 100%', minWidth: '100%' }}>
              <CarouselSlide index={i} />
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
        <IconButton size="small" onClick={prev} sx={{ bgcolor: 'action.hover' }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: i === active ? 'primary.main' : 'action.disabled',
              transition: 'background-color 0.3s',
              alignSelf: 'center',
            }}
          />
        ))}
        <IconButton size="small" onClick={next} sx={{ bgcolor: 'action.hover' }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function HowItWorks() {
  const leftSteps = howItWorksSteps.slice(0, 3);
  const rightSteps = howItWorksSteps.slice(3);

  return (
    <Box id="como-funciona" component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <Typography
            variant="h3"
            sx={{ textAlign: 'center', fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}
          >
            Cómo funciona TurnosPro
          </Typography>
          <Typography
            variant="body1"
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 6, maxWidth: 500, mx: 'auto' }}
          >
            Implementación completa en 15 minutos.
          </Typography>
        </AnimatedSection>

        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4}>
            {leftSteps.map((step, i) => (
              <StepCard key={step.number} step={step} index={i} />
            ))}
          </Grid>

          <Grid item xs={12} md={4}>
            <AnimatedSection>
              <SimpleCarousel />
            </AnimatedSection>
          </Grid>

          <Grid item xs={12} md={4}>
            {rightSteps.map((step, i) => (
              <StepCard key={step.number} step={step} index={i + 3} />
            ))}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
