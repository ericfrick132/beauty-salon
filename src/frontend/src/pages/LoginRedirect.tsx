/**
 * /login on the main domain (turnos-pro.com) — looks up the tenant by
 * email and redirects to the corresponding subdomain login. Uses the
 * shared AuthShell so it matches Login.tsx visually.
 *
 * The API contract is unchanged: GET /public/tenant-by-email → { loginUrl }.
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

import api from '../services/api';
import AuthShell, { authPalette, authFonts } from '../components/auth/AuthShell';

const LoginRedirect: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/public/tenant-by-email', {
        params: { email: trimmed },
      });
      const { loginUrl } = res.data;
      if (loginUrl) {
        window.location.href = loginUrl;
      } else {
        setError('No se encontró una cuenta asociada a ese email.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'No se encontró una cuenta asociada a ese email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const item = (delay: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
        };

  return (
    <AuthShell>
      <Box component={motion.div} {...item(0.2)} sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: authFonts.mono,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: authPalette.primary,
            mb: 1.25,
          }}
        >
          Iniciar sesión
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: authFonts.display,
            fontWeight: 500,
            fontSize: { xs: 32, sm: 38 },
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            color: authPalette.ink,
            mb: 1,
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Bienvenido de nuevo
        </Typography>
        <Typography
          sx={{
            fontFamily: authFonts.body,
            fontSize: 15,
            lineHeight: 1.5,
            color: authPalette.inkSoft,
          }}
        >
          Ingresá tu email y te llevamos al panel de tu negocio.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 2, borderRadius: 1.5 }}
        >
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleLookup}>
        <Box component={motion.div} {...item(0.3)} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            type="email"
            label="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="tu@email.com"
            required
            autoFocus
            autoComplete="email"
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: authFonts.body,
                backgroundColor: '#FFFFFF',
                borderRadius: 1.5,
              },
            }}
          />
        </Box>

        <Box component={motion.div} {...item(0.38)}>
          <Button
            type="submit"
            fullWidth
            disabled={!email.trim() || loading}
            sx={{
              height: 48,
              fontFamily: authFonts.body,
              fontWeight: 600,
              fontSize: 15,
              textTransform: 'none',
              borderRadius: 1.5,
              backgroundColor: authPalette.primary,
              color: authPalette.paper,
              '&:hover': { backgroundColor: '#174a32' },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(23, 20, 16, 0.08)',
                color: 'rgba(23, 20, 16, 0.35)',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: authPalette.paper }} />
            ) : (
              'Continuar'
            )}
          </Button>
        </Box>

        <Box
          component={motion.div}
          {...item(0.46)}
          sx={{ textAlign: 'center', mt: 3 }}
        >
          <Typography
            sx={{
              fontFamily: authFonts.body,
              fontSize: 14,
              color: authPalette.inkSoft,
            }}
          >
            ¿No tenés cuenta?{' '}
            <Box
              component="a"
              href="/register"
              sx={{
                color: authPalette.primary,
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Registrate gratis →
            </Box>
          </Typography>
        </Box>
      </Box>
    </AuthShell>
  );
};

export default LoginRedirect;
