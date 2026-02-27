'use client';
import { Box, Container, Grid, Typography, Chip, Stack } from '@mui/material';
import AnimatedSection from './AnimatedSection';
import { businessTypesContent } from '@/app/(lib)/content';

function BusinessVisual() {
  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '4/3',
        borderRadius: 3,
        background: 'linear-gradient(135deg, #7C3AED08, #EC489915)',
        border: '1px solid #7C3AED22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="200" height="140" viewBox="0 0 200 140" fill="none">
        {/* Store front */}
        <rect x="30" y="40" width="140" height="80" rx="8" stroke="#7C3AED" strokeWidth="1.5" opacity="0.4" />
        <rect x="30" y="40" width="140" height="24" rx="8" fill="#7C3AED" opacity="0.1" />
        <text x="100" y="57" textAnchor="middle" fill="#7C3AED" fontSize="10" fontWeight="600" opacity="0.6">
          Tu Negocio
        </text>
        {/* Window panes */}
        <rect x="42" y="74" width="50" height="36" rx="4" fill="#2563EB" opacity="0.08" />
        <rect x="108" y="74" width="50" height="36" rx="4" fill="#10B981" opacity="0.08" />
        {/* Door */}
        <rect x="80" y="90" width="20" height="30" rx="3" fill="#7C3AED" opacity="0.12" />
        <circle cx="96" cy="105" r="2" fill="#7C3AED" opacity="0.3" />
        {/* Awning */}
        <path d="M25 40 L100 20 L175 40" stroke="#EC4899" strokeWidth="2" opacity="0.3" fill="none" />
      </svg>
    </Box>
  );
}

export default function BusinessTypes() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <AnimatedSection direction="left">
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}>
                {businessTypesContent.headline}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
                {businessTypesContent.description}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {businessTypesContent.types.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    variant="outlined"
                    sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                  />
                ))}
              </Stack>
            </AnimatedSection>
          </Grid>
          <Grid item xs={12} md={6}>
            <AnimatedSection direction="right">
              <BusinessVisual />
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
