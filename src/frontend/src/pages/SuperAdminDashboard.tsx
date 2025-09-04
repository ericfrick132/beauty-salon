import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
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
  MenuItem,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Logout,
  Dashboard,
  Email,
  People,
  Subscriptions,
  AttachMoney,
  Settings,
  ContentCopy,
  Send,
  Cancel,
  Visibility,
  Add,
  Refresh,
  Palette,
  Save,
  PersonAdd as PersonImpersonateIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../services/api';
import { superAdminService } from '../services/superAdminService';

interface Tenant {
  id: string;
  subdomain: string;
  businessName: string;
  ownerEmail: string;
  vertical: {
    name: string;
    code: string;
  };
  status: string;
  createdAt: string;
}

interface ThemeConfiguration {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  errorColor: string;
  warningColor: string;
  infoColor: string;
  successColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  borderColor: string;
  fontFamily: string;
  borderRadius: number;
  useShadows: boolean;
  autoContrastText: boolean;
}

interface Invitation {
  id: string;
  token: string;
  subdomain: string;
  businessName: string;
  businessAddress?: string;
  adminEmail: string;
  adminPhone?: string;
  timeZone?: string;
  currency?: string;
  language?: string;
  notes?: string;
  isDemo: boolean;
  demoDays: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  verticalName: string;
  planName?: string;
  invitationUrl: string;
}

interface CreateInvitationData {
  verticalCode: string;
  planCode?: string;
  subdomain: string;
  businessName: string;
  businessAddress?: string;
  adminEmail: string;
  adminPhone?: string;
  timeZone: string;
  currency: string;
  language: string;
  notes?: string;
  isDemo: boolean;
  demoDays: number;
  expiresInDays: number;
}

const SuperAdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para crear invitación
  const [openCreateInvitationDialog, setOpenCreateInvitationDialog] = useState(false);
  const [createInvitationData, setCreateInvitationData] = useState<CreateInvitationData>({
    verticalCode: 'barbershop',
    planCode: '',
    subdomain: '',
    businessName: '',
    businessAddress: '',
    adminEmail: '',
    adminPhone: '',
    timeZone: '-3',
    currency: 'ARS',
    language: 'es-AR',
    notes: '',
    isDemo: false,
    demoDays: 7,
    expiresInDays: 30
  });
  const [createLoading, setCreateLoading] = useState(false);
  
  // Estados para mostrar invitación creada
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [openInvitationCreatedDialog, setOpenInvitationCreatedDialog] = useState(false);
  
  // Estados para editar tema de tenant
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [selectedTenantForTheme, setSelectedTenantForTheme] = useState<Tenant | null>(null);
  const [tenantTheme, setTenantTheme] = useState<ThemeConfiguration>({
    primaryColor: '#1976d2',
    secondaryColor: '#ffffff',
    accentColor: '#ffc107',
    backgroundColor: '#ffffff',
    surfaceColor: '#f5f5f5',
    errorColor: '#f44336',
    warningColor: '#ff9800',
    infoColor: '#2196f3',
    successColor: '#4caf50',
    textPrimaryColor: '#000000',
    textSecondaryColor: '#666666',
    borderColor: '#e0e0e0',
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    borderRadius: 8,
    useShadows: true,
    autoContrastText: true,
  });
  const [themeLoading, setThemeLoading] = useState(false);

  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    pendingInvitations: 0,
    monthlyRevenue: 0,
    expiringTrials: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
      navigate('/super-admin/login');
      return;
    }
    
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTenants(),
        loadInvitations()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await superAdminApi.getTenants();
      const tenantsData = response.data || response;
      setTenants(tenantsData);
      
      // Calcular estadísticas
      const totalTenants = tenantsData.length;
      const activeTenants = tenantsData.filter((t: Tenant) => 
        t.status.toLowerCase() === 'active'
      ).length;
      
      setStats(prev => ({ ...prev, totalTenants, activeTenants }));
    } catch (error: any) {
      console.error('Error loading tenants:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await superAdminApi.getInvitations();
      const invitationsData = response.data || response;
      setInvitations(invitationsData);
      
      setStats(prev => ({ 
        ...prev, 
        pendingInvitations: invitationsData.length 
      }));
    } catch (error: any) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleCreateInvitation = async () => {
    try {
      setCreateLoading(true);
      setError('');
      
      const response = await superAdminApi.createInvitation(createInvitationData);
      
      setCreatedInvitation(response.data || response);
      setOpenInvitationCreatedDialog(true);
      setOpenCreateInvitationDialog(false);
      
      // Reset form
      setCreateInvitationData({
        verticalCode: 'barbershop',
        planCode: '',
        subdomain: '',
        businessName: '',
        businessAddress: '',
        adminEmail: '',
        adminPhone: '',
        timeZone: '-3',
        currency: 'ARS',
        language: 'es-AR',
        notes: '',
        isDemo: false,
        demoDays: 7,
        expiresInDays: 30
      });
      
      await loadInvitations(); // Recargar invitaciones
      setSuccess('Invitación creada exitosamente');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error creando invitación');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await superAdminApi.cancelInvitation(invitationId);
      await loadInvitations();
      setSuccess('Invitación cancelada exitosamente');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error cancelando invitación');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await superAdminApi.resendInvitation(invitationId);
      setSuccess('Invitación reenviada exitosamente');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error reenviando invitación');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
    navigate('/super-admin/login');
  };

  const handleOpenThemeDialog = async (tenant: Tenant) => {
    setSelectedTenantForTheme(tenant);
    setThemeLoading(true);
    setOpenThemeDialog(true);
    
    try {
      const response = await superAdminApi.getTenantTheme(tenant.id);
      setTenantTheme(response.data || response);
    } catch (error: any) {
      console.error('Error loading tenant theme:', error);
      setError('Error cargando el tema del negocio');
    } finally {
      setThemeLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedTenantForTheme) return;
    
    try {
      setThemeLoading(true);
      await superAdminApi.saveTenantTheme(selectedTenantForTheme.id, tenantTheme);
      setSuccess('Tema actualizado exitosamente');
      setOpenThemeDialog(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error actualizando el tema');
    } finally {
      setThemeLoading(false);
    }
  };

  const handleResetTheme = async () => {
    if (!selectedTenantForTheme) return;
    
    try {
      setThemeLoading(true);
      const response = await superAdminApi.resetTenantTheme(selectedTenantForTheme.id);
      setTenantTheme(response.data || response);
      setSuccess('Tema restablecido a valores por defecto');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error restableciendo el tema');
    } finally {
      setThemeLoading(false);
    }
  };

  const handleThemeColorChange = (field: keyof ThemeConfiguration, value: string) => {
    setTenantTheme(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'pending': return 'success';
      case 'trial': return 'warning';
      case 'suspended': case 'cancelled': case 'expired': return 'error';
      case 'used': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copiado al portapapeles');
  };

  const handleImpersonateTenant = async (tenantId: string, subdomain: string) => {
    try {
      setSuccess('Iniciando impersonación...');
      await superAdminService.handleImpersonateFlow(tenantId, subdomain);
    } catch (error: any) {
      console.error('Error impersonating tenant:', error);
      setError(error.message || 'Error al impersonar tenant');
    }
  };

  const renderDashboard = () => (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader 
              title="Total de Negocios"
              subheader="Negocios activos en la plataforma"
            />
            <CardContent>
              <Typography variant="h4">{stats.totalTenants}</Typography>
              <Typography variant="body2" color="text.secondary">
                +{stats.totalTenants} este mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader 
              title="Ingresos Mensuales"
              subheader="Total de suscripciones activas"
            />
            <CardContent>
              <Typography variant="h4">US$ {stats.monthlyRevenue.toFixed(2)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Facturación mensual
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader 
              title="Invitaciones Pendientes"
              subheader="Requieren atención"
            />
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {stats.pendingInvitations}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pendientes de aceptar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardHeader 
              title="Negocios Activos"
              subheader="Con suscripción activa"
            />
            <CardContent>
              <Typography variant="h4" color="success.main">
                {stats.activeTenants}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((stats.activeTenants / Math.max(stats.totalTenants, 1)) * 100)}% de retención
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Activity Panel */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Actividad Reciente" />
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Bienvenido al panel de Super Administrador. Desde aquí puedes:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Crear invitaciones para nuevos negocios
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Gestionar invitaciones existentes
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Administrar suscripciones y pagos B2B de tenants
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Monitorear el rendimiento de la plataforma
                  </Typography>
                </li>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Email />}
                  onClick={() => setCurrentTab(1)}
                  size="large"
                >
                  Crear Invitación
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AttachMoney />}
                  onClick={() => navigate('/super-admin/tenants')}
                  size="large"
                >
                  Gestionar Tenants B2B
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  onClick={() => setCurrentTab(2)}
                >
                  Ver Negocios
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderCreateInvitation = () => (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader 
          title="Crear Nueva Invitación" 
          action={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenCreateInvitationDialog(true)}
            >
              Nueva Invitación
            </Button>
          }
        />
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Crea invitaciones para que nuevos negocios se registren en la plataforma.
            Los administradores recibirán un enlace para completar su registro y definir su contraseña.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );

  const renderManageInvitations = () => (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader 
          title="Gestionar Negocios Registrados"
          action={
            <Button
              startIcon={<Refresh />}
              onClick={loadData}
            >
              Actualizar
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Negocio</TableCell>
                  <TableCell>Subdominio</TableCell>
                  <TableCell>Email del Propietario</TableCell>
                  <TableCell>Vertical</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha de Creación</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      No hay negocios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {tenant.businessName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {tenant.subdomain}
                        </Typography>
                      </TableCell>
                      <TableCell>{tenant.ownerEmail}</TableCell>
                      <TableCell>{tenant.vertical?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={tenant.status.toUpperCase()} 
                          color={getStatusColor(tenant.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Impersonar Tenant">
                            <IconButton 
                              size="small"
                              color="secondary"
                              onClick={() => handleImpersonateTenant(tenant.id, tenant.subdomain)}
                            >
                              <PersonImpersonateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver Detalles">
                            <IconButton 
                              size="small"
                              onClick={() => {
                                // TODO: Implementar vista de detalles
                                console.log('Ver detalles de:', tenant.id);
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Personalizar Tema">
                            <IconButton 
                              size="small"
                              color="primary"
                              onClick={() => handleOpenThemeDialog(tenant)}
                            >
                              <Palette fontSize="small" />
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
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Panel de Super Administrador
          </Typography>
          <IconButton color="inherit" onClick={loadData} sx={{ mr: 2 }}>
            <Refresh />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        {/* Error/Success Alerts */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Typography variant="h3" gutterBottom sx={{ mt: 3 }}>
          Panel de Super Administrador
        </Typography>

        {/* Tabs */}
        <Paper>
          <Tabs 
            value={currentTab} 
            onChange={(_, newValue) => setCurrentTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<Dashboard />} label="Dashboard" />
            <Tab icon={<Email />} label="Crear Invitación" />
            <Tab icon={<People />} label="Negocios Registrados" />
            <Tab icon={<Subscriptions />} label="Suscripciones" />
            <Tab icon={<AttachMoney />} label="Facturación" />
            <Tab icon={<Settings />} label="Configuración" />
          </Tabs>

          {/* Tab Panels */}
          <div role="tabpanel" hidden={currentTab !== 0}>
            {currentTab === 0 && renderDashboard()}
          </div>
          
          <div role="tabpanel" hidden={currentTab !== 1}>
            {currentTab === 1 && renderCreateInvitation()}
          </div>
          
          <div role="tabpanel" hidden={currentTab !== 2}>
            {currentTab === 2 && renderManageInvitations()}
          </div>
          
          <div role="tabpanel" hidden={currentTab !== 3}>
            {currentTab === 3 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h5">Suscripciones</Typography>
                <Typography color="text.secondary">Próximamente...</Typography>
              </Box>
            )}
          </div>
          
          <div role="tabpanel" hidden={currentTab !== 4}>
            {currentTab === 4 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h5">Facturación</Typography>
                <Typography color="text.secondary">Próximamente...</Typography>
              </Box>
            )}
          </div>
          
          <div role="tabpanel" hidden={currentTab !== 5}>
            {currentTab === 5 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h5">Configuración</Typography>
                <Typography color="text.secondary">Próximamente...</Typography>
              </Box>
            )}
          </div>
        </Paper>
      </Container>

      {/* Create Invitation Dialog */}
      <Dialog 
        open={openCreateInvitationDialog} 
        onClose={() => setOpenCreateInvitationDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Crear Nueva Invitación</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Información del Negocio */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary">
                Información del Negocio
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Negocio"
                value={createInvitationData.businessName}
                onChange={(e) => setCreateInvitationData({...createInvitationData, businessName: e.target.value})}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subdominio"
                value={createInvitationData.subdomain}
                onChange={(e) => setCreateInvitationData({...createInvitationData, subdomain: e.target.value})}
                required
                helperText="Solo letras minúsculas, números y guiones"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Vertical</InputLabel>
                <Select
                  value={createInvitationData.verticalCode}
                  onChange={(e) => setCreateInvitationData({...createInvitationData, verticalCode: e.target.value})}
                  label="Vertical"
                >
                  <MenuItem value="barbershop">Barbería</MenuItem>
                  <MenuItem value="peluqueria">Peluquería</MenuItem>
                  <MenuItem value="aesthetics">Centro de Estética</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={createInvitationData.businessAddress}
                onChange={(e) => setCreateInvitationData({...createInvitationData, businessAddress: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Zona Horaria</InputLabel>
                <Select
                  value={createInvitationData.timeZone}
                  onChange={(e) => setCreateInvitationData({...createInvitationData, timeZone: e.target.value})}
                  label="Zona Horaria"
                >
                  <MenuItem value="-3">UTC-3 (Argentina)</MenuItem>
                  <MenuItem value="-5">UTC-5 (New York)</MenuItem>
                  <MenuItem value="0">UTC+0 (GMT)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Información del Administrador */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                Información del Administrador
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email del Administrador"
                type="email"
                value={createInvitationData.adminEmail}
                onChange={(e) => setCreateInvitationData({...createInvitationData, adminEmail: e.target.value})}
                required
                helperText="Este será el email de login del administrador"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Teléfono del Administrador"
                value={createInvitationData.adminPhone}
                onChange={(e) => setCreateInvitationData({...createInvitationData, adminPhone: e.target.value})}
              />
            </Grid>

            {/* Plan de Suscripción */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                Plan de Suscripción
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={createInvitationData.isDemo}
                    onChange={(e) => setCreateInvitationData({...createInvitationData, isDemo: e.target.checked})}
                  />
                }
                label={`Invitación Demo (${createInvitationData.demoDays} días gratuitos)`}
              />
              <Typography variant="body2" color="text.secondary">
                Permite al cliente probar el sistema por {createInvitationData.demoDays} días sin costo
              </Typography>
            </Grid>

            {/* Configuración Regional */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                Configuración Regional
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={createInvitationData.currency}
                  onChange={(e) => setCreateInvitationData({...createInvitationData, currency: e.target.value})}
                  label="Moneda"
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Idioma</InputLabel>
                <Select
                  value={createInvitationData.language}
                  onChange={(e) => setCreateInvitationData({...createInvitationData, language: e.target.value})}
                  label="Idioma"
                >
                  <MenuItem value="es-AR">es-AR</MenuItem>
                  <MenuItem value="en-US">en-US</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas Adicionales"
                multiline
                rows={3}
                value={createInvitationData.notes}
                onChange={(e) => setCreateInvitationData({...createInvitationData, notes: e.target.value})}
                placeholder="Información adicional sobre esta invitación..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateInvitationDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateInvitation} 
            variant="contained"
            disabled={createLoading || !createInvitationData.businessName || !createInvitationData.subdomain || !createInvitationData.adminEmail}
          >
            {createLoading ? 'Creando...' : 'Crear Invitación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invitation Created Dialog */}
      <Dialog 
        open={openInvitationCreatedDialog} 
        onClose={() => setOpenInvitationCreatedDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
          Invitación creada exitosamente
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Se ha enviado un email al administrador del negocio.
          </Alert>
          
          <Typography variant="h6" gutterBottom>
            URL de invitación creada:
          </Typography>
          
          <Paper sx={{ p: 2, backgroundColor: 'grey.100', mb: 2 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: 'primary.main'
              }}
            >
              {createdInvitation?.invitationUrl}
            </Typography>
          </Paper>
          
          <Typography variant="body2" color="text.secondary">
            Puedes copiar esta URL y enviarla por otro medio al administrador del negocio.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => createdInvitation && copyToClipboard(createdInvitation.invitationUrl)}
            startIcon={<ContentCopy />}
          >
            Copiar URL
          </Button>
          <Button 
            onClick={() => setOpenInvitationCreatedDialog(false)} 
            variant="contained"
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Theme Configuration Dialog */}
      <Dialog 
        open={openThemeDialog} 
        onClose={() => setOpenThemeDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Palette /> Personalizar Tema - {selectedTenantForTheme?.businessName}
        </DialogTitle>
        <DialogContent>
          {themeLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography>Cargando configuración del tema...</Typography>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Colores Principales */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Colores Principales
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Color Primario</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: tenantTheme.primaryColor,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = tenantTheme.primaryColor;
                        input.onchange = (e) => {
                          handleThemeColorChange('primaryColor', (e.target as HTMLInputElement).value);
                        };
                        input.click();
                      }}
                    />
                    <TextField
                      size="small"
                      value={tenantTheme.primaryColor}
                      onChange={(e) => handleThemeColorChange('primaryColor', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Color Secundario</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: tenantTheme.secondaryColor,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = tenantTheme.secondaryColor;
                        input.onchange = (e) => {
                          handleThemeColorChange('secondaryColor', (e.target as HTMLInputElement).value);
                        };
                        input.click();
                      }}
                    />
                    <TextField
                      size="small"
                      value={tenantTheme.secondaryColor}
                      onChange={(e) => handleThemeColorChange('secondaryColor', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Color de Acento</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: tenantTheme.accentColor,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = tenantTheme.accentColor;
                        input.onchange = (e) => {
                          handleThemeColorChange('accentColor', (e.target as HTMLInputElement).value);
                        };
                        input.click();
                      }}
                    />
                    <TextField
                      size="small"
                      value={tenantTheme.accentColor}
                      onChange={(e) => handleThemeColorChange('accentColor', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Colores de Fondo */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Colores de Fondo
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Fondo Principal</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: tenantTheme.backgroundColor,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = tenantTheme.backgroundColor;
                        input.onchange = (e) => {
                          handleThemeColorChange('backgroundColor', (e.target as HTMLInputElement).value);
                        };
                        input.click();
                      }}
                    />
                    <TextField
                      size="small"
                      value={tenantTheme.backgroundColor}
                      onChange={(e) => handleThemeColorChange('backgroundColor', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Superficie</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: tenantTheme.surfaceColor,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = tenantTheme.surfaceColor;
                        input.onchange = (e) => {
                          handleThemeColorChange('surfaceColor', (e.target as HTMLInputElement).value);
                        };
                        input.click();
                      }}
                    />
                    <TextField
                      size="small"
                      value={tenantTheme.surfaceColor}
                      onChange={(e) => handleThemeColorChange('surfaceColor', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* Colores de Estado */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Colores de Estado
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>Error</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          backgroundColor: tenantTheme.errorColor,
                          border: '1px solid #ccc',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'color';
                          input.value = tenantTheme.errorColor;
                          input.onchange = (e) => {
                            handleThemeColorChange('errorColor', (e.target as HTMLInputElement).value);
                          };
                          input.click();
                        }}
                      />
                      <TextField
                        size="small"
                        value={tenantTheme.errorColor}
                        onChange={(e) => handleThemeColorChange('errorColor', e.target.value)}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>Advertencia</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          backgroundColor: tenantTheme.warningColor,
                          border: '1px solid #ccc',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'color';
                          input.value = tenantTheme.warningColor;
                          input.onchange = (e) => {
                            handleThemeColorChange('warningColor', (e.target as HTMLInputElement).value);
                          };
                          input.click();
                        }}
                      />
                      <TextField
                        size="small"
                        value={tenantTheme.warningColor}
                        onChange={(e) => handleThemeColorChange('warningColor', e.target.value)}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>Información</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          backgroundColor: tenantTheme.infoColor,
                          border: '1px solid #ccc',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'color';
                          input.value = tenantTheme.infoColor;
                          input.onchange = (e) => {
                            handleThemeColorChange('infoColor', (e.target as HTMLInputElement).value);
                          };
                          input.click();
                        }}
                      />
                      <TextField
                        size="small"
                        value={tenantTheme.infoColor}
                        onChange={(e) => handleThemeColorChange('infoColor', e.target.value)}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>Éxito</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          backgroundColor: tenantTheme.successColor,
                          border: '1px solid #ccc',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'color';
                          input.value = tenantTheme.successColor;
                          input.onchange = (e) => {
                            handleThemeColorChange('successColor', (e.target as HTMLInputElement).value);
                          };
                          input.click();
                        }}
                      />
                      <TextField
                        size="small"
                        value={tenantTheme.successColor}
                        onChange={(e) => handleThemeColorChange('successColor', e.target.value)}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* Vista Previa */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Vista Previa
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ p: 2, backgroundColor: tenantTheme.backgroundColor, borderRadius: 1 }}>
                  <Box sx={{ p: 2, backgroundColor: tenantTheme.surfaceColor, borderRadius: tenantTheme.borderRadius / 8, mb: 2 }}>
                    <Typography variant="h6" sx={{ color: tenantTheme.textPrimaryColor, mb: 1 }}>
                      Ejemplo de Título
                    </Typography>
                    <Typography variant="body1" sx={{ color: tenantTheme.textSecondaryColor, mb: 2 }}>
                      Este es un texto de ejemplo para mostrar cómo se verán los colores.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button variant="contained" sx={{ backgroundColor: tenantTheme.primaryColor }}>
                        Botón Primario
                      </Button>
                      <Chip label="Éxito" sx={{ backgroundColor: tenantTheme.successColor, color: 'white' }} />
                      <Chip label="Error" sx={{ backgroundColor: tenantTheme.errorColor, color: 'white' }} />
                      <Chip label="Info" sx={{ backgroundColor: tenantTheme.infoColor, color: 'white' }} />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetTheme} disabled={themeLoading}>
            Restablecer
          </Button>
          <Button onClick={() => setOpenThemeDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveTheme} 
            variant="contained"
            startIcon={<Save />}
            disabled={themeLoading}
          >
            {themeLoading ? 'Guardando...' : 'Guardar Tema'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminDashboard;