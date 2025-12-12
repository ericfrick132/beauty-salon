"use client";
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { brand } from '@/app/(lib)/brand';

const navLinks = [
  { href: '#numeros', label: 'Números' },
  { href: '#flujo', label: 'Cómo funciona' },
  { href: '#mercadopago', label: 'MercadoPago' },
  { href: '#planes', label: 'Planes' },
  { href: '#faqs', label: 'FAQ' },
];

export default function Header() {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: '1px solid #1f2a37', backdropFilter: 'blur(10px)' }}
    >
      <Toolbar sx={{ gap: 2, py: 1.5 }}>
        <Link href="/" aria-label="Ir a inicio" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0F766E, #22c55e)',
            }}
          />
        </Link>
        <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: -0.5 }}>TurnosPro</Typography>
        <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} style={{ color: '#CBD5E1', fontWeight: 600 }}>
              {item.label}
            </Link>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button href={brand.demo_booking_url} variant="contained" color="primary" size="small">Empezar gratis</Button>
          <Button href="/login" variant="outlined" size="small" color="secondary">Entrar</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

