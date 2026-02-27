'use client';
import { Box, Container, Typography } from '@mui/material';

const scrollKeyframes = `
@keyframes logoScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

const logos = [
  { src: '/landing/assets/img/logos/mercado_pago.png', alt: 'MercadoPago' },
  { src: '/landing/assets/img/logos/whatsapp.png', alt: 'WhatsApp' },
  { src: '/landing/assets/img/logos/google_calendar.png', alt: 'Google Calendar' },
  { src: '/landing/assets/img/logos/zoom.png', alt: 'Zoom' },
  { src: '/landing/assets/img/logos/paypal.png', alt: 'PayPal' },
  { src: '/landing/assets/img/logos/google-meet-logo-1-scaled.png', alt: 'Google Meet' },
];

interface Props {
  title?: string;
}

export default function LogoCarousel({ title }: Props) {
  const allLogos = [...logos, ...logos]; // duplicate for infinite scroll

  return (
    <>
      <style>{scrollKeyframes}</style>
      <Box component="section" sx={{ py: 6, overflow: 'hidden', bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          {title && (
            <Typography
              variant="body1"
              sx={{ textAlign: 'center', mb: 4, color: 'text.secondary', fontWeight: 500 }}
            >
              {title}
            </Typography>
          )}
        </Container>
        <Box
          sx={{
            display: 'flex',
            width: 'max-content',
            animation: 'logoScroll 30s linear infinite',
            '&:hover': { animationPlayState: 'paused' },
          }}
        >
          {allLogos.map((logo, i) => (
            <Box
              key={i}
              sx={{
                flex: '0 0 auto',
                mx: 4,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.5,
                transition: 'opacity 0.3s',
                '&:hover': { opacity: 1 },
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={logo.alt}
                style={{ height: 36, width: 'auto', filter: 'grayscale(100%)' }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
}
