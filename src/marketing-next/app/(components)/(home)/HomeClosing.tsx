'use client';
import { Box, Typography } from '@mui/material';
import { SignupForm } from '../(sections)/SignupModal';
import { ProofCard, RealTestimonials } from './SocialProof';
import { Accent, Wrap, home, sans, titleSx } from './ui';

/**
 * Cierre: título corto + alta inline (#registro). Estilo Ascend: el formulario en una card y,
 * debajo, la card de prueba social con los contadores reales.
 */
export default function HomeClosing() {
  return (
    <Box id="registro" component="section" sx={{ py: { xs: 7, md: 12 }, scrollMarginTop: 96 }}>
      <Wrap>
        <Box sx={{ mb: { xs: 5, md: 7 } }}>
          <RealTestimonials />
        </Box>
        <Box sx={{ display: 'grid', gap: { xs: 4, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '1fr 440px' }, alignItems: 'center' }}>
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography component="h2" sx={{ ...titleSx, fontSize: { xs: '2.4rem', sm: '3rem', md: '4rem' }, letterSpacing: '-0.045em', lineHeight: 1 }}>
              Tu link de reservas, <Accent>listo hoy.</Accent>
            </Typography>
            <Typography sx={{ mt: 2.5, fontFamily: sans, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: home.inkSoft, lineHeight: 1.5, maxWidth: 480, mx: { xs: 'auto', md: 0 } }}>
              Creá tu cuenta, cargá servicios y horarios, y compartí tu link. $0 por mes, sin tarjeta.
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box sx={{ bgcolor: '#fff', borderRadius: home.radius, border: `1px solid ${home.line}`, boxShadow: home.shadow, p: { xs: 2.5, sm: 3.5 } }}>
              <SignupForm variant="inline" />
            </Box>
            <ProofCard />
          </Box>
        </Box>
      </Wrap>
    </Box>
  );
}
