'use client';
import { useState } from 'react';
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

/** Navegación flotante tipo píldora (estilo Ascend). */
export default function HomeNav() {
  const { open } = useSignupModal();
  const [menu, setMenu] = useState(false);

  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 1100, px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
      <Box
        sx={{
          maxWidth: 980,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: { xs: 1.5, sm: 2 },
          pr: 0.75,
          py: 0.75,
          borderRadius: 999,
          bgcolor: 'rgba(251,248,242,0.82)',
          backdropFilter: 'saturate(1.4) blur(14px)',
          WebkitBackdropFilter: 'saturate(1.4) blur(14px)',
          border: `1px solid ${home.line}`,
          boxShadow: '0 8px 24px -14px rgba(23,20,16,0.25)',
        }}
      >
        <Box component={Link} href="/" aria-label="TurnosPro, ir al inicio" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none', mr: 'auto' }}>
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
          onClick={() => open()}
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
          sx={{ display: { md: 'none' }, maxWidth: 980, mx: 'auto', mt: 1, p: 1, borderRadius: home.radius, bgcolor: home.card, border: `1px solid ${home.line}`, boxShadow: home.shadow }}
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
  );
}
