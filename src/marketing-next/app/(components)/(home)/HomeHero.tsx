'use client';
import { Box, Typography } from '@mui/material';
import { useSignupModal } from '../(sections)/SignupModal';
import { ProofPill } from './SocialProof';
import { BookingPageMock, DepositMock } from './Mocks';
import { Accent, PrimaryButton, SecondaryButton, Wrap, home, sans, titleSx } from './ui';

export default function HomeHero() {
  const { open } = useSignupModal();
  return (
    <Box component="section" sx={{ pt: { xs: 5, md: 9 }, pb: { xs: 6, md: 10 } }}>
      <Wrap>
        <Box sx={{ textAlign: 'center', maxWidth: 860, mx: 'auto' }}>
          <ProofPill />
          <Typography component="h1" sx={{ ...titleSx, mt: { xs: 3, md: 3.5 }, fontSize: { xs: '2.6rem', sm: '3.5rem', md: '4.6rem' }, letterSpacing: '-0.045em', lineHeight: 1 }}>
            Tu agenda <Accent>llena</Accent>, sin contestar un mensaje.
          </Typography>
          <Typography sx={{ mt: { xs: 2.5, md: 3 }, mx: 'auto', maxWidth: 620, fontFamily: sans, fontSize: { xs: '1.05rem', md: '1.25rem' }, color: home.inkSoft, lineHeight: 1.5, letterSpacing: '-0.01em' }}>
            Link de reservas, señas por Mercado Pago y recordatorios por WhatsApp. Gratis para empezar.
          </Typography>
          <Box sx={{ mt: { xs: 3.5, md: 4 }, display: 'flex', gap: 1.25, justifyContent: 'center', flexWrap: 'wrap' }}>
            <PrimaryButton onClick={() => open()}>Empezá gratis</PrimaryButton>
            <SecondaryButton href="/login" external>Entrar</SecondaryButton>
          </Box>
          <Typography sx={{ mt: 2, fontFamily: sans, fontSize: '0.88rem', color: home.inkSoft }}>
            $0 por mes. Sin tarjeta. Pasate de plan cuando lo necesites.
          </Typography>
        </Box>

        {/* Producto "en vivo": la página de reservas y el ticket con la seña. */}
        <Box
          sx={{
            mt: { xs: 5, md: 8 },
            bgcolor: home.cardAlt,
            borderRadius: home.radius,
            border: `1px solid ${home.line}`,
            p: { xs: 2, sm: 3, md: 5 },
            display: 'grid',
            gap: { xs: 2.5, md: 4 },
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            alignItems: 'center',
          }}
        >
          <BookingPageMock />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <DepositMock />
          </Box>
        </Box>
      </Wrap>
    </Box>
  );
}
