/**
 * /login — tenant-subdomain login page.
 *
 * Rendered on subdomains like `cliente.turnos-pro.com`. Uses the shared
 * AuthShell (split-screen editorial layout, Harbiz pattern). The main
 * domain (`turnos-pro.com/login`) uses LoginRedirect instead which
 * looks up the tenant by email.
 *
 * Auth flow (Google OAuth + email/password) is unchanged — we only
 * reskin the UI here.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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

const Divider: React.FC<{ label: string }> = ({ label }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      my: 2.5,
      '&::before, &::after': {
        content: '""',
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(23, 20, 16, 0.14)',
      },
    }}
  >
    <Typography
      sx={{
        fontFamily: authFonts.mono,
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: authPalette.inkFaint,
      }}
    >
      {label}
    </Typography>
  </Box>
);

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
        setError(err.response?.data?.message || 'Error al iniciar sesión con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  // Staggered reveal for form children (60ms between).
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
          Ingresá para seguir con tu agenda.
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

      <Box component={motion.div} {...item(0.26)}>
        <GoogleSignInButton
          text="signin_with"
          onSuccess={handleGoogleLogin}
          onError={(msg) => setError(msg)}
        />
      </Box>

      <Box component={motion.div} {...item(0.32)}>
        <Divider label="o con email" />
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <Box component={motion.div} {...item(0.38)} sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
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

        <Box component={motion.div} {...item(0.44)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
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
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: authFonts.body,
                backgroundColor: '#FFFFFF',
                borderRadius: 1.5,
              },
            }}
          />
        </Box>

        <Box component={motion.div} {...item(0.5)}>
          <Button
            type="submit"
            fullWidth
            disabled={loading || !email.trim() || !password.trim()}
            sx={{
              height: 48,
              fontFamily: authFonts.body,
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '0.01em',
              textTransform: 'none',
              borderRadius: 1.5,
              backgroundColor: authPalette.primary,
              color: authPalette.paper,
              '&:hover': {
                backgroundColor: '#174a32',
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(23, 20, 16, 0.08)',
                color: 'rgba(23, 20, 16, 0.35)',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: authPalette.paper }} />
            ) : (
              'Iniciar sesión'
            )}
          </Button>
        </Box>

        <Box
          component={motion.div}
          {...item(0.56)}
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

export default Login;
