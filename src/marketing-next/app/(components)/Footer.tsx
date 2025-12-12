import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import Link from 'next/link';

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid #1f2a37', py: 4, mt: 8, bgcolor: '#0B0F14' }}>
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">© {new Date().getFullYear()} TurnosPro</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <MuiLink component={Link} href="/terminos" underline="hover" color="inherit">Términos</MuiLink>
          <MuiLink component={Link} href="/privacidad" underline="hover" color="inherit">Privacidad</MuiLink>
          <MuiLink href="mailto:soporte@turnos-pro.com" underline="hover" color="inherit">Contacto</MuiLink>
        </Box>
      </Container>
    </Box>
  );
}

