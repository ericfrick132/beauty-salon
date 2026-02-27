'use client';
import { Box, Container, Grid, Paper, Typography, Rating, Avatar } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import AnimatedSection from './AnimatedSection';
import { testimonials } from '@/app/(lib)/content';

export default function TestimonialsSection() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <Typography
            variant="h3"
            sx={{ textAlign: 'center', fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}
          >
            Lo que dicen nuestros clientes
          </Typography>
          <Typography
            variant="body1"
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 6, maxWidth: 500, mx: 'auto' }}
          >
            Negocios reales que transformaron su gestión de turnos.
          </Typography>
        </AnimatedSection>

        <Grid container spacing={3}>
          {testimonials.map((t, i) => (
            <Grid item xs={12} md={4} key={t.name}>
              <AnimatedSection delay={i * 0.1}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <FormatQuoteIcon sx={{ color: 'primary.main', fontSize: 32, mb: 1.5, opacity: 0.5 }} />
                  <Typography
                    variant="body1"
                    sx={{ fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.7, mb: 3, flex: 1 }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 16 }}>
                      {t.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t.role}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto' }}>
                      <Rating value={t.rating} readOnly size="small" />
                    </Box>
                  </Box>
                </Paper>
              </AnimatedSection>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
