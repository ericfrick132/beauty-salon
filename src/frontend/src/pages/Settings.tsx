import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Business,
  Palette,
  Payment,
  Group,
  Notifications,
  Schedule,
  Language,
  Security,
  ExpandMore,
  Edit,
  Delete,
  Add,
  Public,
  Phone,
  Email,
  LocationOn,
  AttachMoney,
  AccountBalance,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useTenant } from '../contexts/TenantContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TIMEZONES = [
  { value: '-3', label: 'Argentina (UTC-3)' },
  { value: '-3', label: 'Brasil (UTC-3)' },
  { value: '-4', label: 'Chile (UTC-4)' },
  { value: '-5', label: 'Perú/Colombia (UTC-5)' },
  { value: '-4', label: 'Venezuela (UTC-4)' },
  { value: '-3', label: 'Uruguay (UTC-3)' },
  { value: '-3', label: 'Paraguay (UTC-3)' },
  { value: '-4', label: 'Bolivia (UTC-4)' },
  { value: '-5', label: 'Ecuador (UTC-5)' },
  { value: '+1', label: 'España (UTC+1)' },
  { value: '0', label: 'Reino Unido (UTC+0)' },
];

const CURRENCIES = [
  { value: 'ARS', label: 'Peso Argentino (ARS)', symbol: '$' },
  { value: 'USD', label: 'Dólar Americano (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'BRL', label: 'Real Brasileño (BRL)', symbol: 'R$' },
  { value: 'CLP', label: 'Peso Chileno (CLP)', symbol: '$' },
  { value: 'COP', label: 'Peso Colombiano (COP)', symbol: '$' },
  { value: 'PEN', label: 'Sol Peruano (PEN)', symbol: 'S/' },
];

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
];

