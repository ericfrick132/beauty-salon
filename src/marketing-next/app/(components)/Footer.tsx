import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import Link from 'next/link';

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid #eee', py: 4, mt: 8 }}>
      <Container maxWidth="lg" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2">© {new Date().getFullYear()} GymHero</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <MuiLink component={Link} href="/terminos" underline="hover">Términos</MuiLink>
          <MuiLink component={Link} href="/privacidad" underline="hover">Privacidad</MuiLink>
          <MuiLink href="mailto:soporte@gymhero.com" underline="hover">Contacto</MuiLink>
        </Box>
      </Container>
    </Box>
  );
}

