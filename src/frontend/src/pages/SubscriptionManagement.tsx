import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  CreditCard,
  Cancel,
  History,
  Receipt,
  CheckCircle,
  Warning,
  Info,
  Close,
  QrCode2,
  Download,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface SubscriptionData {
  id: string;
  planType: string;
  planName: string;
  status: string;
  monthlyAmount: number;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  daysRemaining: number;
  createdAt: string;
  mercadoPagoPreapprovalId?: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  status: string;
  description: string;
}

const SubscriptionManagement: React.FC = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [statusResponse, historyResponse] = await Promise.all([
        api.get('/subscription/status'),
        api.get('/subscription/payment-history').catch(() => ({ data: [] })),
      ]);

      setSubscription(statusResponse.data);
      setPaymentHistory(historyResponse.data);

      // Check for pending QR payment
      if (statusResponse.data.qrCodeData && !statusResponse.data.isActive) {
        setQrCode(statusResponse.data.qrCodeData);
        setShowQrModal(true);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      await api.post('/subscription/cancel');
      setShowCancelDialog(false);
      fetchSubscriptionData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      const response = await api.post('/subscription/subscribe', {
        planCode: subscription?.planType,
      });

      if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
        setShowQrModal(true);
      } else if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    }
  };

  const handleChangePlan = () => {
    navigate('/subscription/plans');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'basic':
        return '#757575';
      case 'pro':
        return '#1976d2';
      case 'enterprise':
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

  if (!subscription) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          No tienes una suscripción activa.{' '}
          <Button onClick={() => navigate('/subscription/plans')}>
            Ver Planes
          </Button>
        </Alert>
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
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Gestión de Suscripción
        </Typography>

        {/* Current Plan Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {subscription.planName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={subscription.status === 'active' ? 'ACTIVO' : (subscription.status || 'pending').toUpperCase()}
                    color={getStatusColor(subscription.status || 'pending') as any}
                    size="small"
                  />
                  {subscription.isTrialPeriod && (
                    <Chip
                      label={`PRUEBA - ${subscription.daysRemaining} días restantes`}
                      color="info"
                      size="small"
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" sx={{ color: getPlanColor(subscription.planType) }}>
                  ${subscription.monthlyAmount.toLocaleString('es-AR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  por mes
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Miembro desde
                    </Typography>
                    <Typography variant="body1">
                      {subscription.createdAt 
                        ? new Date(subscription.createdAt).toLocaleDateString('es-AR')
                        : 'No disponible'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {subscription.nextPaymentDate && (
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCard color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Próximo pago
                      </Typography>
                      <Typography variant="body1">
                        {new Date(subscription.nextPaymentDate).toLocaleDateString('es-AR')}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}

              {subscription.lastPaymentDate && (
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Último pago
                      </Typography>
                      <Typography variant="body1">
                        {new Date(subscription.lastPaymentDate).toLocaleDateString('es-AR')}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleChangePlan}
                sx={{ backgroundColor: getPlanColor(subscription.planType) }}
              >
                Cambiar Plan
              </Button>
              
              {subscription.status === 'active' && !subscription.isTrialPeriod && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setShowCancelDialog(true)}
                  startIcon={<Cancel />}
                >
                  Cancelar Suscripción
                </Button>
              )}

              {subscription.status === 'cancelled' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleReactivate}
                  startIcon={<CheckCircle />}
                >
                  Reactivar Suscripción
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History />
              Historial de Pagos
            </Typography>

            {paymentHistory.length > 0 ? (
              <List>
                {paymentHistory.map((payment) => (
                  <ListItem key={payment.id} divider>
                    <ListItemIcon>
                      {payment.status === 'completed' ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Warning color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={payment.description}
                      secondary={new Date(payment.date).toLocaleDateString('es-AR')}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      ${payment.amount.toLocaleString('es-AR')}
                    </Typography>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <Download />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                No hay pagos registrados aún.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Cancel Subscription Dialog */}
        <Dialog
          open={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Cancelar Suscripción</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              ¿Estás seguro de que deseas cancelar tu suscripción?
            </Alert>
            <Typography variant="body2">
              • Tu suscripción permanecerá activa hasta el final del período de facturación actual.
            </Typography>
            <Typography variant="body2">
              • Podrás reactivarla en cualquier momento.
            </Typography>
            <Typography variant="body2">
              • No se realizarán más cobros después de la cancelación.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCancelDialog(false)}>
              Mantener Suscripción
            </Button>
            <Button
              onClick={handleCancelSubscription}
              color="error"
              variant="contained"
              disabled={cancelling}
            >
              {cancelling ? <CircularProgress size={24} /> : 'Cancelar Suscripción'}
            </Button>
          </DialogActions>
        </Dialog>

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

export default SubscriptionManagement;