import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  WhatsApp,
  QrCode,
  Refresh,
  LinkOff,
  CheckCircle,
  Phone,
  Person,
} from '@mui/icons-material';
import {
  platformWhatsappService,
  PlatformWhatsAppStatus,
} from '../services/platformWhatsappService';

const POLL_INTERVAL_MS = 5000;

/**
 * Super-admin screen to connect the PLATFORM WhatsApp number — the one that sends
 * the signup/login OTP codes. Scan the QR with the phone you want to send from.
 */
const SuperAdminWhatsApp: React.FC = () => {
  const [status, setStatus] = useState<PlatformWhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await platformWhatsappService.getStatus();
      setStatus(data);
      if (data.status === 'open') {
        setQrCode(null);
        stopPolling();
      }
      return data;
    } catch (err) {
      console.error('Error fetching platform WhatsApp status:', err);
      return null;
    }
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL_MS);
  }, [fetchStatus, stopPolling]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStatus();
      setLoading(false);
    };
    init();
    return () => stopPolling();
  }, [fetchStatus, stopPolling]);

  const handleConnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await platformWhatsappService.connect();
      if (result.status === 'open') {
        await fetchStatus();
      } else if (result.qrCodeBase64) {
        setQrCode(result.qrCodeBase64);
        setStatus((prev) => (prev ? { ...prev, status: 'connecting' } : { status: 'connecting' }));
        startPolling();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al conectar WhatsApp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await platformWhatsappService.refreshQr();
      if (result.status === 'open') {
        await fetchStatus();
        setQrCode(null);
      } else if (result.qrCodeBase64) {
        setQrCode(result.qrCodeBase64);
        startPolling();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al refrescar QR');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await platformWhatsappService.disconnect();
      setQrCode(null);
      stopPolling();
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al desconectar WhatsApp');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isConnected = status?.status === 'open';
  const isConnecting = status?.status === 'connecting' || !!qrCode;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WhatsApp sx={{ color: '#25D366', fontSize: 32 }} />
        WhatsApp de la plataforma
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Este es el número desde el que se envían los códigos de acceso (OTP) cuando alguien se
        registra o inicia sesión por WhatsApp. Escaneá el QR con el teléfono que querés usar
        para enviar.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Connected */}
          {isConnected && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: '#25D366', fontSize: 28 }} />
                <Typography variant="h6" fontWeight={600}>
                  WhatsApp conectado
                </Typography>
                <Chip
                  label="Activo"
                  size="small"
                  sx={{ bgcolor: '#25D366', color: 'white', fontWeight: 600, ml: 'auto' }}
                />
              </Box>

              <Divider />

              {status?.connectedPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body1">
                    <strong>Número:</strong> +{status.connectedPhone}
                  </Typography>
                </Box>
              )}

              {status?.profileName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body1">
                    <strong>Perfil:</strong> {status.profileName}
                  </Typography>
                </Box>
              )}

              {status?.instanceName && (
                <Typography variant="caption" color="text.secondary">
                  Instancia: {status.instanceName}
                </Typography>
              )}

              {status?.connectedAt && (
                <Typography variant="body2" color="text.secondary">
                  Conectado desde:{' '}
                  {new Date(status.connectedAt).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              )}

              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOff />}
                onClick={handleDisconnect}
                disabled={actionLoading}
                sx={{ mt: 1 }}
              >
                {actionLoading ? <CircularProgress size={20} /> : 'Desconectar'}
              </Button>
            </Stack>
          )}

          {/* Scanning QR */}
          {!isConnected && isConnecting && (
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                Escaneá el código QR
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Abrí WhatsApp en tu teléfono, andá a Dispositivos vinculados y escaneá este código.
              </Typography>

              {qrCode && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="WhatsApp QR Code"
                    style={{ maxWidth: 280, width: '100%', height: 'auto' }}
                  />
                </Box>
              )}

              <Typography variant="caption" color="text.secondary">
                El QR expira en ~40 segundos. Si no lo escaneás a tiempo, refrescalo.
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefreshQr}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={20} /> : 'Refrescar QR'}
                </Button>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => {
                    setQrCode(null);
                    stopPolling();
                    fetchStatus();
                  }}
                >
                  Cancelar
                </Button>
              </Stack>
            </Stack>
          )}

          {/* Disconnected */}
          {!isConnected && !isConnecting && (
            <Stack spacing={2} alignItems="center">
              <QrCode sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography variant="h6" fontWeight={600}>
                WhatsApp no conectado
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Conectá el número de la plataforma para que se envíen los códigos de acceso por
                WhatsApp.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<WhatsApp />}
                onClick={handleConnect}
                disabled={actionLoading}
                sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' }, borderRadius: 2, px: 4 }}
              >
                {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Conectar WhatsApp'}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SuperAdminWhatsApp;
