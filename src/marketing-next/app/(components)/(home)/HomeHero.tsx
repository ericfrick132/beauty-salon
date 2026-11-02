'use client';
import { Box, Typography } from '@mui/material';
import { useSignupModal } from '../(sections)/SignupModal';
import { ProofPill } from './SocialProof';
import { BookingPageMock, DepositMock } from './Mocks';
import { Accent, PrimaryButton, SecondaryButton, Wrap, home, sans, titleSx } from './ui';

/** Video cinemático de fondo (Higgsfield, 7 s en loop, sin audio) y su póster. Versionados: nginx los cachea 1 año. */
const HERO_VIDEO = '/media/hero-salon-v1.mp4';
const HERO_POSTER = '/media/hero-salon-v1.jpg';

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

        {/* Producto "en vivo" sobre el video cinemático del salón (card #22): el titular queda en
            crema y legible; el video es el fondo del bloque, con las tarjetas blancas encima. Con
            movimiento reducido se ve solo el póster (mismo encuadre, fondo del bloque). */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate',
            mt: { xs: 5, md: 8 },
            bgcolor: home.cardAlt,
            backgroundImage: `url(${HERO_POSTER})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: home.radius,
            border: `1px solid ${home.line}`,
            p: { xs: 2, sm: 3, md: 5 },
            display: 'grid',
            gap: { xs: 2.5, md: 4 },
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            alignItems: 'center',
          }}
        >
          <Box
            component="video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_POSTER}
            aria-hidden
            tabIndex={-1}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: -2,
              '@media (prefers-reduced-motion: reduce)': { display: 'none' },
            }}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </Box>
          {/* Velo cálido: baja el contraste del video para que las tarjetas manden. */}
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: -1, background: 'linear-gradient(180deg, rgba(23,20,16,0.10) 0%, rgba(23,20,16,0.28) 100%)' }} />
          <BookingPageMock />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <DepositMock />
          </Box>
        </Box>
      </Wrap>
    </Box>
  );
}
