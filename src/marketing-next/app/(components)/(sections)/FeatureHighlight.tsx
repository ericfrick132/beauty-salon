'use client';
import { Box, Container, Typography } from '@mui/material';
import AnimatedSection from './AnimatedSection';

export default function FeatureHighlight() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 10 },
        bgcolor: '#F1F5F9',
      }}
    >
      <Container maxWidth="md">
        <AnimatedSection>
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.6,
              color: 'text.secondary',
              fontSize: { xs: '1.4rem', md: '1.8rem' },
            }}
          >
            Mientras vos descansás,{' '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary', fontStyle: 'normal' }}>
              TurnosPro
            </Box>{' '}
            potencia tu negocio las 24hs.
          </Typography>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
