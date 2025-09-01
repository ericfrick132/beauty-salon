import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import {
  Business,
  Person,
  Security,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Store,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { selfRegistrationApi } from '../services/api';

interface Vertical {
  id: string;
  name: string;
  code: string;
  description: string;
  domain: string;
}

interface SelfRegistrationData {
  verticalCode: string;
  subdomain: string;
  businessName: string;
  businessAddress?: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone?: string;
  adminPassword: string;
  confirmPassword: string;
}

const SelfRegistration: React.FC = () => {
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  
  const [formData, setFormData] = useState<SelfRegistrationData>({
    verticalCode: '',
    subdomain: '',
    businessName: '',
    businessAddress: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: ''
  });

  const steps = ['Tipo de Negocio', 'Información del Negocio', 'Datos del Administrador', 'Confirmación'];

  useEffect(() => {
    loadVerticals();
  }, []);

  const loadVerticals = async () => {
    try {
      const response = await selfRegistrationApi.getVerticals();
      setVerticals(response.data || []);
    } catch (error: any) {
      setError('Error cargando tipos de negocio');
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setCheckingSubdomain(true);
    try {
      const response = await selfRegistrationApi.checkSubdomain(subdomain);
      setSubdomainAvailable(response.available);
    } catch (error) {
      setSubdomainAvailable(false);
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const generateSubdomain = (businessName: string): string => {
    // Generate subdomain from business name
    return businessName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleBusinessNameChange = (value: string) => {
    const newFormData = { ...formData, businessName: value };
    
    // Auto-generate subdomain only if it hasn't been manually modified
    if (!formData.subdomain || formData.subdomain === generateSubdomain(formData.businessName)) {
      const newSubdomain = generateSubdomain(value);
      newFormData.subdomain = newSubdomain;
      
      // Check availability if subdomain is valid
      if (newSubdomain && newSubdomain.length >= 3) {
        setTimeout(() => {
          checkSubdomainAvailability(newSubdomain);
        }, 500);
      }
    }
    
    setFormData(newFormData);
  };

  const handleSubdomainChange = (value: string) => {
    // Sanitize subdomain: only letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, subdomain: sanitized });
    
    // Debounce subdomain check
    setTimeout(() => {
      checkSubdomainAvailability(sanitized);
    }, 500);
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateCurrentStep = (): boolean => {
    setError('');
    setFieldErrors({});
    
    switch (activeStep) {
      case 0:
        if (!formData.verticalCode) {
          setError('Por favor selecciona el tipo de negocio');
          return false;
        }
        return true;
        
      case 1:
        if (!formData.businessName || !formData.subdomain) {
          setError('Por favor completa todos los campos requeridos');
          return false;
        }
        if (subdomainAvailable === false) {
          setError('El subdominio no está disponible');
          return false;
        }
        return true;
        
      case 2:
        if (!formData.adminFirstName || !formData.adminLastName || !formData.adminEmail || !formData.adminPassword) {
          setError('Por favor completa todos los campos requeridos');
          return false;
        }
        if (formData.adminPassword !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          setError('Por favor ingresa un email válido');
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setFieldErrors({});
      
      const payload = {
        ...formData,
        isDemo: true,
        demoDays: 7
      };
      
      const response = await selfRegistrationApi.register(payload);
      
      setSuccess('¡Cuenta creada exitosamente! Redirigiendo a tu plataforma...');
      setActiveStep(3);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = response.data.data.tenantUrl;
      }, 3000);
      
    } catch (error: any) {
      if (error.response?.data?.errors) {
        // Handle validation errors from backend
        const backendErrors: Record<string, string> = {};
        const errors = error.response.data.errors;
        
        Object.keys(errors).forEach(key => {
          if (Array.isArray(errors[key]) && errors[key].length > 0) {
            backendErrors[key] = errors[key][0]; // Take first error message
          }
        });
        
        setFieldErrors(backendErrors);
        setError('Por favor corrige los errores en el formulario');
      } else {
        setError(error.response?.data?.message || 'Error creando la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderVerticalStep = () => (
    <Box sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 4, textAlign: 'center', color: 'primary.main' }}>
        ¿Qué tipo de negocio tienes?
      </Typography>
      
      {fieldErrors.VerticalCode && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {fieldErrors.VerticalCode}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {verticals.map((vertical) => (
          <Grid item xs={12} sm={6} md={4} key={vertical.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: formData.verticalCode === vertical.code ? 2 : 1,
                borderColor: formData.verticalCode === vertical.code ? 'primary.main' : 'grey.300',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => setFormData({ ...formData, verticalCode: vertical.code })}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                py: 3,
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '200px'
              }}>
                <Store sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {vertical.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  {vertical.description}
                </Typography>
                {formData.verticalCode === vertical.code && (
                  <Chip 
                    label="Seleccionado" 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 2 }}
                    icon={<CheckCircle />}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderBusinessStep = () => (
    <Box sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 4, textAlign: 'center', color: 'primary.main' }}>
        Información de tu negocio
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre del Negocio"
            value={formData.businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            required
            error={!!fieldErrors.BusinessName}
            helperText={fieldErrors.BusinessName || "El subdominio se generará automáticamente basado en este nombre"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección del Negocio"
            value={formData.businessAddress}
            onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
            multiline
            rows={2}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Subdominio"
            value={formData.subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            required
            error={subdomainAvailable === false || !!fieldErrors.Subdomain}
            helperText={
              fieldErrors.Subdomain ? fieldErrors.Subdomain :
              checkingSubdomain ? 'Verificando disponibilidad...' :
              subdomainAvailable === true ? '✅ Subdominio disponible' :
              subdomainAvailable === false ? '❌ Subdominio no disponible' :
              'Tu URL será: ' + (formData.subdomain || 'tu-negocio') + '.turnos-pro.com'
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {checkingSubdomain && <CircularProgress size={20} />}
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderAdminStep = () => (
    <Box sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 4, textAlign: 'center', color: 'primary.main' }}>
        Datos del Administrador
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Nombre"
            value={formData.adminFirstName}
            onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
            required
            error={!!fieldErrors.AdminFirstName}
            helperText={fieldErrors.AdminFirstName}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Apellido"
            value={formData.adminLastName}
            onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
            required
            error={!!fieldErrors.AdminLastName}
            helperText={fieldErrors.AdminLastName}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.adminEmail}
            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
            required
            error={!!fieldErrors.AdminEmail}
            helperText={fieldErrors.AdminEmail || "Este será tu email de acceso a la plataforma"}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Teléfono"
            value={formData.adminPhone}
            onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
            error={!!fieldErrors.AdminPhone}
            helperText={fieldErrors.AdminPhone}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={formData.adminPassword}
            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
            required
            error={!!fieldErrors.AdminPassword}
            helperText={fieldErrors.AdminPassword || "Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Security />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Confirmar Contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            error={formData.confirmPassword !== '' && formData.adminPassword !== formData.confirmPassword}
            helperText={formData.confirmPassword !== '' && formData.adminPassword !== formData.confirmPassword ? 'Las contraseñas no coinciden' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderConfirmationStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CheckCircle color="success" sx={{ fontSize: 80, mb: 3 }} />
      <Typography variant="h4" color="success.main" gutterBottom>
        ¡Bienvenido a Turnos Pro!
      </Typography>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Tu cuenta ha sido creada exitosamente
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Redirigiendo a tu plataforma en unos momentos...
      </Typography>
      <CircularProgress />
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderVerticalStep();
      case 1:
        return renderBusinessStep();
      case 2:
        return renderAdminStep();
      case 3:
        return renderConfirmationStep();
      default:
        return 'Paso desconocido';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
      py: 4
    }}>
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper elevation={8} sx={{ overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ 
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: 'white',
              p: 3,
              textAlign: 'center'
            }}>
              <Typography variant="h4" gutterBottom>
                Crear Cuenta en Turnos Pro
              </Typography>
              <Typography variant="subtitle1">
                Configura tu negocio en minutos - 7 días gratis
              </Typography>
            </Box>

            {/* Stepper */}
            <Box sx={{ px: 3, pt: 3 }}>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Content */}
            <Box sx={{ p: 3, minHeight: 400 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              {getStepContent(activeStep)}

              {/* Actions */}
              {activeStep < 3 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                  >
                    Atrás
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={activeStep === steps.length - 2 ? handleSubmit : handleNext}
                    disabled={loading || (activeStep === 1 && subdomainAvailable === false)}
                    sx={{ minWidth: 120 }}
                  >
                    {loading ? (
                      <CircularProgress size={20} />
                    ) : activeStep === steps.length - 2 ? (
                      'Crear Cuenta'
                    ) : (
                      'Siguiente'
                    )}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default SelfRegistration;