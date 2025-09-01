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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  InputAdornment,
  Tab,
  Tabs,
  Badge,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Payment as PaymentIcon,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  ArrowBack,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  AttachMoney,
  Group,
  Search as SearchIcon,
  Send as SendIcon,
  ExpandMore,
  Timeline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

interface Tenant {
  id: string;
  subdomain: string;
  businessName: string;
  verticalId: string;
  vertical: {
    name: string;
    code: string;
  };
  planId?: string;
  plan?: {
    name: string;
    monthlyPrice: number;
  };
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  currentSubscription?: TenantSubscription;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'NEVER_SUBSCRIBED';
  daysUntilExpiry?: number;
}

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
  lastPaymentError?: string;
}

interface TenantStats {
  total: number;
  active: number;
  expired: number;
  pending: number;
  neverSubscribed: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface PlatformConfig {
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
}

const TenantsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<TenantSubscription[]>([]);
  const [stats, setStats] = useState<TenantStats>({
    total: 0,
    active: 0,
    expired: 0,
    pending: 0,
    neverSubscribed: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>({
    monthlyPrice: 0,
    currency: 'ARS',
    isActive: false,
  });
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDetailsOpen, setTenantDetailsOpen] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsResponse, paymentsResponse, configResponse] = await Promise.allSettled([
        api.get('/super-admin/tenants'),
        api.get('/super-admin/tenant-payments'),
        api.get('/super-admin/platform-config'),
      ]);
      
      let allTenants: Tenant[] = [];
      let allPayments: TenantSubscription[] = [];
      
      if (tenantsResponse.status === 'fulfilled') {
        allTenants = tenantsResponse.value.data || [];
        setTenants(allTenants);
      } else {
        console.error('Error fetching tenants:', tenantsResponse.reason);
        setMessage({ type: 'error', text: 'Error cargando tenants' });
      }
      
      if (paymentsResponse.status === 'fulfilled') {
        allPayments = paymentsResponse.value.data || [];
        setPayments(allPayments);
      } else {
        console.error('Error fetching payments:', paymentsResponse.reason);
      }
      
      if (configResponse.status === 'fulfilled') {
        setPlatformConfig(configResponse.value.data);
      }
      
