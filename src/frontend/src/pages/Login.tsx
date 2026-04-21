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

// ─── Shared editorial field style: underline-only, forest glow on focus ───
const underlineFieldSx = {
  '& .MuiFilledInput-root': {
    backgroundColor: 'transparent !important',
    fontFamily: authFonts.body,
    fontSize: 16,
    paddingLeft: 0,
    paddingRight: 0,
    borderRadius: 0,
    '&::before': {
      borderBottom: `1px solid ${authPalette.ink}`,
    },
    '&:hover::before': {
      borderBottom: `1px solid ${authPalette.ink} !important`,
    },
    '&::after': {
      borderBottom: `2px solid ${authPalette.primary}`,
    },
    '&.Mui-focused': {
      boxShadow: `0 6px 20px -14px ${authPalette.primary}`,
    },
  },
  '& .MuiFilledInput-input': {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: '22px',
    paddingBottom: '8px',
    color: authPalette.ink,
    caretColor: authPalette.primary,
  },
  '& .MuiInputLabel-root': {
    fontFamily: authFonts.mono,
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: authPalette.inkFaint,
    transform: 'translate(0, 20px) scale(1)',
    '&.Mui-focused': { color: authPalette.primary },
    '&.MuiInputLabel-shrink': {
      transform: 'translate(0, -2px) scale(0.9)',
      letterSpacing: '0.22em',
    },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: authFonts.mono,
    fontSize: 10.5,
    letterSpacing: '0.1em',
    color: authPalette.inkSoft,
    marginLeft: 0,
    textTransform: 'uppercase',
  },
};

// ─── Editorial divider with mono label ───
const Divider: React.FC<{ label: string }> = ({ label }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      my: 3,
      '&::before, &::after': {
        content: '""',
        flex: 1,
        height: 1,
        backgroundColor: authPalette.rule,
      },
    }}
  >
    <Typography
      sx={{
        fontFamily: authFonts.mono,
        fontSize: 10.5,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: authPalette.inkFaint,
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─── Pill CTA with coral bar that slides in from left on hover ───
const PillCTA: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
}> = ({ children, onClick, type = 'button', disabled, loading }) => (
  <Box
    component="button"
    type={type}
    onClick={onClick}
    disabled={disabled}
    sx={{
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: 52,
      border: 'none',
      outline: 'none',
      borderRadius: 999,
      cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: disabled
        ? 'rgba(23, 20, 16, 0.12)'
        : authPalette.primary,
      color: disabled ? 'rgba(23, 20, 16, 0.4)' : '#F4EFE6',
      fontFamily: authFonts.body,
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      transition:
        'transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1), background-color 200ms ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 0,
        backgroundColor: authPalette.secondary,
        transition: 'width 220ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        zIndex: 0,
      },
      '&:not(:disabled):hover::before': {
        width: 14,
      },
      '&:not(:disabled):hover': {
        backgroundColor: authPalette.primaryDeep,
      },
      '& > span': {
        position: 'relative',
        zIndex: 1,
      },
    }}
  >
    <span>
      {loading ? (
        <CircularProgress size={18} sx={{ color: '#F4EFE6' }} />
      ) : (
        children
      )}
    </span>
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

        <Box component={motion.div} {...item(0.26)} sx={{ mb: 3.5 }}>
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
            <Box
              component="a"
              href="/register"
              sx={{
                color: authPalette.secondary,
                fontFamily: authFonts.display,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 15,
                textDecoration: 'none',
                borderBottom: `1px solid ${authPalette.secondary}`,
                paddingBottom: '1px',
                transition: 'color 150ms ease, border-color 150ms ease',
                '&:hover': {
                  color: authPalette.primary,
                  borderBottomColor: authPalette.primary,
                },
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
