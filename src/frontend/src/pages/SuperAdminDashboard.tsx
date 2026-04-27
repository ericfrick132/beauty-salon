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
  CircularProgress,
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
  Add,
  Refresh,
  CardMembership,
  WhatsApp as WhatsAppIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import TenantsManagement from './TenantsManagement';
import SuperAdminPlans from './SuperAdminPlans';
import TrackingDashboard from './TrackingDashboard';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../services/api';

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

function WhatsAppPanel() {
  const [status, setStatus] = useState<{ connected: boolean; state?: string; instance?: string; message?: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('superAdminToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/TenantManagement/whatsapp/status', { headers });
      const data = await res.json();
      setStatus(data);
    } catch { setStatus({ connected: false, message: 'Error al conectar' }); }
    finally { setLoading(false); }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/TenantManagement/whatsapp/connect', { method: 'POST', headers });
      const data = await res.json();
      if (data?.base64) setQrCode(data.base64);
      else if (data?.code) setQrCode(data.code);
      setTimeout(fetchStatus, 10000);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>WhatsApp SuperAdmin</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Conexión para notificaciones de leads y seguimiento automático.
      </Typography>

      {loading && <CircularProgress />}

      {!loading && status && (
        <Card sx={{ maxWidth: 500 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Chip
                label={status.connected ? 'Conectado' : 'Desconectado'}
                color={status.connected ? 'success' : 'error'}
              />
              {status.instance && (
                <Typography variant="caption" color="text.secondary">
                  Instancia: {status.instance}
                </Typography>
              )}
            </Box>

            {!status.connected && (
              <>
                <Button variant="contained" onClick={handleConnect} sx={{ mb: 2 }}>
                  Conectar WhatsApp
                </Button>
                {qrCode && (
                  <Box mt={2}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Escaneá este QR con WhatsApp:</Typography>
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code"
                      style={{ maxWidth: 300, border: '1px solid #ddd', borderRadius: 8 }}
                    />
                  </Box>
                )}
              </>
            )}

            {status.connected && (
              <Typography color="success.main">WhatsApp conectado y funcionando.</Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

const SuperAdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  // tenants list itself is rendered by the embedded TenantsManagement;
  // we only need the count for the dashboard stats below.
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
                  startIcon={<Subscriptions />}
                  onClick={() => navigate('/super-admin/plans')}
                  size="large"
                >
                  Gestionar Planes
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => navigate('/super-admin/emails')}
                  size="large"
                >
                  Verificación de Emails
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  onClick={() => navigate('/super-admin/tenants')}
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

  const renderInvitationsList = () => (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader 
          title="Invitaciones Enviadas"
          action={
            <Button startIcon={<Refresh />} onClick={loadInvitations}>Actualizar</Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Negocio</TableCell>
                  <TableCell>Subdominio</TableCell>
                  <TableCell>Email Admin</TableCell>
                  <TableCell>Vertical</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Creada</TableCell>
                  <TableCell>Expira</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      No hay invitaciones enviadas
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">{inv.businessName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">{inv.subdomain}</Typography>
                      </TableCell>
                      <TableCell>{inv.adminEmail}</TableCell>
                      <TableCell>{inv.verticalName || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={String(inv.status).toUpperCase()} color={getStatusColor(String(inv.status)) as any} />
                      </TableCell>
                      <TableCell>{formatDate(inv.createdAt)}</TableCell>
                      <TableCell>{formatDate(inv.expiresAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Copiar enlace">
                            <IconButton size="small" onClick={() => copyToClipboard(inv.invitationUrl)}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reenviar invitación">
                            <IconButton size="small" color="primary" onClick={() => handleResendInvitation(inv.id)}>
                              <Send fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancelar invitación">
                            <IconButton size="small" color="error" onClick={() => handleCancelInvitation(inv.id)}>
                              <Cancel fontSize="small" />
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
      <AppBar position="static" sx={{ backgroundColor: '#1a237e' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600, color: '#fff' }}>
            Panel de Super Administrador
          </Typography>
          <Chip
            label={(() => { try { return JSON.parse(localStorage.getItem('superAdminUser') || '{}').email || 'Super Admin'; } catch { return 'Super Admin'; } })()}
            sx={{ mr: 2, backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 500 }}
            size="small"
          />
          <IconButton sx={{ color: '#fff' }} onClick={loadData}>
            <Refresh />
          </IconButton>
          <IconButton sx={{ color: '#fff' }} onClick={handleLogout}>
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
            <Tab icon={<Email />} label="Invitaciones Enviadas" />
            <Tab icon={<People />} label="Negocios" />
            <Tab icon={<CardMembership />} label="Planes" />
            <Tab icon={<AttachMoney />} label="Facturación" />
            <Tab icon={<WhatsAppIcon />} label="WhatsApp" />
            <Tab icon={<TrendIcon />} label="Marketing" />
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
            {currentTab === 2 && renderInvitationsList()}
          </div>

          <div role="tabpanel" hidden={currentTab !== 3}>
            {currentTab === 3 && (
              <Box sx={{ p: 0 }}>
                <TenantsManagement embedded />
              </Box>
            )}
          </div>

          <div role="tabpanel" hidden={currentTab !== 4}>
            {currentTab === 4 && (
              <Box sx={{ p: 0 }}>
                <SuperAdminPlans embedded />
              </Box>
            )}
          </div>

          <div role="tabpanel" hidden={currentTab !== 5}>
            {currentTab === 5 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h5">Facturación</Typography>
                <Typography color="text.secondary">Próximamente...</Typography>
              </Box>
            )}
          </div>

          <div role="tabpanel" hidden={currentTab !== 6}>
            {currentTab === 6 && <WhatsAppPanel />}
          </div>

          <div role="tabpanel" hidden={currentTab !== 7}>
            {currentTab === 7 && (
              <Box sx={{ p: 0 }}>
                <TrackingDashboard />
              </Box>
            )}
          </div>

          <div role="tabpanel" hidden={currentTab !== 8}>
            {currentTab === 8 && (
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

    </Box>
  );
};

export default SuperAdminDashboard;
