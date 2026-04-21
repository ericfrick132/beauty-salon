'use client';
import { Box, Container } from '@mui/material';
import { palette } from '@/app/(lib)/theme';

const logos = [
  { src: '/landing/assets/img/logos/mercado_pago.png', alt: 'MercadoPago' },
  { src: '/landing/assets/img/logos/whatsapp.png', alt: 'WhatsApp' },
  { src: '/landing/assets/img/logos/google_calendar.png', alt: 'Google Calendar' },
  { src: '/landing/assets/img/logos/zoom.png', alt: 'Zoom' },
  { src: '/landing/assets/img/logos/paypal.png', alt: 'PayPal' },
  { src: '/landing/assets/img/logos/google-meet-logo-1-scaled.png', alt: 'Google Meet' },
];

const scrollKeyframes = `
@keyframes tpLogoScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

interface Props {
  title?: string;
}

export default function LogoCarousel({ title }: Props) {
  const all = [...logos, ...logos];
  return (
    <>
      <style>{scrollKeyframes}</style>
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 5 },
          bgcolor: palette.paperDeep,
          borderTop: `1.5px solid ${palette.ink}`,
          borderBottom: `1.5px solid ${palette.ink}`,
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg" sx={{ mb: title ? 3 : 0 }}>
          {title && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: palette.ink,
              }}
            >
              <Box sx={{ flex: 1, height: '1.5px', bgcolor: palette.ink }} />
              <Box component="span">{title}</Box>
              <Box sx={{ flex: 1, height: '1.5px', bgcolor: palette.ink }} />
            </Box>
          )}
        </Container>
        <Box
          sx={{
            display: 'flex',
            width: 'max-content',
            animation: 'tpLogoScroll 38s linear infinite',
            '&:hover': { animationPlayState: 'paused' },
          }}
        >
          {all.map((logo, i) => (
            <Box
              key={i}
              sx={{
                flex: '0 0 auto',
                mx: { xs: 3, md: 5 },
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={logo.alt}
                style={{
                  height: 28,
                  width: 'auto',
                  filter: 'grayscale(100%) contrast(1.1) brightness(0.4)',
                  opacity: 0.85,
                }}
              />
              {/* Editorial divider dot between logos */}
              {i < all.length - 1 && (
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: palette.ink,
                    opacity: 0.3,
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
}
