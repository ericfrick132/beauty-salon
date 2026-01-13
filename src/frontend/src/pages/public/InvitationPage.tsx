import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CardHeader,
  Alert,
  Divider,
  Chip,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Business,
  Person,
  Security,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { invitationApi } from '../../services/api';

interface InvitationDetails {
  id: string;
  businessName: string;
  businessAddress?: string;
  subdomain: string;
  adminEmail: string;
  adminPhone?: string;
  timeZone?: string;
  currency?: string;
  language?: string;
  isDemo: boolean;
  demoDays: number;
  status: string;
  expiresAt: string;
  verticalName: string;
  verticalCode: string;
  verticalDomain: string;
  planName?: string;
  planPrice?: number;
  planFeatures?: string;
}

interface AcceptInvitationData {
  token: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [acceptData, setAcceptData] = useState<AcceptInvitationData>({
    token: token || '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const steps = ['Validar Invitación', 'Completar Información', 'Confirmación'];

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError('Token de invitación no válido');
      setLoading(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      setError('Token de invitación no válido');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await invitationApi.getInvitation(token);
      const invitationData = response.data || response;
      
      setInvitation(invitationData);
      setActiveStep(1); // Ir al paso de completar información
      
      // Prellenar email
      setAcceptData(prev => ({
        ...prev,
        token: token || '',
      }));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error cargando invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      // Validar campos
      if (!acceptData.firstName || !acceptData.lastName) {
        setError('Por favor completa todos los campos requeridos');
        return;
      }
      
      if (acceptData.password !== acceptData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      
      if (acceptData.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      
      setAcceptLoading(true);
      setError('');
      
      const response = await invitationApi.acceptInvitation(acceptData);
      
      setSuccess('¡Tenant creado exitosamente! Redirigiendo...');
      setActiveStep(2); // Ir a confirmación
      
      // Redirigir al tenant después de 3 segundos
      setTimeout(() => {
        const tenantUrl = response.data?.tenantUrl || response.tenantUrl;
        if (tenantUrl) {
          window.location.href = tenantUrl;
        } else {
          setError('No se pudo obtener la URL del tenant');
        }
      }, 3000);
      
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error aceptando invitación');
    } finally {
      setAcceptLoading(false);
    }
  };

  const renderValidationStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      {loading ? (
        <>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Validando invitación...</Typography>
        </>
      ) : error ? (
        <>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            Error de Invitación
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {error}
          </Typography>
        </>
      ) : (
        <>
          <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" color="success.main">
            Invitación Válida
          </Typography>
        </>
      )}
    </Box>
  );

  const renderInformationStep = () => (
    <Box sx={{ py: 2 }}>
      {invitation && (
        <>
          {/* Detalles de la Invitación */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Detalles de la Invitación" 
              sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText' }}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Información del Negocio
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    Nombre: {invitation.businessName}
                  </Typography>
                  {invitation.businessAddress && (
                    <Typography variant="body2" color="text.secondary">
                      Dirección: {invitation.businessAddress}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Subdominio: {invitation.subdomain}.{invitation.verticalDomain}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Plan: {invitation.isDemo ? 'Demo' : invitation.planName || 'Básico'}
                  </Typography>
                  {invitation.isDemo && (
                    <Chip 
                      label={`Invitación Demo`} 
                      color="info" 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Configuración
                  </Typography>
                  {invitation.isDemo && (
                    <Typography variant="body2">
                      Precio Mensual: $0
                    </Typography>
                  )}
                  {invitation.planPrice && !invitation.isDemo && (
                    <Typography variant="body2">
                      Precio Mensual: ${invitation.planPrice}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Zona Horaria: {invitation.timeZone}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3 }} />

          {/* Información del Administrador */}
          <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
            Información del Administrador
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={acceptData.firstName}
                onChange={(e) => setAcceptData({...acceptData, firstName: e.target.value})}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido"
                value={acceptData.lastName}
                onChange={(e) => setAcceptData({...acceptData, lastName: e.target.value})}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Teléfono"
                value={acceptData.phone}
                onChange={(e) => setAcceptData({...acceptData, phone: e.target.value})}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                value={invitation.adminEmail}
                disabled
                helperText="Este será tu email de acceso"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={acceptData.password}
                onChange={(e) => setAcceptData({...acceptData, password: e.target.value})}
                required
                helperText="Mínimo 8 caracteres"
                InputProps={{
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
                value={acceptData.confirmPassword}
                onChange={(e) => setAcceptData({...acceptData, confirmPassword: e.target.value})}
                required
                error={acceptData.confirmPassword !== '' && acceptData.password !== acceptData.confirmPassword}
                helperText={acceptData.confirmPassword !== '' && acceptData.password !== acceptData.confirmPassword ? 'Las contraseñas no coinciden' : ''}
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
        </>
      )}
    </Box>
  );

  const renderConfirmationStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CheckCircle color="success" sx={{ fontSize: 80, mb: 3 }} />
      <Typography variant="h4" color="success.main" gutterBottom>
        ¡Bienvenido a {invitation?.businessName}!
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

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                Bienvenido a {invitation?.businessName || 'Turnos Pro'}
              </Typography>
              <Typography variant="subtitle1">
                Has sido invitado a configurar tu negocio en nuestra plataforma
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
            <Box sx={{ p: 3 }}>
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

              {activeStep === 0 && renderValidationStep()}
              {activeStep === 1 && renderInformationStep()}
              {activeStep === 2 && renderConfirmationStep()}

              {/* Actions */}
              {activeStep === 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleAcceptInvitation}
                    disabled={acceptLoading || !acceptData.firstName || !acceptData.lastName || !acceptData.password || acceptData.password !== acceptData.confirmPassword}
                    sx={{ minWidth: 200 }}
                  >
                    {acceptLoading ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Creando Cuenta...
                      </>
                    ) : (
                      'Crear Mi Cuenta'
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

export default InvitationPage;