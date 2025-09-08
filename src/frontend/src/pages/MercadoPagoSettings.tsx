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
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Divider,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  AccountBalance,
  Link as LinkIcon,
  LinkOff,
  Settings,
  Info,
  CheckCircle,
  Warning,
  Refresh,
  Science,
  AccountCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

interface MercadoPagoConnectionStatus {
  isConnected: boolean;
  accountEmail?: string;
  accountNickname?: string;
  countryId?: string;
  currencyId?: string;
  connectedAt?: string;
  accessTokenExpiresAt?: string;
  needsRefresh: boolean;
  isTestMode: boolean;
  lastError?: string;
}

interface MercadoPagoConfig {
  id?: string;
  isActive: boolean;
  connectedAt?: string;
  userEmail?: string;
  paymentExpirationMinutes: number;
}

const MercadoPagoSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<MercadoPagoConfig | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<MercadoPagoConnectionStatus | null>(null);
  const [expirationMinutes, setExpirationMinutes] = useState(5);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [oauthPopup, setOauthPopup] = useState<Window | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState(false);
  const closeCheckRef = React.useRef<number | null>(null);
  const resultReceivedRef = React.useRef(false);

  useEffect(() => {
    fetchConfiguration();
    
    // Listen for OAuth popup messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'mercadopago-oauth-result') {
        resultReceivedRef.current = true;
        if (closeCheckRef.current) {
          window.clearInterval(closeCheckRef.current);
          closeCheckRef.current = null;
        }
        if (oauthPopup) {
          oauthPopup.close();
          setOauthPopup(null);
        }
        
        if (event.data.success) {
          setMessage({ type: 'success', text: 'MercadoPago conectado exitosamente' });
          fetchConfiguration();
        } else {
          setMessage({ type: 'error', text: event.data.error || 'Error conectando MercadoPago' });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [oauthPopup]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const [statusResponse] = await Promise.allSettled([
        api.get('/mercadopago/oauth/status')
      ]);
      
      if (statusResponse.status === 'fulfilled') {
        const status = statusResponse.value.data;
        setConnectionStatus(status);
        setConfig({
          isActive: status.isConnected,
          connectedAt: status.connectedAt,
          userEmail: status.accountEmail,
          paymentExpirationMinutes: 5,
        });
      } else {
        setConnectionStatus({
          isConnected: false,
          needsRefresh: false,
          isTestMode: false,
        });
        setConfig({
          isActive: false,
          paymentExpirationMinutes: 5,
        });
      }
    } catch (error) {
      console.error('Error fetching MercadoPago configuration:', error);
      setConnectionStatus({
        isConnected: false,
        needsRefresh: false,
        isTestMode: false,
      });
      setConfig({
        isActive: false,
        paymentExpirationMinutes: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await api.post('/mercadopago/oauth/initiate', {
        redirectUrl: window.location.origin + '/admin/mercadopago-settings'
      });
      
      if (response.data.success) {
        // Open OAuth popup
        const popup = window.open(
          response.data.authorizationUrl,
          'mercadopago-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        setOauthPopup(popup);
        
        // Check if popup was closed manually
        closeCheckRef.current = window.setInterval(() => {
          if (popup?.closed) {
            if (closeCheckRef.current) {
              window.clearInterval(closeCheckRef.current);
              closeCheckRef.current = null;
            }
            setOauthPopup(null);
            if (!resultReceivedRef.current) {
              setMessage({ type: 'info', text: 'Conexión cancelada por el usuario' });
            }
          }
        }, 1000);
        
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Error iniciando OAuth' });
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setMessage({ type: 'error', text: 'Error al conectar con MercadoPago' });
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      const response = await api.post('/mercadopago/oauth/disconnect', {
        confirmDisconnect: true
      });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Cuenta desconectada exitosamente' });
        await fetchConfiguration();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Error desconectando la cuenta' });
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setMessage({ type: 'error', text: 'Error al desconectar la cuenta' });
    } finally {
      setSaving(false);
      setDisconnectDialog(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await api.post('/mercadopago/oauth/test');
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Conexión funcionando correctamente' });
      } else {
        setMessage({ type: 'error', text: 'La conexión no está funcionando correctamente' });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setMessage({ type: 'error', text: 'Error probando la conexión' });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      const response = await api.post('/mercadopago/oauth/refresh');
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Token actualizado exitosamente' });
        await fetchConfiguration();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Error actualizando token' });
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setMessage({ type: 'error', text: 'Error actualizando el token' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/mercadopago/configuration', {
        paymentExpirationMinutes: expirationMinutes,
      });
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
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
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <AccountBalance sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Configuración de MercadoPago
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

        {/* Connection Status Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Estado de Conexión OAuth
              </Typography>
              <Chip
                icon={connectionStatus?.isConnected ? <CheckCircle /> : <Warning />}
                label={connectionStatus?.isConnected ? 'Conectado' : 'Desconectado'}
                color={connectionStatus?.isConnected ? 'success' : 'default'}
              />
            </Box>

            {connectionStatus?.isConnected ? (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Email:</strong> {connectionStatus.accountEmail || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Usuario:</strong> {connectionStatus.accountNickname || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>País:</strong> {connectionStatus.countryId || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Moneda:</strong> {connectionStatus.currencyId || 'N/A'}
                    </Typography>
                  </Grid>
                  {connectionStatus.connectedAt && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Conectado desde:</strong> {new Date(connectionStatus.connectedAt).toLocaleDateString('es-ES')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                {connectionStatus.isTestMode && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Estás usando el modo de pruebas (sandbox). Los pagos serán simulados.
                  </Alert>
                )}

                {connectionStatus.needsRefresh && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    El token de acceso necesita ser renovado. Usa el botón "Actualizar Token".
                  </Alert>
                )}

                {connectionStatus.lastError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <strong>Último error:</strong> {connectionStatus.lastError}
                  </Alert>
                )}

                <Alert severity="success" sx={{ mb: 2 }}>
                  Tu cuenta está lista para recibir pagos. Tus clientes podrán pagar las reservas y servicios directamente con MercadoPago.
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Science />}
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? 'Probando...' : 'Probar Conexión'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleRefreshToken}
                    disabled={refreshing}
                  >
                    {refreshing ? 'Actualizando...' : 'Actualizar Token'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LinkOff />}
                    onClick={() => setDisconnectDialog(true)}
                    disabled={saving}
                  >
                    Desconectar
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Conecta tu cuenta de MercadoPago para recibir pagos de tus clientes de forma segura.
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>¿Cómo funciona?</strong>
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ mb: 0, pl: 2 }}>
                    <li>Conexión OAuth segura sin compartir credenciales</li>
                    <li>Tus clientes pagan directamente en tu cuenta de MercadoPago</li>
                    <li>Ideal para pagos de señas y servicios completos</li>
                    <li>Tokens se renuevan automáticamente</li>
                    <li>Control total desde tu cuenta de MercadoPago</li>
                  </Typography>
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LinkIcon />}
                  onClick={handleConnect}
                  sx={{ 
                    backgroundColor: '#009ee3',
                    '&:hover': {
                      backgroundColor: '#0084c7',
                    }
                  }}
                >
                  Conectar con MercadoPago OAuth
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Disconnect Confirmation Dialog */}
        <Dialog open={disconnectDialog} onClose={() => setDisconnectDialog(false)}>
          <DialogTitle>¿Desconectar MercadoPago?</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Está seguro que desea desconectar su cuenta de MercadoPago? 
              Esto deshabilitará los pagos online hasta que se vuelva a conectar.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisconnectDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleDisconnect}
              color="error"
              variant="contained"
              disabled={saving}
            >
              {saving ? 'Desconectando...' : 'Desconectar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Settings Card */}
        {config?.isActive && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Settings sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Configuración de Pagos
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Tiempo de expiración del link de pago"
                  type="number"
                  value={expirationMinutes}
                  onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 5)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
                  }}
                  helperText="Tiempo que el cliente tiene para completar el pago antes de que expire"
                />
              </Box>

              <Button
                variant="contained"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Info sx={{ mr: 1, color: 'info.main', mt: 0.5 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Información Importante
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>¿Cómo funciona la integración?</strong>
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                <li>Los clientes podrán pagar las señas directamente desde la app de MercadoPago</li>
                <li>Configura el porcentaje de seña en cada servicio</li>
                <li>Las reservas se confirman automáticamente al recibir el pago</li>
                <li>El dinero se acredita directamente en tu cuenta de MercadoPago</li>
                <li>Modelo marketplace: una sola integración para todos los tenants</li>
                <li>Comisión del 5% por transacción para la plataforma</li>
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" paragraph>
                <strong>Seguridad</strong>
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                <li>No almacenamos información sensible de pagos</li>
                <li>MercadoPago maneja toda la seguridad de las transacciones</li>
                <li>Puedes desconectar tu cuenta en cualquier momento</li>
                <li>Los tokens de acceso se renuevan automáticamente</li>
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" paragraph>
                <strong>Configuración de Señas por Servicio</strong>
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                <li>Ve a la página de Servicios</li>
                <li>Edita cada servicio para configurar si requiere seña</li>
                <li>Define el porcentaje o monto fijo de la seña</li>
                <li>Elige la política: todos los clientes, solo nuevos, o por anticipación</li>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default MercadoPagoSettings;
