import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  Refresh,
  Star,
  Check,
  Close,
  WhatsApp,
  AttachMoney,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
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
  mercadoPagoPreapprovalPlanId: string | null;
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  activeSubscriptions: number;
}

interface PlanFormData {
  code: string;
  name: string;
  description: string;
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
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
}

const initialFormData: PlanFormData = {
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
  trialDays: 14,
  isActive: true,
  isPopular: false,
  displayOrder: 0,
};

interface SuperAdminPlansProps {
  embedded?: boolean;
}

const SuperAdminPlans: React.FC<SuperAdminPlansProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      navigate('/super-admin/login');
      return;
    }
    loadPlans();
  }, [navigate]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('superAdminToken');
      const response = await api.get('/subscription-plans/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      setError(err.response?.data?.error || 'Error al cargar los planes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData(initialFormData);
    setOpenDialog(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      maxBookingsPerMonth: plan.maxBookingsPerMonth,
      maxServices: plan.maxServices,
      maxStaff: plan.maxStaff,
      maxCustomers: plan.maxCustomers,
      allowOnlinePayments: plan.allowOnlinePayments,
      allowCustomBranding: plan.allowCustomBranding,
      allowSmsNotifications: plan.allowSmsNotifications,
      allowEmailMarketing: plan.allowEmailMarketing,
      allowReports: plan.allowReports,
      allowMultiLocation: plan.allowMultiLocation,
      allowWhatsApp: plan.allowWhatsApp,
      whatsAppMonthlyLimit: plan.whatsAppMonthlyLimit,
      whatsAppExtraMessageCost: plan.whatsAppExtraMessageCost,
      trialDays: plan.trialDays,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      displayOrder: plan.displayOrder,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPlan(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('superAdminToken');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingPlan) {
        await api.put(`/subscription-plans/${editingPlan.code}`, formData, { headers });
        setSuccess('Plan actualizado exitosamente');
      } else {
        await api.post('/subscription-plans', formData, { headers });
        setSuccess('Plan creado exitosamente');
      }

      handleCloseDialog();
      loadPlans();
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setError(err.response?.data?.error || 'Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      const token = localStorage.getItem('superAdminToken');
      await api.delete(`/subscription-plans/${planToDelete.code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Plan eliminado exitosamente');
      setDeleteConfirmOpen(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      setError(err.response?.data?.error || 'Error al eliminar el plan');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Ilimitado' : value.toString();
  };

  return (
    <Box sx={{ backgroundColor: embedded ? 'transparent' : 'background.default', minHeight: embedded ? 'auto' : '100vh' }}>
      {!embedded && (
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate('/super-admin')}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Gestión de Planes de Membresía
            </Typography>
            <IconButton color="inherit" onClick={loadPlans}>
              <Refresh />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="xl" sx={{ py: embedded ? 2 : 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total de Planes
                </Typography>
                <Typography variant="h4">{plans.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Planes Activos
                </Typography>
                <Typography variant="h4" color="success.main">
                  {plans.filter(p => p.isActive).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Suscripciones Activas
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {plans.reduce((acc, p) => acc + p.activeSubscriptions, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Plans Table */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Planes de Membresía</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={loadPlans} color="primary">
                <Refresh />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenCreate}
              >
                Nuevo Plan
              </Button>
            </Box>
          </Box>
          <Divider />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Orden</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="center">Límites</TableCell>
                    <TableCell align="center">WhatsApp</TableCell>
                    <TableCell align="center">Trial</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="center">Suscripciones</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
                        No hay planes configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id} hover>
                        <TableCell>{plan.displayOrder}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="medium">{plan.name}</Typography>
                            {plan.isPopular && (
                              <Chip
                                icon={<Star sx={{ fontSize: 16 }} />}
                                label="Popular"
                                size="small"
                                color="warning"
                              />
                            )}
                          </Box>
                          {plan.description && (
                            <Typography variant="caption" color="text.secondary">
                              {plan.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={plan.code} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold" color="primary.main">
                            {formatPrice(plan.price, plan.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /mes
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={`Reservas: ${formatLimit(plan.maxBookingsPerMonth)}, Servicios: ${formatLimit(plan.maxServices)}, Staff: ${formatLimit(plan.maxStaff)}`}>
                            <Typography variant="body2">
                              {plan.maxBookingsPerMonth === -1 ? 'Sin límites' : 'Con límites'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          {plan.allowWhatsApp ? (
                            <Tooltip title={`${plan.whatsAppMonthlyLimit === -1 ? 'Ilimitado' : plan.whatsAppMonthlyLimit + ' mensajes/mes'}`}>
                              <Chip
                                icon={<WhatsApp sx={{ fontSize: 16 }} />}
                                label={plan.whatsAppMonthlyLimit === -1 ? 'Ilim.' : plan.whatsAppMonthlyLimit}
                                size="small"
                                color="success"
                              />
                            </Tooltip>
                          ) : (
                            <Chip label="No" size="small" color="default" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {plan.trialDays > 0 ? (
                            <Chip label={`${plan.trialDays} días`} size="small" color="info" />
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={plan.isActive ? 'Activo' : 'Inactivo'}
                            size="small"
                            color={plan.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="medium">
                            {plan.activeSubscriptions}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenEdit(plan)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(plan)}
                                disabled={plan.activeSubscriptions > 0}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlan ? `Editar Plan: ${editingPlan.name}` : 'Crear Nuevo Plan'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Información Básica */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Información Básica
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                disabled={!!editingPlan}
                required
                helperText="Identificador único (ej: basic, premium)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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

            {/* Precio */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Precio
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio Mensual"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><AttachMoney /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Moneda"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
            </Grid>

            {/* Límites */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Límites (-1 = ilimitado)
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Reservas/Mes"
                type="number"
                value={formData.maxBookingsPerMonth}
                onChange={(e) => setFormData({ ...formData, maxBookingsPerMonth: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Servicios"
                type="number"
                value={formData.maxServices}
                onChange={(e) => setFormData({ ...formData, maxServices: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Staff"
                type="number"
                value={formData.maxStaff}
                onChange={(e) => setFormData({ ...formData, maxStaff: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Clientes"
                type="number"
                value={formData.maxCustomers}
                onChange={(e) => setFormData({ ...formData, maxCustomers: parseInt(e.target.value) })}
              />
            </Grid>

            {/* Funcionalidades */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Funcionalidades
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4}>
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
            <Grid item xs={6} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowCustomBranding}
                    onChange={(e) => setFormData({ ...formData, allowCustomBranding: e.target.checked })}
                  />
                }
                label="Branding"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowSmsNotifications}
                    onChange={(e) => setFormData({ ...formData, allowSmsNotifications: e.target.checked })}
                  />
                }
                label="SMS"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
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
            <Grid item xs={6} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowReports}
                    onChange={(e) => setFormData({ ...formData, allowReports: e.target.checked })}
                  />
                }
                label="Reportes"
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowMultiLocation}
                    onChange={(e) => setFormData({ ...formData, allowMultiLocation: e.target.checked })}
                  />
                }
                label="Multi-Sucursal"
              />
            </Grid>

            {/* WhatsApp */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                WhatsApp
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowWhatsApp}
                    onChange={(e) => setFormData({ ...formData, allowWhatsApp: e.target.checked })}
                  />
                }
                label="Habilitar WhatsApp"
              />
            </Grid>
            {formData.allowWhatsApp && (
              <>
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    label="Mensajes/Mes"
                    type="number"
                    value={formData.whatsAppMonthlyLimit}
                    onChange={(e) => setFormData({ ...formData, whatsAppMonthlyLimit: parseInt(e.target.value) })}
                    helperText="-1 = ilimitado"
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    label="Costo Extra/Mensaje"
                    type="number"
                    value={formData.whatsAppExtraMessageCost}
                    onChange={(e) => setFormData({ ...formData, whatsAppExtraMessageCost: parseFloat(e.target.value) || 0 })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Configuración */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Configuración
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Días de Trial"
                type="number"
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Orden"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Activo"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  />
                }
                label="Destacado"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.code || !formData.name}
          >
            {saving ? 'Guardando...' : editingPlan ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el plan <strong>{planToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminPlans;