      // Calculate stats
      const newStats: TenantStats = {
        total: allTenants.length,
        active: allTenants.filter(t => t.subscriptionStatus === 'ACTIVE').length,
        expired: allTenants.filter(t => t.subscriptionStatus === 'EXPIRED').length,
        pending: allTenants.filter(t => t.subscriptionStatus === 'PENDING').length,
        neverSubscribed: allTenants.filter(t => t.subscriptionStatus === 'NEVER_SUBSCRIBED').length,
        totalRevenue: allPayments.filter(p => p.status === 'APPROVED').reduce((sum, p) => sum + p.amount, 0),
        monthlyRevenue: allPayments.filter(p => 
          p.status === 'APPROVED' && 
          new Date(p.createdAt).getMonth() === new Date().getMonth() &&
          new Date(p.createdAt).getFullYear() === new Date().getFullYear()
        ).reduce((sum, p) => sum + p.amount, 0),
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Error cargando los datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlatformConfig = async () => {
    try {
      const response = await api.put('/super-admin/platform-config', platformConfig);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Configuración de plataforma actualizada' });
        setConfigDialog(false);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Error actualizando configuración' });
      }
    } catch (error: any) {
      console.error('Error updating config:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error actualizando configuración' 
      });
    }
  };

  const handleCreateTenantPayment = async (tenantId: string) => {
    try {
      const response = await api.post(`/super-admin/tenants/${tenantId}/create-payment`);
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Link de pago creado. El tenant recibirá una notificación.' 
        });
        await fetchData();
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Error creando pago' });
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error creando link de pago' 
      });
    }
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'EXPIRED': return 'error';
      case 'NEVER_SUBSCRIBED': return 'default';
      default: return 'default';
    }
  };

  const getSubscriptionStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Activo';
      case 'PENDING': return 'Pendiente';
      case 'EXPIRED': return 'Vencido';
      case 'NEVER_SUBSCRIBED': return 'Sin Suscripción';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED':
      case 'CANCELLED':
      case 'EXPIRED': return 'error';
      default: return 'default';
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || tenant.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTenantPayments = (tenantId: string) => {
    return payments.filter(p => p.tenantId === tenantId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const openTenantDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTenantDetailsOpen(true);
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
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/super-admin/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <BusinessIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Gestión de Tenants (B2B)
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ mr: 2 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={() => setConfigDialog(true)}
          >
            Configuración
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

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2">Total Tenants</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.active}
                </Typography>
                <Typography variant="body2">Activos</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {stats.pending}
                </Typography>
                <Typography variant="body2">Pendientes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {stats.expired}
                </Typography>
                <Typography variant="body2">Vencidos</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  ${stats.monthlyRevenue.toLocaleString()}
                </Typography>
                <Typography variant="body2">Ingresos del Mes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  ${stats.totalRevenue.toLocaleString()}
                </Typography>
                <Typography variant="body2">Ingresos Totales</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Buscar por nombre de negocio o subdominio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Filtrar por Estado de Suscripción"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="ALL">Todos los Estados</MenuItem>
                  <MenuItem value="ACTIVE">Activos</MenuItem>
                  <MenuItem value="PENDING">Pendientes</MenuItem>
                  <MenuItem value="EXPIRED">Vencidos</MenuItem>
                  <MenuItem value="NEVER_SUBSCRIBED">Sin Suscripción</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Lista de Tenants" />
          <Tab label="Historial de Pagos" />
        </Tabs>

        {selectedTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tenants Registrados ({filteredTenants.length})
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Vertical</TableCell>
                      <TableCell>Estado Suscripción</TableCell>
                      <TableCell>Registro</TableCell>
                      <TableCell>Último Acceso</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTenants.map((tenant) => (
                      <TableRow key={tenant.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {tenant.businessName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tenant.subdomain}.turnos.pro
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={tenant.vertical?.name || 'N/A'} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Chip
                              label={getSubscriptionStatusText(tenant.subscriptionStatus)}
                              color={getSubscriptionStatusColor(tenant.subscriptionStatus) as any}
                              size="small"
                            />
                            {tenant.daysUntilExpiry !== undefined && tenant.daysUntilExpiry >= 0 && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Vence en {tenant.daysUntilExpiry} días
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(tenant.createdAt).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell>
                          {tenant.lastLoginAt 
                            ? new Date(tenant.lastLoginAt).toLocaleDateString('es-ES')
                            : 'Nunca'
                          }
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              onClick={() => openTenantDetails(tenant)}
                            >
                              Ver Detalles
                            </Button>
                            {['EXPIRED', 'NEVER_SUBSCRIBED'].includes(tenant.subscriptionStatus) && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PaymentIcon />}
                                onClick={() => handleCreateTenantPayment(tenant.id)}
                              >
                                Crear Pago
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {filteredTenants.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No se encontraron tenants
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm || statusFilter !== 'ALL' 
                      ? 'Prueba ajustando los filtros de búsqueda'
                      : 'Los tenants aparecerán aquí cuando se registren'
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historial de Pagos B2B
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Período</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha de Pago</TableCell>
                      <TableCell>Referencia</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => {
                      const tenant = tenants.find(t => t.id === payment.tenantId);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">
                                {tenant?.businessName || 'Tenant Eliminado'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {tenant?.subdomain}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            ${payment.amount.toLocaleString()} {payment.currency}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(payment.periodStart).toLocaleDateString('es-ES')} - {' '}
                              {new Date(payment.periodEnd).toLocaleDateString('es-ES')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.status}
                              color={getPaymentStatusColor(payment.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {payment.approvedAt 
                              ? new Date(payment.approvedAt).toLocaleDateString('es-ES')
                              : new Date(payment.createdAt).toLocaleDateString('es-ES')
                            }
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {payment.externalReference}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {payments.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No hay pagos registrados
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tenant Details Dialog */}
        <Dialog 
          open={tenantDetailsOpen} 
          onClose={() => setTenantDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Detalles del Tenant: {selectedTenant?.businessName}
          </DialogTitle>
          <DialogContent>
            {selectedTenant && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Subdominio
                    </Typography>
                    <Typography variant="body2">{selectedTenant.subdomain}.turnos.pro</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Vertical
                    </Typography>
                    <Typography variant="body2">{selectedTenant.vertical?.name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Estado de Suscripción
                    </Typography>
                    <Chip
                      label={getSubscriptionStatusText(selectedTenant.subscriptionStatus)}
                      color={getSubscriptionStatusColor(selectedTenant.subscriptionStatus) as any}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Fecha de Registro
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedTenant.createdAt).toLocaleDateString('es-ES')}
                    </Typography>
                  </Grid>
                </Grid>

                {selectedTenant.currentSubscription && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Suscripción Actual
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Período
                        </Typography>
                        <Typography variant="body2">
                          {new Date(selectedTenant.currentSubscription.periodStart).toLocaleDateString('es-ES')} - {' '}
                          {new Date(selectedTenant.currentSubscription.periodEnd).toLocaleDateString('es-ES')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Monto
                        </Typography>
                        <Typography variant="body2">
                          ${selectedTenant.currentSubscription.amount.toLocaleString()} {selectedTenant.currentSubscription.currency}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Historial de Pagos
                  </Typography>
                  {getTenantPayments(selectedTenant.id).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay pagos registrados
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Monto</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell>Fecha</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getTenantPayments(selectedTenant.id).slice(0, 5).map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                ${payment.amount.toLocaleString()} {payment.currency}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={payment.status}
                                  color={getPaymentStatusColor(payment.status) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(payment.createdAt).toLocaleDateString('es-ES')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTenantDetailsOpen(false)}>Cerrar</Button>
            {selectedTenant && ['EXPIRED', 'NEVER_SUBSCRIBED'].includes(selectedTenant.subscriptionStatus) && (
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => {
                  handleCreateTenantPayment(selectedTenant.id);
                  setTenantDetailsOpen(false);
                }}
              >
                Crear Pago
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Platform Configuration Dialog */}
        <Dialog open={configDialog} onClose={() => setConfigDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Configuración de la Plataforma</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Precio Mensual"
                  type="number"
                  value={platformConfig.monthlyPrice}
                  onChange={(e) => setPlatformConfig({
                    ...platformConfig,
                    monthlyPrice: parseFloat(e.target.value) || 0
                  })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Moneda"
                  value={platformConfig.currency}
                  onChange={(e) => setPlatformConfig({
                    ...platformConfig,
                    currency: e.target.value
                  })}
                >
                  <MenuItem value="ARS">ARS (Peso Argentino)</MenuItem>
                  <MenuItem value="USD">USD (Dólar)</MenuItem>
                  <MenuItem value="EUR">EUR (Euro)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfigDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleUpdatePlatformConfig}
              variant="contained"
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default TenantsManagement;