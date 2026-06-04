/**
 * /reset-password?token=… — choose a new password.
 *
 * Reached from the link in the reset email. The token is a short-lived JWT
 * (purpose=pwd_reset) carrying the user + tenant. We POST it together with the
 * new password to authApi.resetPassword and, on success, bounce to /login.
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { motion, useReducedMotion } from 'framer-motion';

import { authApi } from '../services/api';
import AuthShell, { authPalette, authFonts } from '../components/auth/AuthShell';
import {
  underlineFieldSx,
  PillCTA,
  InlineLink,
} from '../components/auth/authFormKit';

const MIN_PASSWORD_LENGTH = 6;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'No pudimos restablecer la contraseña. El enlace puede haber expirado.'
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

  const headerCaption = done
    ? 'Listo. Ya podés entrar con tu nueva contraseña.'
    : 'Elegí una contraseña nueva para tu cuenta.';

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
          Editorial · Nueva contraseña
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
          <span className="upright">Restablecé</span>
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
          {headerCaption}
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

      {!token ? (
        // No token in the URL → the link is broken/incomplete.
        <Box component={motion.div} {...item(0.1)}>
          <Box
            sx={{
              border: `1px solid ${authPalette.rule}`,
              borderLeft: `4px solid ${authPalette.secondary}`,
              backgroundColor: 'rgba(232, 89, 60, 0.06)',
              p: 3,
              mb: 3.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: authFonts.body,
                fontSize: 15,
                lineHeight: 1.55,
                color: authPalette.ink,
              }}
            >
              Este enlace no es válido o está incompleto. Pedí uno nuevo desde la
              pantalla de recuperación.
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <InlineLink href="/forgot-password">
              Pedir un nuevo enlace →
            </InlineLink>
          </Box>
        </Box>
      ) : done ? (
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
              Contraseña actualizada
            </Typography>
            <Typography
              sx={{
                fontFamily: authFonts.body,
                fontSize: 15,
                lineHeight: 1.55,
                color: authPalette.ink,
              }}
            >
              Te llevamos al inicio de sesión…
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <InlineLink href="/login">Ir al inicio de sesión →</InlineLink>
          </Box>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Box component={motion.div} {...item(0.1)} sx={{ mb: 2.5 }}>
            <TextField
              fullWidth
              variant="filled"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              label="Nueva contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              required
              disabled={loading}
              autoComplete="new-password"
              autoFocus
              helperText={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      aria-label={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      sx={{
                        color: authPalette.inkFaint,
                        '&:hover': { color: authPalette.secondary },
                      }}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={underlineFieldSx}
            />
          </Box>

          <Box component={motion.div} {...item(0.16)} sx={{ mb: 3.5 }}>
            <TextField
              fullWidth
              variant="filled"
              name="confirm-password"
              type={showPassword ? 'text' : 'password'}
              label="Repetir contraseña"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError('');
              }}
              required
              disabled={loading}
              autoComplete="new-password"
              sx={underlineFieldSx}
            />
          </Box>

          <Box component={motion.div} {...item(0.22)}>
            <PillCTA
              type="submit"
              disabled={loading || !password || !confirm}
              loading={loading}
            >
              Guardar contraseña
            </PillCTA>
          </Box>

          <Box
            component={motion.div}
            {...item(0.28)}
            sx={{ textAlign: 'center', mt: 3 }}
          >
            <InlineLink href="/login">← Volver al inicio de sesión</InlineLink>
          </Box>
        </Box>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
