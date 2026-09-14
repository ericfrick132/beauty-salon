'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import Header from '@/app/(components)/Header';
import { SignupModalProvider, useSignupModal } from '@/app/(components)/(sections)/SignupModal';
import { palette } from '@/app/(lib)/theme';
import { trackDemoView } from '@/app/(lib)/demoTracking';
import BookingApp from './BookingApp';

export default function DemoAppPage() {
  return (
    <SignupModalProvider>
      <Header />
      <DemoAppContent />
    </SignupModalProvider>
  );
}

function DemoAppContent() {
  const { open } = useSignupModal();
  const [today, setToday] = useState<Date | null>(null);

  // Horarios y fechas dependen de hoy: la app se monta recién en el cliente.
  useEffect(() => {
    setToday(new Date());
    trackDemoView('demo-app');
  }, []);

  return (
    <Box component="main" sx={{ py: { xs: 5, md: 8 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gap: { xs: 5, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
          <Box>
            <Box className="tp-rule" sx={{ mb: 2.5 }}>Demo interactiva · lo que ve tu cliente</Box>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.2rem', md: '4rem' }, color: palette.ink, mb: 2.5, fontVariationSettings: '"opsz" 144, "SOFT" 50' }}>
              Así reservan{' '}
              <Box component="span" sx={{ color: palette.coral, fontStyle: 'italic' }}>tus clientes.</Box>
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, color: palette.inkSoft, maxWidth: 520, lineHeight: 1.6, mb: 3 }}>
              Entran a tu link, eligen servicio, profesional y horario, y si hace falta pagan la seña con MercadoPago. Sin apps ni descargas. Tocá todo: es la página real, con datos de ejemplo.
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mb: 4, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {[
                'Reservá un turno en 4 pasos, como lo haría tu cliente',
                'Elegí “Coloración” para ver el pago de la seña con MercadoPago',
                'Al confirmar, respondé el WhatsApp del bot con SI o NO',
              ].map((t) => (
                <Box component="li" key={t} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', color: palette.ink }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: palette.forest, color: palette.paper, display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>✓</Box>
                  {t}
                </Box>
              ))}
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
              <Button variant="contained" color="primary" size="large" onClick={() => open()} sx={{ px: 3.5, py: 1.4, fontSize: '1rem' }}>
                Quiero mi sitio de reservas →
              </Button>
              <Button variant="outlined" size="large" href="/demo-admin" sx={{ px: 3, py: 1.4, fontSize: '1rem' }}>
                Ver demo del panel
              </Button>
            </Stack>
            <Link href="/" style={{ color: palette.inkSoft, fontFamily: 'var(--font-mono), monospace', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ← Volver al inicio
            </Link>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                position: 'relative', width: 'min(380px, 100%)', height: { xs: '78vh', md: 'min(780px, 84vh)' }, minHeight: 620,
                p: { xs: '8px', sm: '12px' }, borderRadius: { xs: '40px', sm: '48px' }, bgcolor: palette.ink,
                border: `1.5px solid ${palette.ink}`, boxShadow: `8px 8px 0 ${palette.coral}`,
              }}
            >
              <Box aria-hidden sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 96, height: 26, borderRadius: 999, bgcolor: '#000', zIndex: 30 }} />
              <Box sx={{ position: 'relative', height: '100%', borderRadius: { xs: '32px', sm: '36px' }, overflow: 'hidden', bgcolor: palette.paper }}>
                {today ? <BookingApp today={today} /> : <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: palette.inkMute }}>Cargando…</Box>}
              </Box>
            </Box>
            <Typography sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.inkMute, textAlign: 'center' }}>
              Interactuá: elegí, reservá, pagá la seña.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
