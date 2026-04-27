import React from 'react';
import { Box, Container, Typography, Button, Paper, Link as MuiLink } from '@mui/material';
import { CalendarMonth, Login as LoginIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

const TenantLanding: React.FC = () => {
  const { config, getTerm } = useTenant();

  const businessName = config?.businessName || 'Turnos Pro';
  const bookingTerm = (() => {
    const term = getTerm('booking');
    return term && term !== 'booking' ? term : 'turno';
  })();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-primary, #2563EB) 0%, var(--color-secondary, #0EA5E9) 100%)',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 3,
            textAlign: 'center',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            {businessName}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Reservá tu {bookingTerm.toLowerCase()} en línea, fácil y rápido.
          </Typography>

          <Button
            component={RouterLink}
            to="/book"
            variant="contained"
            size="large"
            startIcon={<CalendarMonth />}
            fullWidth
            sx={{
              py: 1.75,
              fontSize: '1.05rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Reservar {bookingTerm.toLowerCase()}
          </Button>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <MuiLink
              component={RouterLink}
              to="/login"
              underline="hover"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.85rem',
                color: 'text.secondary',
              }}
            >
              <LoginIcon fontSize="small" />
              Acceso administradores
            </MuiLink>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TenantLanding;