const Settings: React.FC = () => {
  const { config, getTerm } = useTenant();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    businessName: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    timezone: '-3',
    currency: 'ARS',
    language: 'es',
    taxId: '',
    businessHours: {
      start: '09:00',
      end: '18:00',
      workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    }
  });

  // Services Settings State
  const [servicesSettings, setServicesSettings] = useState({
    allowOnlineBooking: true,
    requireDeposit: false,
    depositPercentage: 20,
    minimumDepositAmount: 1000,
    bookingAdvanceLimit: 30, // days
    cancellationPolicy: '24', // hours
    autoConfirmBookings: false,
    allowCustomerNotes: true,
    minAdvanceMinutes: 0,
  });

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    acceptCash: true,
    acceptCards: true,
    acceptTransfers: true,
    acceptMercadoPago: false,
    mercadoPagoConnected: false,
    requireImmediatePayment: false,
    allowPartialPayments: false,
    defaultPaymentMethod: 'cash',
  });

  // Staff Settings State
  const [staffSettings, setStaffSettings] = useState({
    defaultCommissionPercentage: 10,
    allowFlexibleCommissions: true,
    trackWorkingHours: true,
    requireClockIn: false,
    allowMultipleServices: true,
    enablePerformanceMetrics: true,
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsReminders: false,
    bookingConfirmations: true,
    paymentNotifications: true,
    reminderHours: 24,
    newBookingNotification: true,
    cancellationNotification: true,
    dailyReportEmail: false,
  });

  // Advanced Settings State
  const [advancedSettings, setAdvancedSettings] = useState({
    dataRetentionDays: 365,
    enableAnalytics: true,
    allowPublicBooking: true,
    requireCustomerRegistration: false,
    enableLoyaltyProgram: false,
    maxBookingsPerCustomer: 10,
    enableWaitingList: true,
    autoDeleteCancelledBookings: false,
    enableMultiLocation: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load business/tenant info
      const tenantResponse = await api.get('/tenant/info');
      if (tenantResponse.data) {
        setGeneralSettings(prev => ({
          ...prev,
          businessName: tenantResponse.data.businessName || '',
          description: tenantResponse.data.description || '',
          address: tenantResponse.data.address || '',
          phone: tenantResponse.data.phone || '',
          email: tenantResponse.data.email || '',
          website: tenantResponse.data.website || '',
          timezone: tenantResponse.data.timezone || '-3',
          taxId: tenantResponse.data.taxId || '',
        }));
      }

      // Load payment configuration
      try {
        const paymentConfigResponse = await api.get('/mercadopago/configuration');
        if (paymentConfigResponse.data) {
          setPaymentSettings(prev => ({
            ...prev,
            acceptMercadoPago: paymentConfigResponse.data.isActive || false,
            mercadoPagoConnected: paymentConfigResponse.data.isActive || false,
          }));
        }
      } catch (error) {
        console.log('Payment configuration not available');
      }

      // Load services settings (min advance minutes)
      try {
        const servicesRes = await api.get('/settings/services');
        if (servicesRes?.data) {
          setServicesSettings(prev => ({
            ...prev,
            minAdvanceMinutes: servicesRes.data.minAdvanceMinutes ?? 0,
          }));
        }
      } catch (error) {
        console.log('Services settings not available');
      }

    } catch (error) {
      console.error('Error loading settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar la configuración',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const saveGeneralSettings = async () => {
    setLoading(true);
    try {
      await api.put('/tenant/settings', generalSettings);
      setSnackbar({
        open: true,
        message: 'Configuración general guardada exitosamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving general settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración general',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveServicesSettings = async () => {
    setLoading(true);
    try {
      await api.put('/settings/services', { minAdvanceMinutes: servicesSettings.minAdvanceMinutes });
      setSnackbar({
        open: true,
        message: 'Configuración de servicios guardada exitosamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving services settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración de servicios',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSettings = async () => {
    setLoading(true);
    try {
      await api.put('/settings/payments', paymentSettings);
      setSnackbar({
        open: true,
        message: 'Configuración de pagos guardada exitosamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración de pagos',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveStaffSettings = async () => {
    setLoading(true);
    try {
      await api.put('/settings/staff', staffSettings);
      setSnackbar({
        open: true,
        message: 'Configuración de personal guardada exitosamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving staff settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración de personal',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async () => {
    setLoading(true);
    try {
      await api.put('/settings/notifications', notificationSettings);
      setSnackbar({
        open: true,
        message: 'Configuración de notificaciones guardada exitosamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración de notificaciones',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAdvancedSettings = async () => {
    setLoading(true);
    try {
      await api.put('/settings/advanced', advancedSettings);
      setSnackbar({
        open: true,
        message: 'Configuración avanzada guardada exitosamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving advanced settings:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar la configuración avanzada',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && tabValue === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              <SettingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
              Configuración del Sistema
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Gestiona todas las configuraciones de tu {config?.businessName || 'negocio'} desde un solo lugar
            </Typography>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Business />} label="General" />
            <Tab icon={<Schedule />} label="Servicios" />
            <Tab icon={<Payment />} label="Pagos" />
            <Tab icon={<Group />} label="Personal" />
            <Tab icon={<Notifications />} label="Notificaciones" />
            <Tab icon={<Security />} label="Avanzado" />
          </Tabs>

          {/* General Settings Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Información del Negocio
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre del Negocio"
                  value={generalSettings.businessName}
                  onChange={(e) => setGeneralSettings(prev => ({
                    ...prev,
                    businessName: e.target.value
                  }))}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={generalSettings.phone}
                  onChange={(e) => setGeneralSettings(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={generalSettings.email}
                  onChange={(e) => setGeneralSettings(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sitio Web"
                  value={generalSettings.website}
                  onChange={(e) => setGeneralSettings(prev => ({
                    ...prev,
                    website: e.target.value
                  }))}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Public />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={generalSettings.address}
                  onChange={(e) => setGeneralSettings(prev => ({
                    ...prev,
                    address: e.target.value
                  }))}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  multiline
                  rows={3}
                  value={generalSettings.description}
                  onChange={(e) => setGeneralSettings(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Zona Horaria</InputLabel>
                  <Select
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings(prev => ({
                      ...prev,
                      timezone: e.target.value
                    }))}
                    label="Zona Horaria"
                  >
                    {TIMEZONES.map((timezone) => (
                      <MenuItem key={`${timezone.value}-${timezone.label}`} value={timezone.value}>
                        {timezone.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Moneda</InputLabel>
                  <Select
                    value={generalSettings.currency}
                    onChange={(e) => setGeneralSettings(prev => ({
                      ...prev,
                      currency: e.target.value
                    }))}
                    label="Moneda"
                  >
                    {CURRENCIES.map((currency) => (
                      <MenuItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Idioma</InputLabel>
                  <Select
                    value={generalSettings.language}
                    onChange={(e) => setGeneralSettings(prev => ({
                      ...prev,
                      language: e.target.value
                    }))}
                    label="Idioma"
                  >
                    {LANGUAGES.map((language) => (
                      <MenuItem key={language.value} value={language.value}>
                        {language.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveGeneralSettings}
                    disabled={loading}
                  >
                    Guardar Configuración General
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Services Settings Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configuración de Servicios y Reservas
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Reservas Online</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={servicesSettings.allowOnlineBooking}
                          onChange={(e) => setServicesSettings(prev => ({
                            ...prev,
                            allowOnlineBooking: e.target.checked
                          }))}
                        />
                      }
                      label="Permitir reservas online"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={servicesSettings.autoConfirmBookings}
                          onChange={(e) => setServicesSettings(prev => ({
                            ...prev,
                            autoConfirmBookings: e.target.checked
                          }))}
                        />
                      }
                      label="Confirmar automáticamente las reservas"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={servicesSettings.allowCustomerNotes}
                          onChange={(e) => setServicesSettings(prev => ({
                            ...prev,
                            allowCustomerNotes: e.target.checked
                          }))}
                        />
                      }
                      label="Permitir notas del cliente"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Depósitos y Pagos Anticipados</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={servicesSettings.requireDeposit}
                          onChange={(e) => setServicesSettings(prev => ({
                            ...prev,
                            requireDeposit: e.target.checked
                          }))}
                        />
                      }
                      label="Requerir depósito"
                    />
                    
                    {servicesSettings.requireDeposit && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Porcentaje de depósito"
                            type="number"
                            value={servicesSettings.depositPercentage}
                            onChange={(e) => setServicesSettings(prev => ({
                              ...prev,
                              depositPercentage: parseInt(e.target.value) || 0
                            }))}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Monto mínimo"
                            type="number"
                            value={servicesSettings.minimumDepositAmount}
                            onChange={(e) => setServicesSettings(prev => ({
                              ...prev,
                              minimumDepositAmount: parseInt(e.target.value) || 0
                            }))}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                          />
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Anticipación mínima (minutos) para reservas online"
                  type="number"
                  value={servicesSettings.minAdvanceMinutes}
                  onChange={(e) => setServicesSettings(prev => ({
                    ...prev,
                    minAdvanceMinutes: parseInt(e.target.value) || 0
                  }))}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Límite de reservas anticipadas (días)"
                  type="number"
                  value={servicesSettings.bookingAdvanceLimit}
                  onChange={(e) => setServicesSettings(prev => ({
                    ...prev,
                    bookingAdvanceLimit: parseInt(e.target.value) || 0
                  }))}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Política de cancelación</InputLabel>
                  <Select
                    value={servicesSettings.cancellationPolicy}
                    onChange={(e) => setServicesSettings(prev => ({
                      ...prev,
                      cancellationPolicy: e.target.value
                    }))}
                    label="Política de cancelación"
                  >
                    <MenuItem value="1">1 hora antes</MenuItem>
                    <MenuItem value="2">2 horas antes</MenuItem>
                    <MenuItem value="4">4 horas antes</MenuItem>
                    <MenuItem value="12">12 horas antes</MenuItem>
                    <MenuItem value="24">24 horas antes</MenuItem>
                    <MenuItem value="48">48 horas antes</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveServicesSettings}
                    disabled={loading}
                  >
                    Guardar Configuración de Servicios
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Payment Settings Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configuración de Pagos
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Métodos de Pago Aceptados</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={paymentSettings.acceptCash}
                          onChange={(e) => setPaymentSettings(prev => ({
                            ...prev,
                            acceptCash: e.target.checked
                          }))}
                        />
                      }
                      label="Efectivo"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={paymentSettings.acceptCards}
                          onChange={(e) => setPaymentSettings(prev => ({
                            ...prev,
                            acceptCards: e.target.checked
                          }))}
                        />
                      }
                      label="Tarjetas de crédito/débito"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={paymentSettings.acceptTransfers}
                          onChange={(e) => setPaymentSettings(prev => ({
                            ...prev,
                            acceptTransfers: e.target.checked
                          }))}
                        />
                      }
                      label="Transferencias bancarias"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={paymentSettings.acceptMercadoPago}
                          disabled
                        />
                      }
                      label={`MercadoPago ${paymentSettings.mercadoPagoConnected ? '(Conectado)' : '(No configurado)'}`}
                    />
                    {!paymentSettings.mercadoPagoConnected && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Para habilitar MercadoPago, ve a la sección "Mi MercadoPago" en el menú de configuración.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Políticas de Pago</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={paymentSettings.requireImmediatePayment}
                          onChange={(e) => setPaymentSettings(prev => ({
                            ...prev,
                            requireImmediatePayment: e.target.checked
                          }))}
                        />
                      }
                      label="Requerir pago inmediato al reservar"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={paymentSettings.allowPartialPayments}
                          onChange={(e) => setPaymentSettings(prev => ({
                            ...prev,
                            allowPartialPayments: e.target.checked
                          }))}
                        />
                      }
                      label="Permitir pagos parciales"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Método de pago predeterminado</InputLabel>
                  <Select
                    value={paymentSettings.defaultPaymentMethod}
                    onChange={(e) => setPaymentSettings(prev => ({
                      ...prev,
                      defaultPaymentMethod: e.target.value
                    }))}
                    label="Método de pago predeterminado"
                  >
                    <MenuItem value="cash">Efectivo</MenuItem>
                    <MenuItem value="card">Tarjeta</MenuItem>
                    <MenuItem value="transfer">Transferencia</MenuItem>
                    <MenuItem value="mercadopago">MercadoPago</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={savePaymentSettings}
                    disabled={loading}
                  >
                    Guardar Configuración de Pagos
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Staff Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configuración de Personal
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Comisiones</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Porcentaje de comisión predeterminado"
                          type="number"
                          value={staffSettings.defaultCommissionPercentage}
                          onChange={(e) => setStaffSettings(prev => ({
                            ...prev,
                            defaultCommissionPercentage: parseFloat(e.target.value) || 0
                          }))}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                        />
                      </Grid>
                    </Grid>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={staffSettings.allowFlexibleCommissions}
                          onChange={(e) => setStaffSettings(prev => ({
                            ...prev,
                            allowFlexibleCommissions: e.target.checked
                          }))}
                        />
                      }
                      label="Permitir comisiones personalizadas por empleado"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Control de Horarios</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={staffSettings.trackWorkingHours}
                          onChange={(e) => setStaffSettings(prev => ({
                            ...prev,
                            trackWorkingHours: e.target.checked
                          }))}
                        />
                      }
                      label="Seguimiento de horas trabajadas"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={staffSettings.requireClockIn}
                          onChange={(e) => setStaffSettings(prev => ({
                            ...prev,
                            requireClockIn: e.target.checked
                          }))}
                        />
                      }
                      label="Requerir marcar entrada y salida"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Servicios y Rendimiento</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={staffSettings.allowMultipleServices}
                          onChange={(e) => setStaffSettings(prev => ({
                            ...prev,
                            allowMultipleServices: e.target.checked
                          }))}
                        />
                      }
                      label="Permitir múltiples servicios por empleado"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={staffSettings.enablePerformanceMetrics}
                          onChange={(e) => setStaffSettings(prev => ({
                            ...prev,
                            enablePerformanceMetrics: e.target.checked
                          }))}
                        />
                      }
                      label="Habilitar métricas de rendimiento"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveStaffSettings}
                    disabled={loading}
                  >
                    Guardar Configuración de Personal
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Notifications Settings Tab */}
          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configuración de Notificaciones
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Notificaciones por Email</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            emailNotifications: e.target.checked
                          }))}
                        />
                      }
                      label="Habilitar notificaciones por email"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.bookingConfirmations}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            bookingConfirmations: e.target.checked
                          }))}
                        />
                      }
                      label="Confirmaciones de reserva"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.paymentNotifications}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            paymentNotifications: e.target.checked
                          }))}
                        />
                      }
                      label="Notificaciones de pago"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.dailyReportEmail}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            dailyReportEmail: e.target.checked
                          }))}
                        />
                      }
                      label="Reporte diario por email"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Recordatorios SMS</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.smsReminders}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            smsReminders: e.target.checked
                          }))}
                        />
                      }
                      label="Habilitar recordatorios por SMS"
                    />
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Enviar recordatorio (horas antes)"
                          type="number"
                          value={notificationSettings.reminderHours}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            reminderHours: parseInt(e.target.value) || 24
                          }))}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Notificaciones del Personal</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.newBookingNotification}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            newBookingNotification: e.target.checked
                          }))}
                        />
                      }
                      label="Nueva reserva"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.cancellationNotification}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            cancellationNotification: e.target.checked
                          }))}
                        />
                      }
                      label="Cancelaciones"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveNotificationSettings}
                    disabled={loading}
                  >
                    Guardar Configuración de Notificaciones
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Advanced Settings Tab */}
          <TabPanel value={tabValue} index={5}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configuración Avanzada
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Estas configuraciones son avanzadas. Modifícalas solo si sabes lo que estás haciendo.
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Datos y Privacidad</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Retención de datos (días)"
                          type="number"
                          value={advancedSettings.dataRetentionDays}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            dataRetentionDays: parseInt(e.target.value) || 365
                          }))}
                          helperText="Los datos se eliminarán automáticamente después de este período"
                        />
                      </Grid>
                    </Grid>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.enableAnalytics}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            enableAnalytics: e.target.checked
                          }))}
                        />
                      }
                      label="Habilitar análisis y métricas"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Reservas Públicas</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.allowPublicBooking}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            allowPublicBooking: e.target.checked
                          }))}
                        />
                      }
                      label="Permitir reservas sin registro"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.requireCustomerRegistration}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            requireCustomerRegistration: e.target.checked
                          }))}
                        />
                      }
                      label="Requerir registro de cliente"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Funciones Especiales</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.enableLoyaltyProgram}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            enableLoyaltyProgram: e.target.checked
                          }))}
                        />
                      }
                      label="Programa de fidelización"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.enableWaitingList}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            enableWaitingList: e.target.checked
                          }))}
                        />
                      }
                      label="Lista de espera"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.enableMultiLocation}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            enableMultiLocation: e.target.checked
                          }))}
                        />
                      }
                      label="Múltiples ubicaciones"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedSettings.autoDeleteCancelledBookings}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            autoDeleteCancelledBookings: e.target.checked
                          }))}
                        />
                      }
                      label="Eliminar automáticamente reservas canceladas"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Máximo de reservas por cliente"
                  type="number"
                  value={advancedSettings.maxBookingsPerCustomer}
                  onChange={(e) => setAdvancedSettings(prev => ({
                    ...prev,
                    maxBookingsPerCustomer: parseInt(e.target.value) || 10
                  }))}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={saveAdvancedSettings}
                    disabled={loading}
                  >
                    Guardar Configuración Avanzada
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

        </Paper>
      </motion.div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
