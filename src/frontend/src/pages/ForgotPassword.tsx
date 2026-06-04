/**
 * /forgot-password — request a password-reset link.
 *
 * Editorial Gazette styling to match /login. The user enters their email and
 * we call authApi.forgotPassword. The backend always answers with the same
 * generic message (account-enumeration protection) and, when the email exists,
 * sends a reset link pointing at /reset-password?token=…
 */

import React, { useState } from 'react';
import { Alert, Box, TextField, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

import { authApi } from '../services/api';
import AuthShell, { authPalette, authFonts } from '../components/auth/AuthShell';
import {
  underlineFieldSx,
  PillCTA,
  InlineLink,
} from '../components/auth/authFormKit';

const ForgotPassword: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'No pudimos procesar el pedido. Intentá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Staggered reveal for form children.
  const item = (delay: number) =>
    prefersReducedMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2, delay },
        }
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.5,
            delay: 0.35 + delay,
            ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
          },
        };

  return (
    <AuthShell>
      {/* ───── Editorial header ───── */}
      <Box component={motion.div} {...item(0)} sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: authFonts.mono,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: authPalette.secondary,
            mb: 1.5,
            '&::before': {
              content: '""',
              display: 'inline-block',
              width: 20,
              height: 1,
              backgroundColor: authPalette.secondary,
              verticalAlign: 'middle',
              mr: 1.25,
            },
          }}
        >
          Editorial · Recuperar acceso
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: authFonts.display,
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: { xs: 44, sm: 56 },
            lineHeight: 0.98,
            letterSpacing: '-0.025em',
            color: authPalette.ink,
            mb: 1.5,
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
            '& .upright': { fontStyle: 'normal', fontWeight: 500 },
          }}
        >
          <span className="upright">Olvidaste</span>
          <br />
          tu contraseña.
        </Typography>
        <Typography
          sx={{
            fontFamily: authFonts.display,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.5,
            color: authPalette.inkSoft,
            maxWidth: 420,
          }}
        >
          {sent
            ? 'Si el email está registrado, ya te enviamos las instrucciones.'
            : 'Ingresá tu email y te mandamos un enlace para elegir una nueva.'}
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{
            mb: 3,
            borderRadius: 0,
            fontFamily: authFonts.body,
            border: `1px solid ${authPalette.secondary}`,
            backgroundColor: 'rgba(232, 89, 60, 0.08)',
            color: authPalette.ink,
            '& .MuiAlert-icon': { color: authPalette.secondary },
          }}
        >
          {error}
        </Alert>
      )}

      {sent ? (
        <Box component={motion.div} {...item(0.1)}>
          <Box
            sx={{
              border: `1px solid ${authPalette.rule}`,
              borderLeft: `4px solid ${authPalette.primary}`,
              backgroundColor: 'rgba(30, 94, 63, 0.06)',
              p: 3,
              mb: 3.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: authFonts.mono,
                fontSize: 10.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: authPalette.primary,
                mb: 1,
              }}
            >
              Revisá tu correo
            </Typography>
            <Typography
              sx={{
                fontFamily: authFonts.body,
                fontSize: 15,
                lineHeight: 1.55,
                color: authPalette.ink,
              }}
            >
              Te enviamos un enlace a <strong>{email}</strong>. Abrilo desde el
              mismo dispositivo y elegí una nueva contraseña. El enlace vence en
              1 hora. Acordate de revisar la carpeta de spam.
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <InlineLink href="/login">← Volver al inicio de sesión</InlineLink>
          </Box>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Box component={motion.div} {...item(0.1)} sx={{ mb: 3.5 }}>
            <TextField
              fullWidth
              variant="filled"
              name="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="ejemplo@correo.com"
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
              sx={underlineFieldSx}
            />
          </Box>

          <Box component={motion.div} {...item(0.16)}>
            <PillCTA type="submit" disabled={loading || !email.trim()} loading={loading}>
              Enviar enlace
            </PillCTA>
          </Box>

          <Box
            component={motion.div}
            {...item(0.22)}
            sx={{ textAlign: 'center', mt: 3 }}
          >
            <Typography
              sx={{
                fontFamily: authFonts.body,
                fontSize: 14,
                color: authPalette.inkSoft,
              }}
            >
              ¿Te acordaste?{' '}
              <InlineLink href="/login">Iniciá sesión →</InlineLink>
            </Typography>
          </Box>
        </Box>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
