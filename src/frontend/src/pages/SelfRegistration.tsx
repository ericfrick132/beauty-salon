/**
 * /register — "Editorial Gazette" signup page.
 *
 * Backend API is unchanged:
 *   1. POST /registration/start        → sends confirmation email
 *   2. GET  /register/confirm?token=x  → verify token, reveal business form
 *   3. POST /registration/check-subdomain
 *   4. POST /registration/complete OR /registration/google-register
 *
 * UX note — the word "subdominio" never reaches the end user; we call it a
 * "link" throughout. The URL step from the earlier design is merged into
 * the business step: the slug auto-derives from the business name, and an
 * optional "Personalizar" affordance lets power users tweak it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { motion, useReducedMotion } from 'framer-motion';

import { registrationApi } from '../services/api';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import AuthShell, { authPalette, authFonts } from '../components/auth/AuthShell';

type FlowStep = 'signup' | 'email-sent' | 'business' | 'success';

// Turn a business name into a URL slug (lowercase, hyphen-separated, ASCII-
// safe). Used to auto-derive the tenant link so end users never have to
// think about "subdomains".
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

// ────────────────────── Editorial field style ──────────────────────
// Underline-only inputs: 1px ink border-bottom, forest-green glow on focus.
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
    '&.Mui-error::after': {
      borderBottom: `2px solid ${authPalette.secondary}`,
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
    '&.Mui-error': { color: authPalette.secondary },
    '&.MuiInputLabel-shrink': {
      transform: 'translate(0, -2px) scale(0.9)',
      letterSpacing: '0.22em',
    },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: authFonts.mono,
    fontSize: 10.5,
    letterSpacing: '0.08em',
    color: authPalette.inkSoft,
    marginLeft: 0,
    textTransform: 'uppercase',
    '&.Mui-error': { color: authPalette.secondary },
  },
};

// ────────────────────── Editorial divider ──────────────────────
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

// ────────────────────── Pill CTA with coral slide accent ──────────────────────
const PillCTA: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  fullWidth?: boolean;
  flex?: number;
}> = ({
  children,
  onClick,
  type = 'button',
  disabled,
  loading,
  variant = 'primary',
  fullWidth = true,
  flex,
}) => {
  const isOutline = variant === 'outline';
  return (
    <Box
      component="button"
      type={type}
      onClick={onClick}
      disabled={disabled}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        width: fullWidth ? '100%' : 'auto',
        flex,
        height: 52,
        padding: isOutline ? '0 28px' : 0,
        border: isOutline ? `1px solid ${authPalette.ink}` : 'none',
        outline: 'none',
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: disabled
          ? 'rgba(23, 20, 16, 0.08)'
          : isOutline
          ? 'transparent'
          : authPalette.primary,
        color: disabled
          ? 'rgba(23, 20, 16, 0.4)'
          : isOutline
          ? authPalette.ink
          : '#F4EFE6',
        fontFamily: authFonts.body,
        fontWeight: 600,
        fontSize: 14.5,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        transition:
          'transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1), background-color 200ms ease, border-color 200ms ease, color 200ms ease',
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
          width: isOutline ? 8 : 14,
        },
        '&:not(:disabled):hover': {
          backgroundColor: isOutline
            ? 'rgba(30, 94, 63, 0.04)'
            : authPalette.primaryDeep,
          borderColor: isOutline ? authPalette.primary : undefined,
        },
        '& > span': {
          position: 'relative',
          zIndex: 1,
        },
      }}
    >
      <span>
        {loading ? (
          <CircularProgress
            size={18}
            sx={{ color: isOutline ? authPalette.primary : '#F4EFE6' }}
          />
        ) : (
          children
        )}
      </span>
    </Box>
  );
};

// ────────────────────── Header block (kicker + display + italic caption) ──────────────────────
const EditorialHeader: React.FC<{
  kicker: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  delay?: number;
}> = ({ kicker, title, subtitle, delay = 0 }) => (
  <Box sx={{ mb: 4 }}>
    <Typography
      component={motion.p}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 + delay }}
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
      {kicker}
    </Typography>
    <Typography
      component={motion.h1}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.42 + delay }}
      sx={{
        fontFamily: authFonts.display,
        fontWeight: 400,
        fontStyle: 'italic',
        fontSize: { xs: 40, sm: 52 },
        lineHeight: 0.98,
        letterSpacing: '-0.025em',
        color: authPalette.ink,
        mb: subtitle ? 1.5 : 0,
        fontVariationSettings: '"opsz" 144, "SOFT" 30',
        '& .upright': {
          fontStyle: 'normal',
          fontWeight: 500,
        },
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        component={motion.p}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 + delay }}
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
        {subtitle}
      </Typography>
    )}
  </Box>
);

// ────────────────────── Page ──────────────────────
const SelfRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const prefersReducedMotion = useReducedMotion();

  // ----- Flow state -----
  const [currentStep, setCurrentStep] = useState<FlowStep>(
    tokenFromUrl ? 'business' : 'signup'
  );
  // "Personalizar" toggle — when false, the link slug tracks the business
  // name automatically; when true, the user has overridden it.
  const [customizingLink, setCustomizingLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ----- Signup step -----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string>('');

  // ----- Verification bridge -----
  const [rememberToken, setRememberToken] = useState(tokenFromUrl || '');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // ----- URL step -----
  // Prefill subdomain from `?subdomain=XYZ` query param (landing FinalCta passes it
  // when the user typed a slug before clicking "Comenzar"). Sanitize to match the
  // allowed charset the CRA uses elsewhere (lowercase a-z0-9 + hyphen).
  const subdomainFromUrl = (searchParams.get('subdomain') || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
  const [subdomain, setSubdomain] = useState(subdomainFromUrl);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(
    null
  );
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  // ----- Business step -----
  const [mobile, setMobile] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // ----- Final -----
  const [redirectUrl, setRedirectUrl] = useState('');
  const [devConfirmUrl, setDevConfirmUrl] = useState('');

  // ---------------- Effects ----------------

  useEffect(() => {
    if (tokenFromUrl) {
      (async () => {
        setLoading(true);
        setError('');
        try {
          const response = await registrationApi.verify(tokenFromUrl);
          if (response.success) {
            setRememberToken(tokenFromUrl);
            setVerifiedEmail(response.email);
            setCurrentStep('business');
          } else {
            setError(response.message || 'Token inválido');
          }
        } catch (err: any) {
          setError(
            err.response?.data?.message ||
              'Error verificando el token. El link puede haber expirado.'
          );
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [tokenFromUrl]);

  const checkSubdomain = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setSubdomainAvailable(null);
      return;
    }
    setCheckingSubdomain(true);
    try {
      const response = await registrationApi.checkSubdomain(value);
      setSubdomainAvailable(response.available);
    } catch {
      setSubdomainAvailable(false);
    } finally {
      setCheckingSubdomain(false);
    }
  }, []);

  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }
    const timer = setTimeout(() => checkSubdomain(subdomain), 500);
    return () => clearTimeout(timer);
  }, [subdomain, checkSubdomain]);

  const handleSubdomainChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 30);
    setSubdomain(sanitized);
  };

  // ---------------- Handlers ----------------

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Completá todos los campos');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresá un email válido');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!businessName.trim()) {
      setError('Ingresá el nombre de tu negocio');
      return;
    }
    if (!acceptedTerms) {
      setError('Tenés que aceptar los términos y condiciones');
      return;
    }

    setLoading(true);
    try {
      // Backend still drives the email-confirmation flow. We only send
      // email+password; business name is kept in local state and used
      // later in /registration/complete.
      const response = await registrationApi.start({
        email,
        password,
        confirmPassword: password,
      });
      if (response.success) {
        if (response.devConfirmUrl) setDevConfirmUrl(response.devConfirmUrl);
        setCurrentStep('email-sent');
      } else {
        setError(response.message || 'Error al iniciar el registro');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = (idToken: string) => {
    setError('');
    setGoogleIdToken(idToken);
    try {
      localStorage.setItem('googleIdTokenForOnboarding', idToken);
    } catch {
      /* ignore quota errors */
    }
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      if (payload.email) setVerifiedEmail(payload.email);
    } catch {
      /* decode failure is non-fatal */
    }
    setCurrentStep('business');
  };

  // Auto-derive the link slug from the business name unless the user has
  // manually personalized it. Keeps the "subdomain" concept out of the
  // happy path while still letting power users tweak.
  useEffect(() => {
    if (customizingLink) return;
    const derived = slugify(businessName);
    if (derived !== subdomain) setSubdomain(derived);
  }, [businessName, customizingLink, subdomain]);

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!businessName.trim()) {
      setError('El nombre del negocio es requerido');
      return;
    }
    if (!mobile.trim()) {
      setError('El celular es requerido');
      return;
    }
    if (!subdomain || subdomain.length < 3) {
      setError('Elegí un nombre de negocio un poco más largo para generar tu link.');
      return;
    }
    if (subdomainAvailable === false) {
      setError('Ese link ya está en uso — personalizalo desde el campo de arriba.');
      return;
    }

    setLoading(true);
    try {
      const response = googleIdToken
        ? await registrationApi.googleRegister({
            idToken: googleIdToken,
            subdomain,
            businessName,
            businessAddress: businessAddress || undefined,
            mobile,
          })
        : await registrationApi.complete({
            rememberToken,
            subdomain,
            businessName,
            businessAddress: businessAddress || undefined,
            mobile,
          });

      if (response.success) {
        setRedirectUrl(response.redirectUrl);
        setCurrentStep('success');
      } else {
        setError(response.message || 'Error al completar el registro');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'EMAIL_EXISTS') {
        setError(
          'Ya existe una cuenta con este email. Iniciá sesión con Google desde la página de login.'
        );
      } else {
        setError(
          err.response?.data?.message || 'Error al completar el registro'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Motion helpers ----------------

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
            delay: 0.55 + delay,
            ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
          },
        };

  // ────────────────────── Step renderers ──────────────────────

  const renderError = () =>
    error && (
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
    );

  const renderSignup = () => (
    <>
      <EditorialHeader
        kicker="Crónica · 7 días gratis"
        title={
          <>
            <span className="upright">Creá</span> tu cuenta,
            <br />
            dejá el papel.
          </>
        }
        subtitle="Llevá la relación con tus clientes al siguiente nivel — sin instalar nada."
      />

      {renderError()}

      <Box component={motion.div} {...item(0)}>
        <GoogleSignInButton
          text="signup_with"
          onSuccess={handleGoogleSignup}
          onError={(msg) => setError(msg)}
        />
      </Box>

      <Box component={motion.div} {...item(0.06)}>
        <Divider label="— o con email —" />
      </Box>

      <Box component="form" onSubmit={handleSignupSubmit}>
        <Box component={motion.div} {...item(0.12)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            variant="filled"
            label="Nombre del negocio"
            placeholder="Estudio Luli"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoFocus
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.18)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            variant="filled"
            type="email"
            label="Email"
            placeholder="vos@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.24)} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="filled"
            type={showPassword ? 'text' : 'password'}
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="Mínimo 8 caracteres"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
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

        <Box component={motion.div} {...item(0.3)} sx={{ mb: 3.5, mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                size="small"
                sx={{
                  color: 'rgba(23, 20, 16, 0.35)',
                  padding: '4px',
                  borderRadius: 0,
                  '& .MuiSvgIcon-root': { borderRadius: 0 },
                  '&.Mui-checked': { color: authPalette.primary },
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontFamily: authFonts.body,
                  fontSize: 13.5,
                  color: authPalette.inkSoft,
                  ml: 0.5,
                }}
              >
                Acepto los{' '}
                <Box
                  component="a"
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    color: authPalette.secondary,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${authPalette.secondary}`,
                    paddingBottom: '1px',
                    '&:hover': { color: authPalette.primary, borderColor: authPalette.primary },
                  }}
                >
                  términos y condiciones
                </Box>
              </Typography>
            }
          />
        </Box>

        <Box component={motion.div} {...item(0.36)}>
          <PillCTA type="submit" disabled={loading} loading={loading}>
            Crear cuenta
          </PillCTA>
        </Box>

        <Box
          component={motion.div}
          {...item(0.42)}
          sx={{ textAlign: 'center', mt: 3 }}
        >
          <Typography
            sx={{
              fontFamily: authFonts.body,
              fontSize: 14,
              color: authPalette.inkSoft,
            }}
          >
            ¿Ya tenés cuenta?{' '}
            <Box
              component="a"
              href="/login"
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
              Iniciá sesión →
            </Box>
          </Typography>
        </Box>
      </Box>
    </>
  );

  const renderEmailSent = () => (
    <Box component={motion.div} {...item(0)} sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          border: `1.5px solid ${authPalette.ink}`,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: -10,
            border: `1px dashed ${authPalette.secondary}`,
            borderRadius: '50%',
          },
        }}
      >
        <EmailIcon sx={{ fontSize: 32, color: authPalette.primary }} />
      </Box>
      <Typography
        sx={{
          fontFamily: authFonts.mono,
          fontSize: 10.5,
          letterSpacing: '0.24em',
          color: authPalette.secondary,
          textTransform: 'uppercase',
          mb: 1.5,
        }}
      >
        Correspondencia · Enviada
      </Typography>
      <Typography
        component="h1"
        sx={{
          fontFamily: authFonts.display,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: { xs: 40, sm: 48 },
          lineHeight: 0.98,
          letterSpacing: '-0.02em',
          color: authPalette.ink,
          mb: 2,
          fontVariationSettings: '"opsz" 144, "SOFT" 30',
          '& .upright': { fontStyle: 'normal', fontWeight: 500 },
        }}
      >
        <span className="upright">Revisá</span> tu email.
      </Typography>
      <Typography
        sx={{
          fontFamily: authFonts.display,
          fontStyle: 'italic',
          fontSize: 16,
          lineHeight: 1.5,
          color: authPalette.inkSoft,
          maxWidth: 380,
          mx: 'auto',
        }}
      >
        Te enviamos un link de confirmación a{' '}
        <Box
          component="span"
          sx={{
            color: authPalette.ink,
            fontStyle: 'normal',
            fontWeight: 500,
            fontFamily: authFonts.body,
          }}
        >
          {email}
        </Box>
        . Hacé click para continuar — revisá spam si no aparece.
      </Typography>

      {devConfirmUrl && (
        <Alert
          severity="info"
          sx={{
            mt: 3,
            borderRadius: 0,
            textAlign: 'left',
            border: `1px solid ${authPalette.rule}`,
            backgroundColor: 'rgba(30, 94, 63, 0.06)',
            '& .MuiAlert-icon': { color: authPalette.primary },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mb: 0.5,
              fontFamily: authFonts.mono,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Modo desarrollo — link de confirmación
          </Typography>
          <Box
            component="a"
            href={devConfirmUrl}
            sx={{
              wordBreak: 'break-all',
              color: authPalette.primary,
              fontSize: 13,
              fontFamily: authFonts.mono,
            }}
          >
            {devConfirmUrl}
          </Box>
        </Alert>
      )}
    </Box>
  );

  const renderBusinessStep = () => (
    <>
      <EditorialHeader
        kicker="Último paso — Tu negocio"
        title={
          <>
            <span className="upright">Contanos</span>
            <br />
            del negocio.
          </>
        }
        subtitle={
          verifiedEmail
            ? `Verificada: ${verifiedEmail}`
            : 'Solo unos datos para dejarte lista la cuenta.'
        }
      />

      {renderError()}

      <Box component="form" onSubmit={handleCompleteSubmit}>
        <Box component={motion.div} {...item(0)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            variant="filled"
            label="Nombre del negocio"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoFocus
            sx={underlineFieldSx}
          />
        </Box>

        {/* Ticket-stub preview of the auto-derived link + optional manual edit */}
        <Box
          component={motion.div}
          {...item(0.06)}
          sx={{
            mt: 1,
            mb: 3,
            position: 'relative',
            border: `1px solid ${authPalette.ink}`,
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            padding: '16px 20px',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -1,
              top: 12,
              bottom: 12,
              width: 2,
              borderLeft: `1px dashed ${authPalette.ink}`,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 2,
              mb: 0.75,
            }}
          >
            <Typography
              sx={{
                fontFamily: authFonts.mono,
                fontSize: 10,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: authPalette.inkFaint,
              }}
            >
              Tu link de reservas
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => setCustomizingLink((v) => !v)}
              sx={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: authFonts.mono,
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: authPalette.secondary,
                '&:hover': { color: authPalette.primary },
              }}
            >
              {customizingLink ? 'Usar el nombre' : 'Personalizar'}
            </Box>
          </Box>
          {customizingLink ? (
            <TextField
              fullWidth
              variant="filled"
              label="Link"
              placeholder="mi-negocio"
              value={subdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              error={subdomainAvailable === false}
              helperText={
                checkingSubdomain
                  ? 'Verificando...'
                  : subdomainAvailable === true
                  ? `✓ ${subdomain}.turnos-pro.com está disponible`
                  : subdomainAvailable === false
                  ? 'Ese link ya está en uso — probá otro'
                  : 'Solo minúsculas, números y guiones'
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {checkingSubdomain && (
                      <CircularProgress size={16} sx={{ color: authPalette.inkFaint }} />
                    )}
                    {subdomainAvailable === true && (
                      <CheckCircleIcon sx={{ color: authPalette.primary, fontSize: 20 }} />
                    )}
                  </InputAdornment>
                ),
              }}
              sx={underlineFieldSx}
            />
          ) : (
            <Typography
              sx={{
                fontFamily: authFonts.display,
                fontStyle: 'italic',
                fontSize: 20,
                fontWeight: 500,
                color: authPalette.primary,
                letterSpacing: '-0.01em',
                fontVariationSettings: '"opsz" 144',
                wordBreak: 'break-all',
              }}
            >
              {subdomain || 'tu-negocio'}
              <Box
                component="span"
                sx={{ color: authPalette.ink, fontStyle: 'normal', fontWeight: 400 }}
              >
                .turnos-pro.com
              </Box>
            </Typography>
          )}
        </Box>

        <Box component={motion.div} {...item(0.12)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            variant="filled"
            label="Celular"
            placeholder="+54 9 11 ..."
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.18)} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            variant="filled"
            label="Dirección (opcional)"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            sx={underlineFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.24)}>
          <PillCTA
            type="submit"
            disabled={
              loading ||
              !businessName.trim() ||
              !mobile.trim() ||
              !subdomain ||
              subdomain.length < 3 ||
              subdomainAvailable === false
            }
            loading={loading}
          >
            Activar mi cuenta →
          </PillCTA>
        </Box>
      </Box>
    </>
  );

  const renderSuccess = () => (
    <Box component={motion.div} {...item(0)} sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 84,
          height: 84,
          borderRadius: '50%',
          backgroundColor: authPalette.primary,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: -10,
            border: `1px solid ${authPalette.ink}`,
            borderRadius: '50%',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -20,
            border: `1px dashed ${authPalette.secondary}`,
            borderRadius: '50%',
          },
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 44, color: '#F4EFE6' }} />
      </Box>
      <Typography
        sx={{
          fontFamily: authFonts.mono,
          fontSize: 10.5,
          letterSpacing: '0.24em',
          color: authPalette.secondary,
          textTransform: 'uppercase',
          mb: 1.5,
        }}
      >
        Edición especial · Cuenta activada
      </Typography>
      <Typography
        component="h1"
        sx={{
          fontFamily: authFonts.display,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: { xs: 48, sm: 64 },
          lineHeight: 0.95,
          letterSpacing: '-0.025em',
          color: authPalette.ink,
          mb: 2,
          fontVariationSettings: '"opsz" 144, "SOFT" 30',
          '& .upright': { fontStyle: 'normal', fontWeight: 500 },
        }}
      >
        ¡<span className="upright">Listo</span>!
      </Typography>
      <Typography
        sx={{
          fontFamily: authFonts.display,
          fontStyle: 'italic',
          fontSize: 17,
          color: authPalette.inkSoft,
          mb: 4,
          maxWidth: 380,
          mx: 'auto',
          lineHeight: 1.5,
        }}
      >
        Tu TurnosPro está armado. Entrá y cargá los primeros turnos.
      </Typography>
      <Box sx={{ display: 'inline-block', minWidth: 260 }}>
        <PillCTA onClick={() => (window.location.href = redirectUrl)}>
          Ir al panel →
        </PillCTA>
      </Box>
    </Box>
  );

  const renderStep = () => {
    if (loading && currentStep === 'business' && !verifiedEmail) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: authPalette.primary }} />
          <Typography
            sx={{
              mt: 2,
              fontFamily: authFonts.mono,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: authPalette.inkFaint,
            }}
          >
            Verificando token...
          </Typography>
        </Box>
      );
    }

    switch (currentStep) {
      case 'signup':
        return renderSignup();
      case 'email-sent':
        return renderEmailSent();
      case 'business':
        return renderBusinessStep();
      case 'success':
        return renderSuccess();
      default:
        return renderSignup();
    }
  };

  return <AuthShell>{renderStep()}</AuthShell>;
};

export default SelfRegistration;
