import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import {
  Check,
  Close,
  Star,
  EventNote,
  Groups,
  Storefront,
  Payment,
  Palette,
  Sms,
  Email,
  Assessment,
  LocationOn,
  QrCode2,
  WhatsApp,
  AllInclusive,
  People,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Plan {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  maxBookingsPerMonth: number;
  maxServices: number;
  maxStaff: number;
  maxCustomers: number;
  allowOnlinePayments: boolean;
  allowCustomBranding: boolean;
  allowSmsNotifications: boolean;
  allowEmailMarketing: boolean;
  allowReports: boolean;
  allowMultiLocation: boolean;
  isPopular: boolean;
  trialDays: number;
}

interface SubscriptionStatus {
  isActive: boolean;
  planType: string;
  planName: string;
  expiresAt?: string;
  monthlyAmount: number;
  daysRemaining: number;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  qrCodeData?: string;
}

const SubscriptionPlans: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    checkSubscriptionStatus();
  }, []);

  const fetchPlans = async () => {
    try {
      // Hardcoded plans mientras se configura el backend
      const hardcodedPlans: Plan[] = [
        {
          code: 'basic',
          name: 'Plan Básico',
          description: 'Todo lo que necesitas para gestionar tu negocio',
          price: 15000,
          currency: 'ARS',
          maxBookingsPerMonth: -1, // Ilimitado
          maxServices: -1, // Ilimitado
          maxStaff: -1, // Ilimitado
          maxCustomers: -1, // Ilimitado
          allowOnlinePayments: true,
          allowCustomBranding: true,
          allowSmsNotifications: true,
          allowEmailMarketing: true,
          allowReports: true,
          allowMultiLocation: true,
          isPopular: false,
          trialDays: 0, // Sin trial adicional
        },
        {
          code: 'premium',
          name: 'Plan Premium',
          description: 'Incluye WhatsApp con 100 mensajes/mes',
          price: 20000,
          currency: 'ARS',
          maxBookingsPerMonth: -1, // Ilimitado
          maxServices: -1, // Ilimitado
          maxStaff: -1, // Ilimitado
          maxCustomers: -1, // Ilimitado
          allowOnlinePayments: true,
          allowCustomBranding: true,
          allowSmsNotifications: true,
          allowEmailMarketing: true,
          allowReports: true,
          allowMultiLocation: true,
          isPopular: true,
          trialDays: 0, // Sin trial adicional
        },
      ];
      
      setPlans(hardcodedPlans);
      
      // Intenta obtener del backend, pero usa hardcoded si falla
      try {
        const response = await api.get('/subscription/plans');
        if (response.data && response.data.length > 0) {
          setPlans(response.data);
        }
      } catch (backendError) {
        console.log('Using hardcoded plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Error al cargar los planes');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscription/status');
      setCurrentStatus(response.data);
      
      // Si hay QR code y no está activa, mostrar modal
      if (response.data.qrCodeData && !response.data.isActive) {
        setQrCode(response.data.qrCodeData);
        setShowQrModal(true);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleSubscribe = async (planCode: string) => {
    setSubscribing(planCode);
    setError(null);
    
    try {
      // Crear suscripción y obtener link de pago de MercadoPago
      const response = await api.post('/subscription/subscribe', { planCode });
      
      if (response.data.paymentUrl) {
        // Redirigir directamente a MercadoPago para el pago
        window.location.href = response.data.paymentUrl;
      } else if (response.data.qrCode) {
        // Si hay QR code (pago presencial), mostrar modal
        setQrCode(response.data.qrCode);
        setShowQrModal(true);
      } else {
        setError('No se pudo generar el link de pago. Por favor, intenta nuevamente.');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al procesar el pago. Por favor, intenta nuevamente.');
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanFeatures = (plan: Plan) => {
    // Todas las características están incluidas en ambos planes
    const features = [
      {
        icon: <AllInclusive />,
        text: 'Reservas ilimitadas',
        included: true,
      },
      {
        icon: <Storefront />,
        text: 'Servicios ilimitados',
        included: true,
      },
      {
        icon: <Groups />,
        text: 'Empleados ilimitados',
        included: true,
      },
      {
        icon: <People />,
        text: 'Clientes ilimitados',
        included: true,
      },
      {
        icon: <Payment />,
        text: 'Pagos online con MercadoPago',
        included: true,
      },
      {
        icon: <Palette />,
        text: 'Branding personalizado',
        included: true,
      },
      {
        icon: <Sms />,
        text: 'Notificaciones SMS',
        included: true,
      },
      {
        icon: <Email />,
        text: 'Email automático',
        included: true,
      },
      {
        icon: <Assessment />,
        text: 'Reportes y analytics',
        included: true,
      },
      {
        icon: <LocationOn />,
        text: 'Múltiples sucursales',
        included: true,
      },
      {
        icon: <WhatsApp />,
        text: plan.code === 'premium' ? 'WhatsApp (100 mensajes/mes incluidos)' : 'Notificaciones WhatsApp',
        included: plan.code === 'premium' || plan.code === 'pro', // Solo en Premium
        highlight: plan.code === 'premium',
      },
    ];
    
    return features;
  };

  const getPlanColor = (planCode: string) => {
    switch (planCode) {
      case 'basic':
        return '#1976d2';
      case 'premium':
      case 'pro':
        return '#9c27b0';
      default:
        return '#1976d2';
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Elige tu Plan Perfecto
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {currentStatus?.isTrialPeriod 
              ? `Tienes ${currentStatus.daysRemaining} días restantes en tu demo` 
              : 'Activa tu suscripción y comienza a crecer'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            🚀 Todos los planes incluyen funciones completas. Precios simples y transparentes.
          </Typography>
        </Box>

        {/* Current Status Alert */}
        {currentStatus && currentStatus.isActive && (
          <Alert severity="success" sx={{ mb: 4 }}>
            <Typography variant="body1">
              <strong>Plan actual:</strong> {currentStatus.planName}
              {currentStatus.isTrialPeriod && (
                <> - Período de prueba (quedan {currentStatus.daysRemaining} días)</>
              )}
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Feature Comparison Info */}
        <Box sx={{ mb: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', fontWeight: 600 }}>
            ✨ Todos los planes incluyen:
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Sistema de reservas ilimitado
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Gestión completa de clientes
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Pagos online con MercadoPago
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Panel de control y reportes
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Recordatorios por SMS y Email
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Personalización con tu marca
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Check sx={{ color: 'success.main', mr: 1 }} /> Soporte para múltiples sucursales
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Star sx={{ color: 'warning.main', mr: 1 }} /> WhatsApp - 100 mensajes/mes (Solo Premium)
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Plans Grid - Centered for 2 plans */}
        <Grid container spacing={4} alignItems="stretch" justifyContent="center">
          {plans.map((plan) => (
            <Grid item xs={12} md={5} lg={4} key={plan.code}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{ height: '100%' }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: plan.isPopular ? `2px solid ${getPlanColor(plan.code)}` : '1px solid',
                    borderColor: plan.isPopular ? getPlanColor(plan.code) : 'divider',
                    transform: plan.isPopular ? 'scale(1.05)' : 'none',
                    boxShadow: plan.isPopular ? 6 : 2,
                  }}
                >
                  {/* Popular Badge */}
                  {plan.isPopular && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        icon={<Star />}
                        label="MÁS POPULAR"
                        color="primary"
                        sx={{
                          backgroundColor: getPlanColor(plan.code),
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  )}

                  <CardContent sx={{ flexGrow: 1, pt: plan.isPopular ? 4 : 3 }}>
                    {/* Plan Name */}
                    <Typography
                      variant="h5"
                      component="h2"
                      gutterBottom
                      sx={{
                        fontWeight: 700,
                        color: getPlanColor(plan.code),
                        textAlign: 'center',
                      }}
                    >
                      {plan.name}
                    </Typography>

                    {/* Description */}
                    {plan.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: 'center', mb: 3 }}
                      >
                        {plan.description}
                      </Typography>
                    )}

                    {/* Price */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography
                        variant="h3"
                        component="div"
                        sx={{ fontWeight: 700, color: getPlanColor(plan.code) }}
                      >
                        {formatPrice(plan.price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        por mes
                      </Typography>
                    </Box>

                    {/* Features */}
                    <List dense>
                      {getPlanFeatures(plan).map((feature, index) => (
                        <ListItem key={index} sx={{ 
                          px: 0,
                          backgroundColor: feature.highlight ? 'warning.main' + '10' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5
                        }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {feature.included ? (
                              <Check sx={{ color: feature.highlight ? 'warning.main' : 'success.main' }} />
                            ) : (
                              <Close sx={{ color: 'text.disabled' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={feature.text}
                            secondary={feature.highlight && plan.code === 'premium' ? 'Luego $50 por mensaje adicional' : null}
                            primaryTypographyProps={{
                              variant: 'body2',
                              color: feature.included ? 'text.primary' : 'text.disabled',
                              fontWeight: feature.highlight ? 600 : 400,
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              color: 'text.secondary',
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>

                  <CardActions sx={{ p: 2 }}>
                    <Button
                      fullWidth
                      variant={plan.isPopular ? 'contained' : 'outlined'}
                      size="large"
                      onClick={() => handleSubscribe(plan.code)}
                      disabled={subscribing !== null || (currentStatus?.planType === plan.code && currentStatus?.isActive)}
                      sx={{
                        backgroundColor: plan.isPopular ? getPlanColor(plan.code) : undefined,
                        borderColor: getPlanColor(plan.code),
                        color: plan.isPopular ? 'white' : getPlanColor(plan.code),
                        '&:hover': {
                          backgroundColor: plan.isPopular 
                            ? getPlanColor(plan.code) 
                            : `${getPlanColor(plan.code)}10`,
                        },
                      }}
                    >
                      {subscribing === plan.code ? (
                        <CircularProgress size={24} />
                      ) : currentStatus?.planType === plan.code && currentStatus?.isActive ? (
                        'Plan Actual'
                      ) : (
                        'Contratar Ahora'
                      )}
                    </Button>
                  </CardActions>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* WhatsApp Pricing Info */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.main', borderRadius: 2, opacity: 0.1 }}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <WhatsApp sx={{ mr: 1, color: 'success.main' }} />
              <strong>Plan Premium - Modelo de WhatsApp:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              • 100 mensajes incluidos por mes en tu plan
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              • Mensajes adicionales: $50 por mensaje
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              • Se cobra al final del mes por el consumo excedente
            </Typography>
          </Box>
        </Box>

        {/* QR Payment Modal */}
        <Dialog
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Completa tu Pago</Typography>
              <IconButton onClick={() => setShowQrModal(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <QrCode2 sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Escanea el código QR con MercadoPago
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Abre la app de MercadoPago en tu celular y escanea este código para completar el pago
              </Typography>
              
              {qrCode && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <img 
                    src={qrCode} 
                    alt="QR Code para pago" 
                    style={{ maxWidth: '300px', width: '100%' }}
                  />
                </Box>
              )}
              
              <Alert severity="info">
                Una vez completado el pago, tu suscripción se activará automáticamente
              </Alert>
            </Box>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default SubscriptionPlans;