"use client";
import { useState } from 'react';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useSignupModal } from './(sections)/SignupModal';

const navLinks = [
  { href: '#hero', label: 'Inicio' },
  { href: '#beneficios', label: 'Beneficios' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#faq', label: 'FAQ' },
];

export default function Header() {
  const { open } = useSignupModal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(15,23,42,0.06)',
        }}
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
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: -0.5, color: 'text.primary', fontWeight: 700 }}>
            TurnosPro
          </Typography>

          {/* Desktop nav */}
          <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: '#475569',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                }}
              >
                {item.label}
              </Link>
            ))}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1.5 }}>
            <Button onClick={() => open()} variant="contained" color="primary" size="small">
              Empezar gratis
            </Button>
            <Button href="/login" variant="outlined" size="small" color="secondary">
              Entrar
            </Button>
          </Box>

          {/* Mobile hamburger */}
          <IconButton
            sx={{ display: { xs: 'flex', md: 'none' } }}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {navLinks.map((item) => (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component="a"
                href={item.href}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ px: 2, mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => {
              setDrawerOpen(false);
              open();
            }}
          >
            Empezar gratis
          </Button>
          <Button href="/login" variant="outlined" color="secondary" fullWidth>
            Entrar
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
