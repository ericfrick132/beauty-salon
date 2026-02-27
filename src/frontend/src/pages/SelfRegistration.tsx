import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Email,
  Security,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Language,
  Business,
  Phone,
  PhoneAndroid,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { registrationApi } from '../services/api';

type FlowStep = 'email' | 'email-sent' | 'url' | 'business' | 'success';

const SelfRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  // Determine initial step based on URL
  const [currentStep, setCurrentStep] = useState<FlowStep>(tokenFromUrl ? 'url' : 'email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0: Email + Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Token from verification
  const [rememberToken, setRememberToken] = useState(tokenFromUrl || '');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Step 1: URL
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  // Step 2: Business Data
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [mobile, setMobile] = useState('');

  // Step 3: Success
  const [redirectUrl, setRedirectUrl] = useState('');

  // Dev helpers
  const [devToken, setDevToken] = useState('');
  const [devConfirmUrl, setDevConfirmUrl] = useState('');

  // Verify token when arriving from /register/confirm?token=xxx
  useEffect(() => {
    if (tokenFromUrl) {
      verifyToken(tokenFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  const verifyToken = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await registrationApi.verify(token);
      if (response.success) {
        setRememberToken(token);
        setVerifiedEmail(response.email);
        setCurrentStep('url');
      } else {
        setError(response.message || 'Token inválido');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error verificando el token. El link puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  // Subdomain availability check with debounce
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

  // ---- STEP HANDLERS ----

  const handleStartSubmit = async () => {
    setError('');

    if (!email || !password || !confirmPassword) {
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
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const response = await registrationApi.start({ email, password, confirmPassword });
      if (response.success) {
        // Save dev helpers if present
        if (response.devToken) setDevToken(response.devToken);
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

  const handleCompleteSubmit = async () => {
    setError('');
    if (!businessName) {
      setError('El nombre del negocio es requerido');
      return;
    }
    if (!mobile) {
      setError('El celular es requerido');
      return;
    }

    setLoading(true);
    try {
      const response = await registrationApi.complete({
        rememberToken,
        subdomain,
        businessName,
        businessAddress: businessAddress || undefined,
        phone: phone || undefined,
        website: website || undefined,
        mobile,
      });

      if (response.success) {
        setRedirectUrl(response.redirectUrl);
        setCurrentStep('success');
      } else {
        setError(response.message || 'Error al completar el registro');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al completar el registro');
    } finally {
      setLoading(false);
    }
  };

  // ---- STEP RENDERERS ----

  const getStepperIndex = (): number => {
    switch (currentStep) {
      case 'email':
      case 'email-sent': return 0;
      case 'url': return 1;
      case 'business': return 2;
      case 'success': return 3;
      default: return 0;
    }
  };

  const stepLabels = ['Cuenta', 'URL', 'Negocio', 'Listo'];

  const renderEmailStep = () => (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, textAlign: 'center', fontWeight: 600 }}>
        Creá tu cuenta
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
        Empezá con tu email y una contraseña
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            InputProps={{
              startAdornment: <InputAdornment position="start"><Email /></InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Mínimo 8 caracteres"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Security /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Confirmar contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={confirmPassword !== '' && password !== confirmPassword}
            helperText={confirmPassword !== '' && password !== confirmPassword ? 'Las contraseñas no coinciden' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleStartSubmit}
            disabled={loading}
            sx={{ mt: 1, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Continuar'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  const renderEmailSentStep = () => (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Revisá tu email
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Te enviamos un email de confirmación a <strong>{email}</strong>.
        <br />
        Hacé click en el link para continuar con el registro.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Si no lo ves, revisá la carpeta de spam.
      </Typography>

      {/* Dev helper - only shown in development */}
      {devConfirmUrl && (
        <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Modo desarrollo - Link de confirmación:
          </Typography>
          <Typography
            variant="body2"
            component="a"
            href={devConfirmUrl}
            sx={{ wordBreak: 'break-all', color: 'primary.main' }}
          >
            {devConfirmUrl}
          </Typography>
        </Alert>
      )}
    </Box>
  );

  const renderUrlStep = () => (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, textAlign: 'center', fontWeight: 600 }}>
        Elegí tu URL
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
        Paso 1 de 2 {verifiedEmail && `- ${verifiedEmail}`}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Subdominio"
            value={subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            required
            autoFocus
            error={subdomainAvailable === false}
            helperText={
              checkingSubdomain ? 'Verificando disponibilidad...' :
              subdomainAvailable === true ? 'Subdominio disponible' :
              subdomainAvailable === false ? 'Subdominio no disponible' :
              'Solo letras minúsculas, números y guiones'
            }
            InputProps={{
              startAdornment: <InputAdornment position="start"><Language /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  {checkingSubdomain && <CircularProgress size={20} />}
                  {subdomainAvailable === true && <CheckCircle color="success" />}
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: 'grey.50',
              borderStyle: 'dashed',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Tu URL será:
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
              {subdomain || 'tu-negocio'}.turnos-pro.com
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleUrlNext}
            disabled={loading || subdomainAvailable === false || !subdomain || subdomain.length < 3}
            sx={{ mt: 1, py: 1.5 }}
          >
            Continuar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  const renderBusinessStep = () => (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, textAlign: 'center', fontWeight: 600 }}>
        Datos del negocio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
        Paso 2 de 2
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre de la empresa"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoFocus
            InputProps={{
              startAdornment: <InputAdornment position="start"><Business /></InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Phone /></InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Celular"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            InputProps={{
              startAdornment: <InputAdornment position="start"><PhoneAndroid /></InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Sitio web"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.ejemplo.com"
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setCurrentStep('url')}
              sx={{ flex: 1, py: 1.5 }}
            >
              Atrás
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleCompleteSubmit}
              disabled={loading}
              sx={{ flex: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Completar el registro'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const renderSuccessStep = () => (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: 'success.main' }}>
        Felicidades!
      </Typography>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Te has registrado correctamente.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Tu negocio ya está listo en Turnos Pro.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => { window.location.href = redirectUrl; }}
        sx={{ px: 6, py: 1.5 }}
      >
        Ir al panel de control
      </Button>
    </Box>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'email': return renderEmailStep();
      case 'email-sent': return renderEmailSentStep();
      case 'url': return renderUrlStep();
      case 'business': return renderBusinessStep();
      case 'success': return renderSuccessStep();
      default: return null;
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      py: 4,
    }}>
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={8} sx={{ overflow: 'hidden', borderRadius: 3 }}>
            {/* Header */}
            <Box sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 3,
              textAlign: 'center',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Turnos Pro
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Creá tu cuenta gratis - 7 días de prueba
              </Typography>
            </Box>

            {/* Stepper - only show for url/business/success steps */}
            {(currentStep === 'url' || currentStep === 'business' || currentStep === 'success') && (
              <Box sx={{ px: 3, pt: 3 }}>
                <Stepper activeStep={getStepperIndex() - 1} alternativeLabel>
                  {['URL', 'Negocio'].map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>
            )}

            {/* Content */}
            <Box sx={{ p: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {loading && currentStep === 'url' && !error ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }}>Verificando token...</Typography>
                </Box>
              ) : (
                renderCurrentStep()
              )}
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default SelfRegistration;
