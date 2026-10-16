'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [caption, setCaption] = useState('');
  const [run, setRun] = useState(0);
  const [isPhone, setIsPhone] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Horarios y fechas dependen de hoy: la app se monta recién en el cliente.
  // En un celular la demo se abre directo a pantalla completa (una sola instancia de la app a la vez).
  useEffect(() => {
    const mq = window.matchMedia(PHONE_MQ);
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    setToday(new Date());
    trackDemoView('demo-app');
    const t = window.setTimeout(() => setIntroDone(true), 2300);
    return () => { mq.removeEventListener('change', sync); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (!isPhone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isPhone]);

  // La demo arranca sola recién cuando el celular está a la vista (en mobile queda abajo del texto).
  useEffect(() => {
    const el = phoneRef.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, today]);

  const replay = () => { setRun((r) => r + 1); setCaption(''); setAuto(true); };
  const app = today && (
    <BookingApp
      key={run}
      today={today}
      fullscreen={isPhone}
      autoplay={auto && (isPhone ? introDone : inView)}
      onCaption={setCaption}
      onTakeover={() => setAuto(false)}
    />
  );

  return (
    <>
    <PhoneFullscreen app={isPhone ? app : null} auto={auto} caption={caption} introDone={introDone} onReplay={replay} onSignup={() => open()} />
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
              Entran a tu link, eligen servicio, profesional y horario, y si hace falta pagan la seña con MercadoPago. Sin apps ni descargas. Mirá cómo se completa una reserva, o tocá la pantalla y probala vos: es la página real, con datos de ejemplo.
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
              ref={phoneRef}
              sx={{
                position: 'relative', width: 'min(380px, 100%)', height: { xs: '78vh', md: 'min(780px, 84vh)' }, minHeight: 620,
                p: { xs: '8px', sm: '12px' }, borderRadius: { xs: '40px', sm: '48px' }, bgcolor: palette.ink,
                border: `1.5px solid ${palette.ink}`, boxShadow: `8px 8px 0 ${palette.coral}`,
              }}
            >
              <Box aria-hidden sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 96, height: 26, borderRadius: 999, bgcolor: '#000', zIndex: 30 }} />
              <Box sx={{ position: 'relative', height: '100%', borderRadius: { xs: '32px', sm: '36px' }, overflow: 'hidden', bgcolor: palette.paper }}>
                {today && !isPhone ? app : <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', color: palette.inkMute }}>Cargando…</Box>}
              </Box>
            </Box>
            {auto ? (
              <Box sx={{ minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: palette.ink, fontWeight: 600, fontSize: '0.98rem' }}>
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: palette.coral, flexShrink: 0, animation: 'tpLive 1.4s ease-in-out infinite', '@keyframes tpLive': { '50%': { opacity: 0.25 } } }} />
                  <Box key={caption} component="span" sx={{ animation: 'tpCap 300ms ease', '@keyframes tpCap': { from: { opacity: 0, transform: 'translateY(4px)' } } }}>
                    {caption || 'Demo en vivo'}
                  </Box>
                </Box>
                <Typography sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.inkMute }}>
                  Tocá la pantalla para probarla vos
                </Typography>
              </Box>
            ) : (
              <Box sx={{ minHeight: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.inkMute, textAlign: 'center' }}>
                  Interactuá: elegí, reservá, pagá la seña.
                </Typography>
                <Button size="small" variant="outlined" onClick={replay} sx={{ borderRadius: 999, px: 2 }}>
                  ▶ Ver la demo automática
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
    </>
  );
}

const PHONE_MQ = '(max-width: 599.95px)';

