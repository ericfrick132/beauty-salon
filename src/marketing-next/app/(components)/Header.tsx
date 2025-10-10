"use client";
import * as React from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

export default function Header() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
      <Toolbar sx={{ gap: 2 }}>
        <Link href="/" aria-label="Ir a inicio">
          <img src="/logo.png" alt="Logo" width={32} height={32} style={{ display: 'block' }} />
        </Link>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>GymHero</Typography>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
          <Link href="#features">Características</Link>
          <Link href="#pricing">Precios</Link>
          <Link href="#testimonials">Testimonios</Link>
          <Link href="#faqs">FAQs</Link>
        </Box>
        <Button href="/login" variant="outlined" size="small">Login Admin</Button>
      </Toolbar>
    </AppBar>
  );
}

