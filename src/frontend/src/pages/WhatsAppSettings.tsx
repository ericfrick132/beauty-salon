import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  Link as LinkIcon,
  LinkOff,
  CheckCircle,
  Warning,
  Refresh,
  Send,
  WhatsApp,
  QrCode2,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { whatsappApi } from '../services/api';

interface WhatsAppStatus {
  status: string;
  connectedPhone?: string;
  profileName?: string;
  connectedAt?: string;
  instanceName?: string;
}

const WhatsAppSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<string>('pending');
  const [statusData, setStatusData] = useState<WhatsAppStatus | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState(false);

  // Test message state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hola! Este es un mensaje de prueba desde Turnos Pro.');

  const fetchStatus = useCallback(async () => {
    try {
      const data = await whatsappApi.getStatus();
      setStatusData(data);
      setConnectionStatus(data.status);
    } catch (err: any) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for status when connecting
  useEffect(() => {
    if (connectionStatus !== 'connecting') return;
    const interval = setInterval(async () => {
      try {
        const data = await whatsappApi.getStatus();
        setStatusData(data);
        if (data.status === 'open') {
          setConnectionStatus('open');
          setQrCodeBase64('');
          setMessage({ type: 'success', text: 'WhatsApp conectado exitosamente!' });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const result = await whatsappApi.connect();
      setQrCodeBase64(result.qrCodeBase64);
      setConnectionStatus('connecting');
      setMessage({ type: 'info', text: 'Escaneá el código QR con WhatsApp para conectar.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al conectar' });
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshQr = async () => {
    setRefreshingQr(true);
    try {
      const result = await whatsappApi.refreshQr();
      setQrCodeBase64(result.qrCodeBase64);
      setMessage({ type: 'info', text: 'Código QR actualizado.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al actualizar QR' });
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setDisconnectDialog(false);
    try {
      await whatsappApi.disconnect();
      setConnectionStatus('close');
      setStatusData(prev => prev ? { ...prev, status: 'close' } : null);
      setQrCodeBase64('');
      setMessage({ type: 'success', text: 'WhatsApp desconectado.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al desconectar' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      setMessage({ type: 'error', text: 'Ingresá un número de teléfono.' });
      return;
    }
    setSendingTest(true);
    setMessage(null);
    try {
      await whatsappApi.sendTest(testPhone, testMessage);
      setMessage({ type: 'success', text: 'Mensaje de prueba enviado!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al enviar mensaje de prueba' });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/settings')} sx={{ mb: 2 }}>
            Volver a Configuración
          </Button>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <WhatsApp sx={{ mr: 1, verticalAlign: 'middle', color: '#25D366' }} />
            Conexión WhatsApp
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Conectá tu número de WhatsApp personal para enviar recordatorios automáticos a tus clientes.
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* State A: Not connected */}
        {(connectionStatus === 'pending' || connectionStatus === 'close') && !qrCodeBase64 && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <WhatsApp sx={{ fontSize: 64, color: '#25D366', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                WhatsApp no conectado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
                Conectá tu número de WhatsApp escaneando un código QR. Una vez conectado, el sistema podrá enviar
                recordatorios automáticos a tus clientes antes de cada turno.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<LinkIcon />}
                onClick={handleConnect}
                disabled={connecting}
                sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#1DA851' } }}
              >
                {connecting ? <CircularProgress size={24} /> : 'Conectar WhatsApp'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* State B: Connecting (QR visible) */}
        {connectionStatus === 'connecting' && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                <QrCode2 sx={{ mr: 1, verticalAlign: 'middle' }} />
                Escaneá este código QR con WhatsApp
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Abrí WhatsApp en tu celular &rarr; Dispositivos vinculados &rarr; Vincular un dispositivo
              </Typography>

              {qrCodeBase64 ? (
                <Box sx={{ mb: 3 }}>
                  <img
                    src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                    alt="WhatsApp QR Code"
                    style={{ maxWidth: 280, width: '100%', borderRadius: 12, border: '1px solid #e0e0e0' }}
                  />
                </Box>
              ) : (
                <Box sx={{ mb: 3 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Generando código QR...
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefreshQr}
                  disabled={refreshingQr}
                >
                  {refreshingQr ? <CircularProgress size={20} /> : 'Actualizar QR'}
                </Button>
              </Box>

              <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                El sistema verifica automáticamente cada 5 segundos si escaneaste el código.
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* State C: Connected */}
        {connectionStatus === 'open' && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: '#25D366', mr: 1 }} />
                  <Typography variant="h6">WhatsApp Conectado</Typography>
                  <Chip
                    label="Conectado"
                    color="success"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {statusData?.connectedPhone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Teléfono</Typography>
                      <Typography variant="body1" fontWeight={600}>{statusData.connectedPhone}</Typography>
                    </Grid>
                  )}
                  {statusData?.profileName && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Nombre de perfil</Typography>
                      <Typography variant="body1" fontWeight={600}>{statusData.profileName}</Typography>
                    </Grid>
                  )}
                  {statusData?.connectedAt && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Conectado desde</Typography>
                      <Typography variant="body1">{new Date(statusData.connectedAt).toLocaleString()}</Typography>
                    </Grid>
                  )}
                  {statusData?.instanceName && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Instancia</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {statusData.instanceName}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<LinkOff />}
                  onClick={() => setDisconnectDialog(true)}
                  disabled={disconnecting}
                >
                  Desconectar
                </Button>
              </CardContent>
            </Card>

            {/* Test message section */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Send sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Enviar mensaje de prueba
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Teléfono (con código de país)"
                      placeholder="5491123456789"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mensaje"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      multiline
                      rows={2}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  startIcon={sendingTest ? <CircularProgress size={20} /> : <Send />}
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#1DA851' } }}
                >
                  Enviar prueba
                </Button>
              </CardContent>
            </Card>

            {/* Link to messaging settings */}
            <Alert severity="info" icon={<Warning />}>
              Para configurar el template de recordatorios y activar el envío automático, visitá{' '}
              <Button size="small" onClick={() => navigate('/messaging/settings')} sx={{ textTransform: 'none', p: 0 }}>
                Configuración de Mensajería
              </Button>
              .
            </Alert>
          </>
        )}

        {/* Disconnect confirmation dialog */}
        <Dialog open={disconnectDialog} onClose={() => setDisconnectDialog(false)}>
          <DialogTitle>Desconectar WhatsApp</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que querés desconectar WhatsApp? Los recordatorios automáticos dejarán de enviarse
              hasta que vuelvas a conectar.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisconnectDialog(false)}>Cancelar</Button>
            <Button onClick={handleDisconnect} color="error" variant="contained" disabled={disconnecting}>
              {disconnecting ? <CircularProgress size={20} /> : 'Desconectar'}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default WhatsAppSettings;
