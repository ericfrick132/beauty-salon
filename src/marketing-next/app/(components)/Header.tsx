"use client";
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { brand } from '@/app/(lib)/brand';

const navLinks = [
  { href: '#problema', label: 'Problema' },
  { href: '#solucion', label: 'Solución' },
  { href: '#demo', label: 'Demo' },
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
          <img src="/logo.png" alt="Logo" width={36} height={36} style={{ display: 'block' }} />
        </Link>
        <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: -0.5 }}>GymHero</Typography>
        <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button href={brand.demo_booking_url} variant="contained" color="primary" size="small">Agendar demo</Button>
          <Button href="/login" variant="outlined" size="small" color="secondary">Entrar a la app</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

