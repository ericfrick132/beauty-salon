'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';
import { useSignupModal } from '../(sections)/SignupModal';
import { BrandMark, Wordmark, home, sans } from './ui';

const links = [
  { href: '#simulador', label: 'Probalo' },
  { href: '#reservas', label: 'Funciones' },
  { href: '#demo', label: 'Demo' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'Preguntas' },
];

// En el servidor no hay layout: useLayoutEffect solo en el navegador (evita el warning de SSR).
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Navegación flotante tipo píldora, con el mismo comportamiento que la de GymHero:
 * fija arriba de todo; con la página arriba es ancha y transparente, y al scrollear se achica
 * y toma fondo translúcido con blur, borde y sombra. El menú mobile se abre superpuesto.
 * (Antes era position: sticky y se iba con el scroll.)
 */
export default function HomeNav() {
  const { open } = useSignupModal();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  // Alto reservado en el flujo para que el hero no quede debajo de la barra fija.
  const [spacer, setSpacer] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useIsoLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setSpacer(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ESC cierra el menú mobile.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  const solid = scrolled || menu;

  return (
    <>
      <Box
        component="header"
        ref={barRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            pointerEvents: 'auto',
            maxWidth: solid ? 880 : 1160,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: { xs: 1.5, sm: 2 },
            pr: 0.75,
            py: 0.75,
            borderRadius: 999,
            border: '1px solid',
            borderColor: solid ? home.line : 'transparent',
            bgcolor: solid ? 'rgba(251,248,242,0.82)' : 'transparent',
            backdropFilter: solid ? 'saturate(1.4) blur(14px)' : 'none',
            WebkitBackdropFilter: solid ? 'saturate(1.4) blur(14px)' : 'none',
            boxShadow: solid ? '0 10px 30px -14px rgba(23,20,16,0.28)' : 'none',
            transition: 'max-width 320ms ease, background-color 320ms ease, border-color 320ms ease, box-shadow 320ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        >
          <Box component={Link} href="/" aria-label="TurnosPro, ir al inicio" onClick={() => setMenu(false)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none', mr: 'auto' }}>
            <BrandMark size={28} />
            <Wordmark size="1.1rem" />
          </Box>

          <Box component="nav" aria-label="Secciones" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, mx: 2 }}>
            {links.map((l) => (
              <Box
                key={l.href}
                component="a"
                href={l.href}
                sx={{ px: 1.5, py: 0.75, borderRadius: 999, fontFamily: sans, fontSize: '0.9rem', fontWeight: 500, color: home.inkSoft, textDecoration: 'none', letterSpacing: '-0.01em', '&:hover': { color: home.ink, bgcolor: 'rgba(23,20,16,0.05)' } }}
              >
                {l.label}
              </Box>
            ))}
          </Box>

          <Box component="a" href="/login" sx={{ display: { xs: 'none', sm: 'inline-flex' }, px: 1.75, py: 0.9, borderRadius: 999, fontFamily: sans, fontSize: '0.9rem', fontWeight: 600, color: home.ink, textDecoration: 'none', '&:hover': { bgcolor: 'rgba(23,20,16,0.05)' } }}>
            Entrar
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => { setMenu(false); open(); }}
            sx={{ px: { xs: 1.75, sm: 2.25 }, py: 0.9, borderRadius: 999, border: 'none', cursor: 'pointer', bgcolor: home.forest, color: home.paperSoft, fontFamily: sans, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', '&:hover': { bgcolor: home.forestDeep } }}
          >
            Empezá gratis
          </Box>
          <Box
            component="button"
            type="button"
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, width: 40, height: 40, borderRadius: '50%', border: 'none', bgcolor: 'rgba(23,20,16,0.05)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}
          >
            <Box sx={{ width: 16, height: 1.5, bgcolor: home.ink, transition: 'transform 160ms', transform: menu ? 'translateY(2.75px) rotate(45deg)' : 'none' }} />
            <Box sx={{ width: 16, height: 1.5, bgcolor: home.ink, transition: 'transform 160ms', transform: menu ? 'translateY(-2.75px) rotate(-45deg)' : 'none' }} />
          </Box>
        </Box>

        {menu && (
          <Box
            component="nav"
            aria-label="Menú"
            sx={{
              pointerEvents: 'auto',
              display: { md: 'none' },
              position: 'absolute',
              top: '100%',
              left: { xs: 12, sm: 16 },
              right: { xs: 12, sm: 16 },
              mt: 1,
              p: 1,
              borderRadius: home.radius,
              bgcolor: home.card,
              border: `1px solid ${home.line}`,
              boxShadow: '0 20px 50px -20px rgba(23,20,16,0.35)',
            }}
          >
            {[...links, { href: '/login', label: 'Entrar' }].map((l) => (
              <Box
                key={l.href}
                component="a"
                href={l.href}
                onClick={() => setMenu(false)}
                sx={{ display: 'block', px: 2, py: 1.4, borderRadius: home.radiusSm, fontFamily: sans, fontSize: '1.05rem', fontWeight: 500, color: home.ink, textDecoration: 'none', '&:hover': { bgcolor: 'rgba(23,20,16,0.05)' } }}
              >
                {l.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>
      {/* Mismo alto que ocupaba la barra cuando era sticky: el hero arranca debajo, sin taparse. */}
      <Box aria-hidden sx={{ height: spacer ?? { xs: 66, sm: 70 } }} />
    </>
  );
}
