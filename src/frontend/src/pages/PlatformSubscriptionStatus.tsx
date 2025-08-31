import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  AccountBalance,
  Payment as PaymentIcon,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  ArrowBack,
  Refresh as RefreshIcon,
  Receipt,
  CreditCard,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

interface TenantSubscription {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  platformPaymentId?: string;
  externalReference: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  approvedAt?: string;
  paymentUrl?: string;
  lastPaymentError?: string;
}

interface PlatformPaymentConfig {
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
  lastUpdated: string;
}

const PlatformSubscriptionStatus: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<TenantSubscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<TenantSubscription[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformPaymentConfig | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscriptionResponse, historyResponse, configResponse] = await Promise.allSettled([
        api.get('/platform/payments/current-subscription'),
        api.get('/platform/payments/history'),
        api.get('/platform/payments/config'),
      ]);
      
      if (subscriptionResponse.status === 'fulfilled') {
        const subscription = subscriptionResponse.value.data;
        setCurrentSubscription(subscription);
        
        if (subscription && subscription.periodEnd) {
          const endDate = new Date(subscription.periodEnd);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysUntilExpiry(diffDays);
        }
      } else {
        console.error('Error fetching current subscription:', subscriptionResponse.reason);
      }
      
      if (historyResponse.status === 'fulfilled') {
        setPaymentHistory(historyResponse.value.data || []);
      } else {
        console.error('Error fetching payment history:', historyResponse.reason);
      }
      
      if (configResponse.status === 'fulfilled') {
        setPlatformConfig(configResponse.value.data);
      } else {
        console.error('Error fetching platform config:', configResponse.reason);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Error cargando la información de suscripción' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    try {
      const response = await api.post('/platform/payments/create-subscription');
      
      if (response.data.success && response.data.data.paymentUrl) {
        window.open(response.data.data.paymentUrl, '_blank');
        setMessage({ 
          type: 'info', 
          text: 'Se abrió el link de pago. Complete el pago para activar su suscripción.' 
        });
        
        // Refresh data after a delay to check for payment updates
        setTimeout(() => {
          fetchData();
        }, 5000);
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.message || 'Error creando el pago' 
        });
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al crear el pago de suscripción' 
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    setMessage({ type: 'success', text: 'Datos actualizados' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED':
      case 'CANCELLED':
      case 'EXPIRED': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Aprobado';
      case 'PENDING': return 'Pendiente';
      case 'REJECTED': return 'Rechazado';
      case 'CANCELLED': return 'Cancelado';
      case 'EXPIRED': return 'Expirado';
      default: return status;
    }
  };

  const getSubscriptionStatusAlert = () => {
    if (!currentSubscription) {
      return {
        severity: 'warning' as const,
        title: 'Sin Suscripción Activa',
        message: 'No tienes una suscripción activa. Crea un pago para continuar usando la plataforma.',
        action: 'Pagar Suscripción'
      };
    }

    if (currentSubscription.status === 'PENDING') {
      return {
        severity: 'warning' as const,
        title: 'Pago Pendiente',
        message: 'Tu pago está siendo procesado. La suscripción se activará una vez confirmado el pago.',
        action: null
      };
    }

    if (currentSubscription.status === 'APPROVED') {
      if (daysUntilExpiry !== null) {
        if (daysUntilExpiry <= 0) {
          return {
            severity: 'error' as const,
            title: 'Suscripción Vencida',
            message: 'Tu suscripción ha vencido. Renueva tu pago para continuar usando la plataforma.',
            action: 'Renovar Suscripción'
          };
        } else if (daysUntilExpiry <= 7) {
          return {
            severity: 'warning' as const,
            title: 'Suscripción Por Vencer',
            message: `Tu suscripción vence en ${daysUntilExpiry} día${daysUntilExpiry === 1 ? '' : 's'}. Renueva tu pago pronto.`,
            action: 'Renovar Suscripción'
          };
        } else {
          return {
            severity: 'success' as const,
            title: 'Suscripción Activa',
            message: `Tu suscripción está activa hasta el ${new Date(currentSubscription.periodEnd).toLocaleDateString('es-ES')}.`,
            action: null
          };
        }
      }
    }

    return {
      severity: 'error' as const,
      title: 'Problema con la Suscripción',
      message: 'Hay un problema con tu suscripción. Contacta soporte o crea un nuevo pago.',
      action: 'Crear Nuevo Pago'
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const statusAlert = getSubscriptionStatusAlert();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <AccountBalance sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Mi Suscripción a la Plataforma
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </Box>

        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
            sx={{ mb: 3 }}
          >
            {message.text}
          </Alert>
        )}

        {/* Subscription Status Alert */}
        <Alert 
          severity={statusAlert.severity} 
          sx={{ mb: 3 }}
          action={
            statusAlert.action && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleCreatePayment}
                startIcon={<CreditCard />}
              >
                {statusAlert.action}
              </Button>
            )
          }
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {statusAlert.title}
          </Typography>
          <Typography variant="body2">
            {statusAlert.message}
          </Typography>
        </Alert>

        {/* Current Subscription Details */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estado Actual de la Suscripción
                </Typography>
                
                {currentSubscription ? (
                  <>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Estado
                          </Typography>
                          <Chip
                            label={getStatusText(currentSubscription.status)}
                            color={getStatusColor(currentSubscription.status) as any}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Monto
                          </Typography>
                          <Typography variant="h6" sx={{ mt: 1 }}>
                            ${currentSubscription.amount.toLocaleString()} {currentSubscription.currency}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Período
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {new Date(currentSubscription.periodStart).toLocaleDateString('es-ES')} - {' '}
                            {new Date(currentSubscription.periodEnd).toLocaleDateString('es-ES')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Días Restantes
                          </Typography>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              mt: 1,
                              color: daysUntilExpiry !== null && daysUntilExpiry <= 7 
                                ? 'error.main' 
                                : daysUntilExpiry !== null && daysUntilExpiry <= 14 
                                ? 'warning.main' 
                                : 'success.main'
                            }}
                          >
                            {daysUntilExpiry !== null ? `${Math.max(0, daysUntilExpiry)} días` : 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Progreso del Período
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.max(0, Math.min(100, (30 - daysUntilExpiry) / 30 * 100))}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}

                    {currentSubscription.lastPaymentError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Error en el último pago:</strong> {currentSubscription.lastPaymentError}
                        </Typography>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No hay suscripción activa
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Para continuar usando la plataforma, necesitas activar una suscripción
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PaymentIcon />}
                      onClick={handleCreatePayment}
                      size="large"
                    >
                      Activar Suscripción
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información de Precios
                </Typography>
                
                {platformConfig ? (
                  <>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="primary">
                        ${platformConfig.monthlyPrice.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {platformConfig.currency} / mes
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" paragraph>
                      <strong>Incluye:</strong>
                    </Typography>
                    <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
                      <li>Acceso completo a la plataforma</li>
                      <li>Gestión de usuarios finales</li>
                      <li>Integración con MercadoPago</li>
                      <li>Emails automatizados</li>
                      <li>Soporte técnico</li>
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Información de precios no disponible
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Payment History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Historial de Pagos
            </Typography>
            
            {paymentHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay pagos registrados
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Período</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Referencia</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(payment.periodStart).toLocaleDateString('es-ES')} - {' '}
                            {new Date(payment.periodEnd).toLocaleDateString('es-ES')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          ${payment.amount.toLocaleString()} {payment.currency}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(payment.status)}
                            color={getStatusColor(payment.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {payment.externalReference}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Information */}
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            Información Importante
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Facturación:</strong> Los pagos se procesan mensualmente y son requeridos para mantener
            tu cuenta activa en la plataforma.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Renovación:</strong> Debes renovar manualmente tu suscripción antes del vencimiento.
            Recibirás notificaciones cuando esté próximo a vencer.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Pagos:</strong> Todos los pagos se procesan de forma segura a través de MercadoPago.
          </Typography>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default PlatformSubscriptionStatus;