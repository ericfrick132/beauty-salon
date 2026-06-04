/**
 * /login — "Editorial Gazette" login page.
 *
 * Part of TurnosPro's weekly-fashion-magazine auth flow: cream paper,
 * dramatic typographic hierarchy, grain overlay, underline-only inputs,
 * pill CTA with coral accent.
 *
 * Auth logic (authApi.login, registrationApi.googleLogin,
 * resolvePostLoginRoute) is preserved verbatim — only the UI changes.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { authApi, registrationApi, tenantApi } from '../services/api';
import { useAppDispatch } from '../store';
import { loginSuccess } from '../store/slices/authSlice';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import AuthShell, { authPalette, authFonts } from '../components/auth/AuthShell';
import {
  underlineFieldSx,
  Divider,
  PillCTA,
  InlineLink,
} from '../components/auth/authFormKit';

/** Decide where to go after login — onboarding if incomplete, else dashboard. */
async function resolvePostLoginRoute(): Promise<string> {
  try {
    const config = await tenantApi.getConfig();
    if (!config?.onboardingCompletedAt) return '/completar-perfil';
  } catch {
    // If config endpoint is unavailable, fall through to dashboard.
  }
  return '/dashboard';
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch(loginSuccess({ user: response.user, token: response.token }));
      const target = await resolvePostLoginRoute();
      navigate(target);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    setError('');
    try {
      try {
        localStorage.setItem('googleIdTokenForOnboarding', idToken);
      } catch {
        /* ignore quota errors */
      }
      const response = await registrationApi.googleLogin(idToken);
      if (response.success && response.redirectUrl) {
        window.location.href = response.redirectUrl;
      } else if (response.success && response.token) {
        localStorage.setItem('authToken', response.token);
        const target = await resolvePostLoginRoute();
        navigate(target);
      } else {
        setError(response.message || 'Error al iniciar sesión con Google');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'NO_ACCOUNT') {
        setError(
          'No encontramos una cuenta con este email. Registrate primero.'
        );
      } else {
        setError(
          err.response?.data?.message || 'Error al iniciar sesión con Google'
        );
      }
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
      {/* ───── Editorial header: mono kicker → display headline → italic caption ───── */}
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
          Editorial · Iniciar sesión
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
            '& .upright': {
              fontStyle: 'normal',
              fontWeight: 500,
            },
          }}
        >
          <span className="upright">Bienvenido</span>
          <br />
          de nuevo.
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
          Ingresá para seguir con tu agenda — tus turnos te esperan.
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

      {/* ───── Google button FIRST (above email/password) ───── */}
      <Box component={motion.div} {...item(0.08)}>
        <GoogleSignInButton
          text="signin_with"
          onSuccess={handleGoogleLogin}
          onError={(msg) => setError(msg)}
        />
      </Box>

      <Box component={motion.div} {...item(0.14)}>
        <Divider label="— o con email —" />
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <Box component={motion.div} {...item(0.2)} sx={{ mb: 2.5 }}>
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
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.26)} sx={{ mb: 1.5 }}>
          <TextField
            fullWidth
            variant="filled"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Contraseña"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            required
            disabled={loading}
            autoComplete="current-password"
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

        {/* ───── Forgot-password link, right-aligned under the password ───── */}
        <Box
          component={motion.div}
          {...item(0.3)}
          sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3.5 }}
        >
          <Box
            component="a"
            href="/forgot-password"
            sx={{
              fontFamily: authFonts.mono,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: authPalette.inkFaint,
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'color 150ms ease, border-color 150ms ease',
              '&:hover': {
                color: authPalette.secondary,
                borderBottomColor: authPalette.secondary,
              },
            }}
          >
            ¿Olvidaste tu contraseña?
          </Box>
        </Box>

        <Box component={motion.div} {...item(0.32)}>
          <PillCTA
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            loading={loading}
          >
            Iniciar sesión
          </PillCTA>
        </Box>

        <Box
          component={motion.div}
          {...item(0.38)}
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
            <InlineLink href="/register">Registrate gratis →</InlineLink>
          </Typography>
        </Box>
      </Box>
    </AuthShell>
  );
};

export default Login;
