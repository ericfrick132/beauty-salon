'use client';
import { Box, Container, Grid, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import { solutionContent } from '@/app/(lib)/content';

function PlaceholderVisual({ variant }: { variant: 'main' | 'catalog' | 'share' }) {
  const colors: Record<string, string[]> = {
    main: ['#2563EB', '#7C3AED'],
    catalog: ['#10B981', '#2563EB'],
    share: ['#EC4899', '#F97316'],
  };
  const [c1, c2] = colors[variant];
  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '4/3',
        borderRadius: 3,
        background: `linear-gradient(135deg, ${c1}22, ${c2}22)`,
        border: `1px solid ${c1}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
        <rect x="10" y="10" width="100" height="60" rx="8" stroke={c1} strokeWidth="2" opacity="0.4" />
        <rect x="20" y="22" width="40" height="4" rx="2" fill={c1} opacity="0.3" />
        <rect x="20" y="32" width="60" height="4" rx="2" fill={c2} opacity="0.2" />
        <rect x="20" y="42" width="30" height="4" rx="2" fill={c1} opacity="0.2" />
        <circle cx="90" cy="45" r="12" fill={c2} opacity="0.15" />
      </svg>
    </Box>
  );
}

export default function SolutionSection() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <PlaceholderVisual variant="main" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}>
                {solutionContent.headline}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.7 }}>
                {solutionContent.description}
              </Typography>
            </Grid>
          </Grid>
        </AnimatedSection>

        <Box sx={{ mt: { xs: 8, md: 12 } }}>
          {solutionContent.blocks.map((block, i) => (
            <AnimatedSection key={block.title} delay={i * 0.15}>
              <Grid
                container
                spacing={6}
                alignItems="center"
                direction={i % 2 === 0 ? 'row' : 'row-reverse'}
                sx={{ mb: i < solutionContent.blocks.length - 1 ? 8 : 0 }}
              >
                <Grid item xs={12} md={6}>
                  <PlaceholderVisual variant={i === 0 ? 'catalog' : 'share'} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5, letterSpacing: '-0.01em' }}>
                    {block.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {block.description}
                  </Typography>
                </Grid>
              </Grid>
            </AnimatedSection>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
