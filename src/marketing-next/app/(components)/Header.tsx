"use client";
import { useState } from 'react';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Container,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useSignupModal } from './(sections)/SignupModal';
import { palette } from '@/app/(lib)/theme';

const navLinks = [
  { href: '#beneficios', label: 'Funciones' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#precios', label: 'Precios' },
  { href: '#faq', label: 'FAQ' },
];

function BrandMark() {
  // Editorial "T·" mark — replaces the generic teal-green gradient blob.
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 38 38"
      sx={{ width: 36, height: 36 }}
    >
      <rect
        x="2"
        y="2"
        width="34"
        height="34"
        rx="8"
        fill={palette.ink}
        stroke={palette.ink}
        strokeWidth="1.5"
      />
      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-fraunces), serif"
        fontWeight="600"
        fontSize="22"
        fill={palette.amber}
      >
        T
      </text>
      <circle cx="29" cy="28" r="2.5" fill={palette.coral} />
    </Box>
  );
}

export default function Header() {
  const { open } = useSignupModal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ backdropFilter: 'blur(8px)' }}>
        <Container maxWidth="lg" disableGutters>
          <Toolbar sx={{ gap: 2, py: 1.2, px: { xs: 2, md: 3 } }}>
            <Link
              href="/"
              aria-label="Ir a inicio"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: palette.ink,
              }}
            >
              <BrandMark />
              <Box
                component="span"
                sx={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  color: palette.ink,
                }}
              >
                Turnos<Box component="span" sx={{ fontStyle: 'italic', color: palette.coral }}>Pro</Box>
              </Box>
            </Link>

            <Box sx={{ flex: 1 }} />

            {/* Desktop nav */}
            <Box
              component="nav"
              sx={{
                display: { xs: 'none', md: 'flex' },
                gap: 3,
                alignItems: 'center',
                mr: 2,
              }}
            >
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: palette.ink,
                    fontFamily: 'var(--font-mono), monospace',
                    fontWeight: 500,
                    fontSize: '0.74rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1.2 }}>
              <Button
                href="/login"
                variant="outlined"
                size="small"
                sx={{ px: 2.4, py: 0.7, fontSize: '0.85rem' }}
              >
                Entrar
              </Button>
              <Button
                href="/register"
                variant="contained"
                color="primary"
                size="small"
                sx={{ px: 2.4, py: 0.7, fontSize: '0.85rem' }}
              >
                Empezar gratis →
              </Button>
            </Box>

            {/* Mobile hamburger */}
            <IconButton
              sx={{ display: { xs: 'flex', md: 'none' }, color: palette.ink }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: palette.paper,
            borderLeft: `1.5px solid ${palette.ink}`,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: `1.5px solid ${palette.ink}`,
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 600,
              fontSize: '1.05rem',
              color: palette.ink,
            }}
          >
            Menú
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: palette.ink }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List sx={{ pt: 1 }}>
          {navLinks.map((item) => (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component="a"
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                sx={{ py: 1.5 }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontSize: '1.4rem',
                    fontWeight: 500,
                    color: palette.ink,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ px: 2, mt: 'auto', mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            href="/register"
            onClick={() => setDrawerOpen(false)}
          >
            Empezar gratis
          </Button>
          <Button href="/login" variant="outlined" fullWidth>
            Entrar
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
