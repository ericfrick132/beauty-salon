'use client';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentIcon from '@mui/icons-material/Payment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import AnimatedSection from './AnimatedSection';
import { features } from '@/app/(lib)/content';
import type { SvgIconComponent } from '@mui/icons-material';

const iconMap: Record<string, SvgIconComponent> = {
  Storefront: StorefrontIcon,
  MenuBook: MenuBookIcon,
  EventAvailable: EventAvailableIcon,
  Payment: PaymentIcon,
  NotificationsActive: NotificationsActiveIcon,
  People: PeopleIcon,
};

export default function FeatureGrid() {
  return (
    <Box id="beneficios" component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <Typography
            variant="h3"
            sx={{ textAlign: 'center', fontWeight: 700, mb: 2, letterSpacing: '-0.02em' }}
          >
            Todo en un solo lugar
          </Typography>
          <Typography
            variant="body1"
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 6, maxWidth: 600, mx: 'auto' }}
          >
            Las herramientas que necesitás para gestionar tu negocio de turnos, integradas en una sola plataforma.
          </Typography>
        </AnimatedSection>
        <Grid container spacing={3}>
          {features.map((feat, i) => {
            const Icon = iconMap[feat.icon];
            return (
              <Grid item xs={12} sm={6} md={4} key={feat.title}>
                <AnimatedSection delay={i * 0.08}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3.5,
                      height: '100%',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Icon sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {feat.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      {feat.description}
                    </Typography>
                  </Paper>
                </AnimatedSection>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