// Vista para celulares reales: la demo ocupa toda la pantalla, como si el visitante abriera el link del negocio.
// Se muestra por CSS desde el primer pintado (el HTML estático ya la trae), así no aparece el layout de desktop.
function PhoneFullscreen({ app, auto, caption, introDone, onReplay, onSignup }: {
  app: React.ReactNode;
  auto: boolean;
  caption: string;
  introDone: boolean;
  onReplay: () => void;
  onSignup: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'none', [`@media ${PHONE_MQ}`]: { display: 'flex' },
        position: 'fixed', inset: 0, zIndex: 1250, flexDirection: 'column', bgcolor: palette.ink, height: '100dvh',
      }}
    >
      {/* Barra superior: marca + CTA */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 2, pt: 'max(10px, env(safe-area-inset-top))', pb: 1.25, color: palette.paper,
          animation: 'tpDown 600ms 1.9s cubic-bezier(.2,.9,.3,1) both', '@keyframes tpDown': { from: { opacity: 0, transform: 'translateY(-100%)' } },
        }}
      >
        <Link href="/" aria-label="Volver al inicio" style={{ display: 'flex', alignItems: 'center', gap: 8, color: palette.paper, textDecoration: 'none' }}>
          <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: palette.paper, color: palette.ink, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600, fontSize: 16 }}>T</Box>
          <Box component="span" sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 17, fontWeight: 500 }}>
            Turnos<Box component="span" sx={{ color: palette.coral, fontStyle: 'italic' }}>Pro</Box>
          </Box>
        </Link>
        <Box component="span" sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', px: 0.9, py: 0.3, border: `1px solid rgba(244,239,230,0.35)`, borderRadius: 999, color: 'rgba(244,239,230,0.8)' }}>Demo</Box>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" color="secondary" onClick={onSignup} sx={{ borderRadius: 999, px: 1.75, py: 0.5, fontSize: '0.8rem', boxShadow: 'none', whiteSpace: 'nowrap' }}>
          Quiero el mío
        </Button>
      </Box>

      {/* La app, con esquinas de pantalla de celular */}
      <Box
        sx={{
          position: 'relative', flex: 1, minHeight: 0, mx: 0.75, borderRadius: '22px', overflow: 'hidden', bgcolor: palette.paper,
          animation: 'tpRise 700ms 1.8s cubic-bezier(.2,.9,.3,1) both', '@keyframes tpRise': { from: { opacity: 0, transform: 'translateY(40px) scale(0.96)' } },
        }}
      >
        {app}
      </Box>

      {/* Barra de estado: qué está pasando, o el botón para volver a verla */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, px: 2, pt: 1.25, pb: 'max(12px, env(safe-area-inset-bottom))', color: palette.paper, minHeight: 64,
          animation: 'tpUp 600ms 2s cubic-bezier(.2,.9,.3,1) both', '@keyframes tpUp': { from: { opacity: 0, transform: 'translateY(100%)' } },
        }}
      >
        {auto ? (
          <>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: palette.coral, flexShrink: 0, animation: 'tpLive 1.4s ease-in-out infinite', '@keyframes tpLive': { '50%': { opacity: 0.25 } } }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box key={caption} sx={{ fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.25, animation: 'tpCap 350ms ease', '@keyframes tpCap': { from: { opacity: 0, transform: 'translateY(6px)' } } }}>
                {caption || 'Demo en vivo'}
              </Box>
              <Box sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(244,239,230,0.55)', mt: 0.25 }}>
                Tocá la pantalla para probarla vos
              </Box>
            </Box>
          </>
        ) : (
          <>
            <Button size="small" variant="outlined" onClick={onReplay} sx={{ borderRadius: 999, color: palette.paper, borderColor: 'rgba(244,239,230,0.4)', whiteSpace: 'nowrap', '&:hover': { borderColor: palette.paper } }}>
              ▶ Demo automática
            </Button>
            <Box sx={{ flex: 1 }} />
            <Link href="/demo-admin" style={{ color: palette.paper, fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Ver el panel →
            </Link>
          </>
        )}
      </Box>

      {/* Intro */}
      {!introDone && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3.5, bgcolor: palette.paper, pointerEvents: 'none',
            animation: 'tpIntroOut 500ms 1.8s ease both', '@keyframes tpIntroOut': { to: { opacity: 0, transform: 'scale(1.04)' } },
          }}
        >
          <Box sx={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.inkSoft, mb: 2, animation: 'tpFade 500ms 100ms ease both', '@keyframes tpFade': { from: { opacity: 0, transform: 'translateY(10px)' } } }}>
            Demo en vivo · lo que ve tu cliente
          </Box>
          <Box sx={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '2.9rem', lineHeight: 0.98, letterSpacing: '-0.035em', color: palette.ink, fontVariationSettings: '"opsz" 144, "SOFT" 50' }}>
            <Box component="span" sx={{ display: 'block', animation: 'tpFade 600ms 250ms ease both' }}>Así reservan</Box>
            <Box component="span" sx={{ display: 'block', color: palette.coral, fontStyle: 'italic', animation: 'tpFade 600ms 500ms ease both' }}>tus clientes.</Box>
          </Box>
          <Box sx={{ mt: 2.5, color: palette.inkSoft, fontSize: '1.05rem', maxWidth: 300, animation: 'tpFade 600ms 800ms ease both' }}>
            Servicio, horario, seña con MercadoPago y confirmación por WhatsApp. Mirala completarse sola.
          </Box>
          <Box sx={{ mt: 3, height: 3, width: 120, borderRadius: 2, bgcolor: palette.paperDeep, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', bgcolor: palette.coral, transformOrigin: 'left', animation: 'tpBar 1.7s 100ms linear both', '@keyframes tpBar': { from: { transform: 'scaleX(0)' } } }} />
          </Box>
        </Box>
      )}
    </Box>
  );
}
