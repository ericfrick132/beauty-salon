/**
 * /register — full-page split-screen signup (Harbiz pattern).
 *
 * Replaces the old centered multi-step modal with a full-page AuthShell.
 * The backend signup API is **unchanged**:
 *   1. POST /registration/start        → sends confirmation email
 *   2. GET  /register/confirm?token=x  → verify token, reveal URL form
 *   3. POST /registration/check-subdomain
 *   4. POST /registration/complete OR /registration/google-register
 *
 * The UX is compressed visually (each phase is shown inside the right
 * panel of the AuthShell; the left panel never changes), so the user
 * always sees the same editorial testimonials + headline regardless of
 * which phase they're in.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
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

type FlowStep =
  | 'signup' // Google + email/password/business name + terms (entry)
  | 'email-sent' // waiting for email confirmation
  | 'url' // post-verify: pick subdomain
  | 'business' // mobile + address + etc.
  | 'success';

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

const primaryButtonSx = {
  height: 48,
  fontFamily: authFonts.body,
  fontWeight: 600,
  fontSize: 15,
  textTransform: 'none' as const,
  borderRadius: 1.5,
  backgroundColor: authPalette.primary,
  color: authPalette.paper,
  '&:hover': { backgroundColor: '#174a32' },
  '&.Mui-disabled': {
    backgroundColor: 'rgba(23, 20, 16, 0.08)',
    color: 'rgba(23, 20, 16, 0.35)',
  },
};

const outlinedButtonSx = {
  height: 48,
  fontFamily: authFonts.body,
  fontWeight: 500,
  fontSize: 15,
  textTransform: 'none' as const,
  borderRadius: 1.5,
  color: authPalette.ink,
  borderColor: 'rgba(23, 20, 16, 0.2)',
  backgroundColor: 'transparent',
  '&:hover': {
    borderColor: authPalette.primary,
    backgroundColor: 'rgba(30, 94, 63, 0.05)',
  },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: authFonts.body,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
};

const SelfRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const prefersReducedMotion = useReducedMotion();

  // ----- Flow state -----
  const [currentStep, setCurrentStep] = useState<FlowStep>(
    tokenFromUrl ? 'url' : 'signup'
  );
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
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
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
            setCurrentStep('url');
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
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
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
    setCurrentStep('url');
  };

  const handleUrlNext = () => {
    setError('');
    if (!subdomain || subdomain.length < 3) {
      setError('El subdominio debe tener al menos 3 caracteres');
      return;
    }
    if (subdomainAvailable === false) {
      setError('El subdominio no está disponible');
      return;
    }
    setCurrentStep('business');
  };

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
        setError(err.response?.data?.message || 'Error al completar el registro');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Motion helpers ----------------

  const item = (delay: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
        };

  // ---------------- Step renderers ----------------

  const Header: React.FC<{
    kicker: string;
    title: string;
    subtitle?: string;
  }> = ({ kicker, title, subtitle }) => (
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
        {kicker}
      </Typography>
      <Typography
        component="h1"
        sx={{
          fontFamily: authFonts.display,
          fontWeight: 500,
          fontSize: { xs: 30, sm: 36 },
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: authPalette.ink,
          mb: subtitle ? 1 : 0,
          fontVariationSettings: '"opsz" 144, "SOFT" 30',
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            fontFamily: authFonts.body,
            fontSize: 15,
            lineHeight: 1.5,
            color: authPalette.inkSoft,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  const renderSignup = () => (
    <>
      <Header
        kicker="7 días gratis"
        title="Creá tu cuenta"
        subtitle="Llevá la relación con tus clientes al siguiente nivel."
      />

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
          text="signup_with"
          onSuccess={handleGoogleSignup}
          onError={(msg) => setError(msg)}
        />
      </Box>

      <Box component={motion.div} {...item(0.32)}>
        <Divider label="o con email" />
      </Box>

      <Box component="form" onSubmit={handleSignupSubmit}>
        <Box component={motion.div} {...item(0.38)} sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            label="Nombre del negocio"
            placeholder="Estudio Luli"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoFocus
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            sx={textFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.44)} sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            sx={textFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.5)} sx={{ mb: 1.5 }}>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="Mínimo 8 caracteres"
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={textFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.56)} sx={{ mb: 2.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                size="small"
                sx={{
                  color: 'rgba(23, 20, 16, 0.35)',
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
                }}
              >
                Acepto los{' '}
                <Box
                  component="a"
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  sx={{ color: authPalette.primary, textDecoration: 'none' }}
                >
                  términos y condiciones
                </Box>
              </Typography>
            }
          />
        </Box>

        <Box component={motion.div} {...item(0.62)}>
          <Button
            type="submit"
            fullWidth
            disabled={loading}
            sx={primaryButtonSx}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: authPalette.paper }} />
            ) : (
              'Crear cuenta'
            )}
          </Button>
        </Box>

        <Box
          component={motion.div}
          {...item(0.68)}
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
                color: authPalette.primary,
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
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
    <>
      <Box
        component={motion.div}
        {...item(0.2)}
        sx={{ textAlign: 'center', mb: 3 }}
      >
        <EmailIcon
          sx={{ fontSize: 56, color: authPalette.primary, mb: 2 }}
        />
        <Typography
          component="h1"
          sx={{
            fontFamily: authFonts.display,
            fontWeight: 500,
            fontSize: { xs: 28, sm: 34 },
            letterSpacing: '-0.02em',
            color: authPalette.ink,
            mb: 1,
            fontVariationSettings: '"opsz" 144, "SOFT" 30',
          }}
        >
          Revisá tu email
        </Typography>
        <Typography
          sx={{
            fontFamily: authFonts.body,
            fontSize: 15,
            color: authPalette.inkSoft,
            lineHeight: 1.5,
          }}
        >
          Te enviamos un link de confirmación a{' '}
          <Box
            component="strong"
            sx={{ color: authPalette.ink, fontWeight: 600 }}
          >
            {email}
          </Box>
          . Hacé click para continuar. Si no lo ves, revisá la carpeta de spam.
        </Typography>
      </Box>

      {devConfirmUrl && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, mb: 0.5, fontFamily: authFonts.body }}
          >
            Modo desarrollo — link de confirmación:
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
    </>
  );

  const renderUrlStep = () => (
    <>
      <Header
        kicker="Paso 1 de 2"
        title="Elegí tu URL"
        subtitle={
          verifiedEmail
            ? `Tu cuenta: ${verifiedEmail}`
            : 'Donde tus clientes van a reservar.'
        }
      />

      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 2, borderRadius: 1.5 }}
        >
          {error}
        </Alert>
      )}

      <Box component={motion.div} {...item(0.3)} sx={{ mb: 1.5 }}>
        <TextField
          fullWidth
          label="Subdominio"
          placeholder="mi-peluqueria"
          value={subdomain}
          onChange={(e) => handleSubdomainChange(e.target.value)}
          required
          autoFocus
          error={subdomainAvailable === false}
          helperText={
            checkingSubdomain
              ? 'Verificando disponibilidad...'
              : subdomainAvailable === true
              ? 'Subdominio disponible'
              : subdomainAvailable === false
              ? 'Subdominio no disponible'
              : 'Solo letras minúsculas, números y guiones'
          }
          InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {checkingSubdomain && <CircularProgress size={18} />}
                {subdomainAvailable === true && (
                  <CheckCircleIcon sx={{ color: authPalette.primary }} />
                )}
              </InputAdornment>
            ),
          }}
          sx={textFieldSx}
        />
      </Box>

      <Box
        component={motion.div}
        {...item(0.36)}
        sx={{
          border: '1px dashed rgba(23, 20, 16, 0.22)',
          borderRadius: 1.5,
          p: 2,
          textAlign: 'center',
          mb: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        <Typography
          sx={{
            fontFamily: authFonts.mono,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: authPalette.inkFaint,
            mb: 0.5,
          }}
        >
          Tu URL será
        </Typography>
        <Typography
          sx={{
            fontFamily: authFonts.display,
            fontSize: 20,
            fontWeight: 500,
            color: authPalette.primary,
            letterSpacing: '-0.01em',
          }}
        >
          {subdomain || 'tu-negocio'}.turnos-pro.com
        </Typography>
      </Box>

      <Box component={motion.div} {...item(0.42)}>
        <Button
          fullWidth
          onClick={handleUrlNext}
          disabled={
            loading ||
            subdomainAvailable === false ||
            !subdomain ||
            subdomain.length < 3
          }
          sx={primaryButtonSx}
        >
          Continuar
        </Button>
      </Box>
    </>
  );

  const renderBusinessStep = () => (
    <>
      <Header
        kicker="Paso 2 de 2"
        title="Últimos datos"
        subtitle="Solo para terminar de armar tu cuenta."
      />

      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 2, borderRadius: 1.5 }}
        >
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleCompleteSubmit}>
        <Box component={motion.div} {...item(0.3)} sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            label="Nombre del negocio"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoFocus
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            sx={textFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.36)} sx={{ mb: 1.75 }}>
          <TextField
            fullWidth
            label="Celular"
            placeholder="+54 9 11 ..."
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            sx={textFieldSx}
          />
        </Box>

        <Box component={motion.div} {...item(0.42)} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            label="Dirección (opcional)"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            InputLabelProps={{ sx: { fontFamily: authFonts.body } }}
            sx={textFieldSx}
          />
        </Box>

        <Box
          component={motion.div}
          {...item(0.48)}
          sx={{ display: 'flex', gap: 1.5 }}
        >
          <Button
            variant="outlined"
            onClick={() => setCurrentStep('url')}
            sx={{ ...outlinedButtonSx, flex: 1 }}
          >
            Atrás
          </Button>
          <Button
            type="submit"
            disabled={loading}
            sx={{ ...primaryButtonSx, flex: 2 }}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: authPalette.paper }} />
            ) : (
              'Completar el registro'
            )}
          </Button>
        </Box>
      </Box>
    </>
  );

  const renderSuccess = () => (
    <Box component={motion.div} {...item(0.15)} sx={{ textAlign: 'center' }}>
      <CheckCircleIcon
        sx={{ fontSize: 72, color: authPalette.primary, mb: 2 }}
      />
      <Typography
        component="h1"
        sx={{
          fontFamily: authFonts.display,
          fontWeight: 500,
          fontSize: { xs: 32, sm: 38 },
          letterSpacing: '-0.02em',
          color: authPalette.ink,
          mb: 1,
          fontVariationSettings: '"opsz" 144, "SOFT" 30',
        }}
      >
        ¡Listo!
      </Typography>
      <Typography
        sx={{
          fontFamily: authFonts.body,
          fontSize: 16,
          color: authPalette.inkSoft,
          mb: 4,
        }}
      >
        Tu TurnosPro está armado. Entrá y cargá tus primeros turnos.
      </Typography>
      <Button
        onClick={() => {
          window.location.href = redirectUrl;
        }}
        sx={{ ...primaryButtonSx, px: 5 }}
      >
        Ir al panel
      </Button>
    </Box>
  );

  const renderStep = () => {
    if (loading && currentStep === 'url' && !verifiedEmail) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: authPalette.primary }} />
          <Typography
            sx={{
              mt: 2,
              fontFamily: authFonts.body,
              color: authPalette.inkSoft,
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
      case 'url':
        return renderUrlStep();
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
