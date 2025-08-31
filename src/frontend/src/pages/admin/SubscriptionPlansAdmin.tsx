import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Star,
  WhatsApp,
  AttachMoney,
  Check,
  Close,
} from '@mui/icons-material';
import api from '../../services/api';

interface SubscriptionPlan {
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
  allowWhatsApp: boolean;
  whatsAppMonthlyLimit: number;
  whatsAppExtraMessageCost: number;
  isPopular: boolean;
  isActive: boolean;
  trialDays: number;
  displayOrder: number;
}

const SubscriptionPlansAdmin: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    code: '',
    name: '',
    description: '',
    price: 0,
    currency: 'ARS',
    maxBookingsPerMonth: -1,
    maxServices: -1,
    maxStaff: -1,
    maxCustomers: -1,
    allowOnlinePayments: true,
    allowCustomBranding: true,
    allowSmsNotifications: true,
    allowEmailMarketing: true,
    allowReports: true,
    allowMultiLocation: true,
    allowWhatsApp: false,
    whatsAppMonthlyLimit: 0,
    whatsAppExtraMessageCost: 0,
    isPopular: false,
    isActive: true,
    trialDays: 0,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscription-plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Error al cargar los planes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        price: 0,
        currency: 'ARS',
        maxBookingsPerMonth: -1,
        maxServices: -1,
        maxStaff: -1,
        maxCustomers: -1,
        allowOnlinePayments: true,
        allowCustomBranding: true,
        allowSmsNotifications: true,
        allowEmailMarketing: true,
        allowReports: true,
        allowMultiLocation: true,
        allowWhatsApp: false,
        whatsAppMonthlyLimit: 0,
        whatsAppExtraMessageCost: 0,
        isPopular: false,
        isActive: true,
        trialDays: 0,
        displayOrder: plans.length + 1,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlan(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingPlan) {
        await api.put(`/subscription-plans/${editingPlan.code}`, formData);
        setSuccess('Plan actualizado exitosamente');
      } else {
        await api.post('/subscription-plans', formData);
        setSuccess('Plan creado exitosamente');
      }
      handleCloseDialog();
      fetchPlans();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al guardar el plan');
    }
  };

  const handleDelete = async (code: string) => {
    if (window.confirm('¿Estás seguro de eliminar este plan?')) {
      try {
        await api.delete(`/subscription-plans/${code}`);
        setSuccess('Plan eliminado exitosamente');
        fetchPlans();
      } catch (error: any) {
        setError(error.response?.data?.error || 'Error al eliminar el plan');
      }
    }
  };

  const handleSeedPlans = async () => {
    if (window.confirm('¿Crear planes por defecto? Esto solo funciona si no hay planes existentes.')) {
      try {
        await api.post('/subscription-plans/seed');
        setSuccess('Planes por defecto creados exitosamente');
        fetchPlans();
      } catch (error: any) {
        setError(error.response?.data?.error || 'Error al crear planes por defecto');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Planes de Suscripción
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Plan
          </Button>
          
          {plans.length === 0 && (
            <Button
              variant="outlined"
              onClick={handleSeedPlans}
            >
              Crear Planes por Defecto
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>WhatsApp</TableCell>
              <TableCell align="center">Popular</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="center">Orden</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.code}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {plan.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {plan.name}
                  </Typography>
                  {plan.description && (
                    <Typography variant="caption" color="textSecondary">
                      {plan.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(plan.price)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {plan.allowWhatsApp ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WhatsApp sx={{ fontSize: 18, color: 'success.main' }} />
                      <Typography variant="caption">
                        {plan.whatsAppMonthlyLimit} msgs/mes
                        <br />
                        +${plan.whatsAppExtraMessageCost}/msg
                      </Typography>
                    </Box>
                  ) : (
                    <Chip label="No incluido" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="center">
                  {plan.isPopular && <Star sx={{ color: 'warning.main' }} />}
                </TableCell>
                <TableCell align="center">
                  {plan.isActive ? (
                    <Check sx={{ color: 'success.main' }} />
                  ) : (
                    <Close sx={{ color: 'error.main' }} />
                  )}
                </TableCell>
                <TableCell align="center">{plan.displayOrder}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(plan)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(plan.code)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingPlan}
                helperText="Identificador único (ej: basic, premium)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Precio"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Días de prueba"
                type="number"
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Orden de visualización"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
              />
            </Grid>

            {/* WhatsApp Configuration */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Configuración de WhatsApp
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowWhatsApp}
                    onChange={(e) => setFormData({ ...formData, allowWhatsApp: e.target.checked })}
                  />
                }
                label="Incluir WhatsApp"
              />
            </Grid>
            {formData.allowWhatsApp && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Mensajes mensuales incluidos"
                    type="number"
                    value={formData.whatsAppMonthlyLimit}
                    onChange={(e) => setFormData({ ...formData, whatsAppMonthlyLimit: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Costo por mensaje adicional"
                    type="number"
                    value={formData.whatsAppExtraMessageCost}
                    onChange={(e) => setFormData({ ...formData, whatsAppExtraMessageCost: Number(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Features */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Características del Plan
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowOnlinePayments}
                    onChange={(e) => setFormData({ ...formData, allowOnlinePayments: e.target.checked })}
                  />
                }
                label="Pagos Online"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowCustomBranding}
                    onChange={(e) => setFormData({ ...formData, allowCustomBranding: e.target.checked })}
                  />
                }
                label="Branding Personalizado"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowSmsNotifications}
                    onChange={(e) => setFormData({ ...formData, allowSmsNotifications: e.target.checked })}
                  />
                }
                label="Notificaciones SMS"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowEmailMarketing}
                    onChange={(e) => setFormData({ ...formData, allowEmailMarketing: e.target.checked })}
                  />
                }
                label="Email Marketing"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowReports}
                    onChange={(e) => setFormData({ ...formData, allowReports: e.target.checked })}
                  />
                }
                label="Reportes Avanzados"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowMultiLocation}
                    onChange={(e) => setFormData({ ...formData, allowMultiLocation: e.target.checked })}
                  />
                }
                label="Multi-ubicación"
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Estado
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  />
                }
                label="Marcar como Popular"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Plan Activo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPlan ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionPlansAdmin;