import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CreditCard,
  CheckCircle,
  Cancel,
  Pause,
  PlayArrow,
  Warning,
  History,
  Payment,
  CalendarMonth,
  ExpandMore,
  OpenInNew,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../services/api';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
}

interface PreapprovalStatus {
  hasActivePreapproval: boolean;
  preapprovalId?: string;
  mercadoPagoId?: string;
  status?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  payerEmail?: string;
  authorizedAt?: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  totalPayments?: number;
  totalPaid?: number;
  message?: string;
}

interface PreapprovalHistory {
  id: string;
  mercadoPagoId: string;
  status: string;
  planName?: string;
  amount: number;
  currency: string;
  createdAt: string;
  authorizedAt?: string;
  cancelledAt?: string;
  totalPayments: number;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    paymentDate?: string;
  }>;
}

const RecurringSubscription: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<PreapprovalStatus | null>(null);
  const [history, setHistory] = useState<PreapprovalHistory[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [initPoint, setInitPoint] = useState<string | null>(null);

  // Confirm dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, statusRes, historyRes] = await Promise.allSettled([
        api.get('/subscription-plans'),
        api.get('/preapproval/status'),
        api.get('/preapproval/history'),
      ]);

      if (plansRes.status === 'fulfilled') {
        const activePlans = (plansRes.value.data || []).filter((p: SubscriptionPlan) => p.price > 0);
        setPlans(activePlans);
      }

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data?.data) {
        setHistory(historyRes.value.data.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Error cargando datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreapproval = async () => {
    if (!selectedPlanId) {
      setMessage({ type: 'warning', text: 'Selecciona un plan' });
      return;
    }

    try {
      setCreating(true);
      const response = await api.post('/preapproval/create', {
        subscriptionPlanId: selectedPlanId,
        payerEmail: payerEmail || undefined,
      });

      if (response.data.success && response.data.initPoint) {
        setInitPoint(response.data.initPoint);
        setMessage({
          type: 'success',
          text: 'Suscripci\u00f3n creada. Haz clic en el bot\u00f3n para autorizar en MercadoPago.'
        });
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Error creando suscripci\u00f3n' });
      }
    } catch (error: any) {
      console.error('Error creating preapproval:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error creando suscripci\u00f3n'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancelPreapproval = async () => {
    try {
      setCancelling(true);
      const response = await api.post('/preapproval/cancel');

      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        setCancelDialogOpen(false);
        await loadData();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Error cancelando' });
      }
    } catch (error: any) {
      console.error('Error cancelling:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Error cancelando' });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusChip = (statusStr: string) => {
    switch (statusStr?.toLowerCase()) {
      case 'authorized':
        return <Chip icon={<CheckCircle />} label="Activa" color="success" />;
      case 'pending':
        return <Chip icon={<Warning />} label="Pendiente" color="warning" />;
      case 'paused':
        return <Chip icon={<Pause />} label="Pausada" color="default" />;
      case 'cancelled':
        return <Chip icon={<Cancel />} label="Cancelada" color="error" />;
      default:
        return <Chip label={statusStr} color="default" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (amount === undefined) return '-';
    return `$${amount.toLocaleString()} ${currency || 'ARS'}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
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
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard /> Suscripci\u00f3n Recurrente
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configura el d\u00e9bito autom\u00e1tico mensual con MercadoPago
          </Typography>
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

        <Grid container spacing={3}>
          {/* Estado actual */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estado de Suscripci\u00f3n
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {status?.hasActivePreapproval ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      {getStatusChip(status.status || '')}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {status.planName}
                      </Typography>
                    </Box>

                    <List dense>
                      <ListItem>
                        <ListItemIcon><Payment /></ListItemIcon>
                        <ListItemText
                          primary="Monto mensual"
                          secondary={formatCurrency(status.amount, status.currency)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CalendarMonth /></ListItemIcon>
                        <ListItemText
                          primary="Pr\u00f3ximo cobro"
                          secondary={formatDate(status.nextPaymentDate)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><History /></ListItemIcon>
                        <ListItemText
                          primary="\u00daltimo pago"
                          secondary={formatDate(status.lastPaymentDate)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle /></ListItemIcon>
                        <ListItemText
                          primary="Total pagos procesados"
                          secondary={`${status.totalPayments || 0} pagos - ${formatCurrency(status.totalPaid, status.currency)}`}
                        />
                      </ListItem>
                    </List>

                    {status.status === 'authorized' && (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          Cancelar Suscripci\u00f3n
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No tienes una suscripci\u00f3n recurrente activa
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Activar D\u00e9bito Autom\u00e1tico
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Planes disponibles */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Planes Disponibles
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {plans.length === 0 ? (
                  <Typography color="text.secondary">
                    No hay planes disponibles
                  </Typography>
                ) : (
                  <List>
                    {plans.map((plan) => (
                      <ListItem
                        key={plan.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography fontWeight="bold">{plan.name}</Typography>
                              <Typography color="primary" fontWeight="bold">
                                {formatCurrency(plan.price, plan.currency)}/mes
                              </Typography>
                            </Box>
                          }
                          secondary={plan.description}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Historial */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Historial de Suscripciones
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {history.length === 0 ? (
                  <Typography color="text.secondary">
                    No hay historial de suscripciones
                  </Typography>
                ) : (
                  history.map((item) => (
                    <Accordion key={item.id}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          {getStatusChip(item.status)}
                          <Typography sx={{ flexGrow: 1 }}>
                            {item.planName || 'Plan'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(item.createdAt)}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Monto</Typography>
                            <Typography>{formatCurrency(item.amount, item.currency)}</Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Autorizado</Typography>
                            <Typography>{formatDate(item.authorizedAt)}</Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Cancelado</Typography>
                            <Typography>{formatDate(item.cancelledAt)}</Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Total pagos</Typography>
                            <Typography>{item.totalPayments}</Typography>
                          </Grid>
                        </Grid>

                        {item.payments.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Pagos procesados:
                            </Typography>
                            <List dense>
                              {item.payments.slice(0, 5).map((payment) => (
                                <ListItem key={payment.id}>
                                  <ListItemText
                                    primary={formatCurrency(payment.amount, item.currency)}
                                    secondary={`${payment.status} - ${formatDate(payment.paymentDate)}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Dialog para crear preapproval */}
        <Dialog
          open={createDialogOpen}
          onClose={() => { setCreateDialogOpen(false); setInitPoint(null); }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Activar Suscripci\u00f3n Recurrente</DialogTitle>
          <DialogContent>
            {!initPoint ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selecciona un plan y configura el d\u00e9bito autom\u00e1tico mensual con MercadoPago.
                </Typography>

                <TextField
                  select
                  fullWidth
                  label="Plan de suscripci\u00f3n"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  sx={{ mt: 2 }}
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price, plan.currency)}/mes
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  label="Email para notificaciones (opcional)"
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  sx={{ mt: 2 }}
                  helperText="Se usar\u00e1 el email de tu cuenta si no especificas otro"
                />
              </Box>
            ) : (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Suscripci\u00f3n creada exitosamente
                </Alert>

                <Typography variant="body1" gutterBottom>
                  Haz clic en el bot\u00f3n para autorizar el d\u00e9bito autom\u00e1tico en MercadoPago:
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  href={initPoint}
                  target="_blank"
                  startIcon={<OpenInNew />}
                  sx={{ mt: 2 }}
                >
                  Autorizar en MercadoPago
                </Button>

                <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
                  Una vez autorizado, cerr\u00e1 esta ventana y recarg\u00e1 la p\u00e1gina para ver el estado actualizado.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCreateDialogOpen(false); setInitPoint(null); }}>
              {initPoint ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!initPoint && (
              <Button
                variant="contained"
                onClick={handleCreatePreapproval}
                disabled={creating || !selectedPlanId}
              >
                {creating ? <CircularProgress size={24} /> : 'Crear Suscripci\u00f3n'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Dialog para confirmar cancelaci\u00f3n */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>Cancelar Suscripci\u00f3n</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Al cancelar, tu acceso continuar\u00e1 hasta el final del per\u00edodo actual pagado.
              No se realizar\u00e1n m\u00e1s cobros autom\u00e1ticos.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>
              Mantener Suscripci\u00f3n
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCancelPreapproval}
              disabled={cancelling}
            >
              {cancelling ? <CircularProgress size={24} /> : 'Confirmar Cancelaci\u00f3n'}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default RecurringSubscription;
