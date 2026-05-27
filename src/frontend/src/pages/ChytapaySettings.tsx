/**
 * /chytapay-settings — Companion to MercadoPagoSettings for the Chytapay
 * payment provider. Same OAuth-popup pattern: postMessage("chytapay-oauth-result")
 * from the backend callback closes the popup and we re-fetch status.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  LinkOff,
  Refresh,
  Science,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';

interface ChytapayConnectionStatus {
  isConnected: boolean;
  connectedAt?: string;
  idTokenExpiresAt?: string;
  needsRefresh: boolean;
  isTestMode: boolean;
  lastError?: string;
}

const ChytapaySettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<ChytapayConnectionStatus | null>(null);
  const [defaultProvider, setDefaultProvider] = useState<'mercadopago' | 'chytapay'>('mercadopago');
  const [savingProvider, setSavingProvider] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [oauthPopup, setOauthPopup] = useState<Window | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState(false);
  const closeCheckRef = useRef<number | null>(null);
  const resultReceivedRef = useRef(false);

  useEffect(() => {
    fetchStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'chytapay-oauth-result') {
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
          setMessage({ type: 'success', text: 'Chytapay conectado exitosamente' });
          fetchStatus();
        } else {
          setMessage({ type: 'error', text: event.data.error || 'Error conectando Chytapay' });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [oauthPopup]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [statusRes, tenantRes] = await Promise.allSettled([
        api.get('/chytapay/oauth/status'),
        api.get('/Tenant/info'),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data as ChytapayConnectionStatus);
      } else {
        setStatus({ isConnected: false, needsRefresh: false, isTestMode: false });
      }

      if (tenantRes.status === 'fulfilled') {
        const provider = (tenantRes.value.data?.defaultPaymentProvider ?? 'mercadopago').toLowerCase();
        setDefaultProvider(provider === 'chytapay' ? 'chytapay' : 'mercadopago');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultProvider = async (provider: 'mercadopago' | 'chytapay') => {
    try {
      setSavingProvider(true);
      await api.put('/Tenant/payment-provider', { provider });
      setDefaultProvider(provider);
      setMessage({
        type: 'success',
        text: provider === 'chytapay'
          ? 'Chytapay es ahora el método default para cobrar señas'
          : 'MercadoPago es ahora el método default para cobrar señas',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Error guardando preferencia',
      });
    } finally {
      setSavingProvider(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await api.post('/chytapay/oauth/initiate', {
        redirectUrl: window.location.origin + '/admin/chytapay-settings',
      });

      if (res.data.success) {
        resultReceivedRef.current = false;
        const popup = window.open(
          res.data.authorizationUrl,
          'chytapay-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        setOauthPopup(popup);

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
        setMessage({ type: 'error', text: res.data.error || 'Error iniciando OAuth' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al conectar con Chytapay' });
    }
  };

  const handleDisconnect = async () => {
    try {
      setBusy(true);
      const res = await api.post('/chytapay/oauth/disconnect', { confirmDisconnect: true });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Cuenta desconectada exitosamente' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Error desconectando la cuenta' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al desconectar la cuenta' });
    } finally {
      setBusy(false);
      setDisconnectDialog(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const res = await api.post('/chytapay/oauth/test');
      setMessage(
        res.data.success
          ? { type: 'success', text: 'Conexión funcionando correctamente' }
          : { type: 'error', text: res.data.message || 'La conexión no está funcionando' }
      );
    } catch {
      setMessage({ type: 'error', text: 'Error probando la conexión' });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      const res = await api.post('/chytapay/oauth/refresh');
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Token actualizado exitosamente' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Error actualizando token' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error actualizando el token' });
    } finally {
      setRefreshing(false);
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Configuración de Chytapay
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Estado de Conexión</Typography>
              <Chip
                icon={status?.isConnected ? <CheckCircle /> : <Warning />}
                label={status?.isConnected ? 'Conectado' : 'Desconectado'}
                color={status?.isConnected ? 'success' : 'default'}
              />
            </Box>

            {status?.isConnected ? (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {status.connectedAt && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Conectado desde:</strong>{' '}
                        {new Date(status.connectedAt).toLocaleDateString('es-AR')}
                      </Typography>
                    </Grid>
                  )}
                  {status.idTokenExpiresAt && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Token vence:</strong>{' '}
                        {new Date(status.idTokenExpiresAt).toLocaleString('es-AR')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                {status.isTestMode && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Modo de pruebas (TEST) — los pagos serán simulados.
                  </Alert>
                )}

                {status.needsRefresh && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    El token está próximo a vencer. Usá "Actualizar Token" o esperá al refresh automático.
                  </Alert>
                )}

                {status.lastError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <strong>Último error:</strong> {status.lastError}
                  </Alert>
                )}

                <Alert severity="success" sx={{ mb: 2 }}>
                  Tu cuenta de Chytapay está lista. Tus clientes podrán pagar con transferencia bancaria al
                  CVU que Chytapay les envía por WhatsApp/email.
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" startIcon={<Science />} onClick={handleTestConnection} disabled={testing}>
                    {testing ? 'Probando...' : 'Probar Conexión'}
                  </Button>
                  <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefreshToken} disabled={refreshing}>
                    {refreshing ? 'Actualizando...' : 'Actualizar Token'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LinkOff />}
                    onClick={() => setDisconnectDialog(true)}
                    disabled={busy}
                  >
                    Desconectar
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Conectá tu cuenta de Chytapay para que tus clientes puedan pagar por transferencia bancaria
                  con notificación automática por WhatsApp.
                </Typography>
                <Button variant="contained" onClick={handleConnect} size="large">
                  Conectar con Chytapay
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {status?.isConnected && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Pasarela default para señas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Si tenés MercadoPago y Chytapay conectados, elegí cuál querés usar por default cuando se cobra
                una seña al reservar.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant={defaultProvider === 'mercadopago' ? 'contained' : 'outlined'}
                  onClick={() => handleSetDefaultProvider('mercadopago')}
                  disabled={savingProvider || defaultProvider === 'mercadopago'}
                >
                  MercadoPago
                </Button>
                <Button
                  variant={defaultProvider === 'chytapay' ? 'contained' : 'outlined'}
                  onClick={() => handleSetDefaultProvider('chytapay')}
                  disabled={savingProvider || defaultProvider === 'chytapay'}
                >
                  Chytapay
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Dialog open={disconnectDialog} onClose={() => setDisconnectDialog(false)}>
          <DialogTitle>Desconectar Chytapay</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro? Después de desconectar no vas a poder crear cobros con Chytapay hasta que
              vuelvas a vincular tu cuenta.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisconnectDialog(false)}>Cancelar</Button>
            <Button onClick={handleDisconnect} color="error" disabled={busy}>
              {busy ? 'Desconectando...' : 'Desconectar'}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default ChytapaySettings;
