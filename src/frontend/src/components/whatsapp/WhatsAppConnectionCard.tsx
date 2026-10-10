import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { QrCode2, CheckCircle, WhatsApp } from '@mui/icons-material';
import { whatsappApi } from '../../services/api';

interface WhatsAppStatus {
  status: string; // pending | connecting | open | close
  connectedPhone?: string;
  profileName?: string;
  connectedAt?: string;
  instanceName?: string;
}

/**
 * Conexión del WhatsApp del negocio, embebida en la página del asistente (estilo PlayCrew): con el
 * add-on activo el QR aparece acá mismo, sin mandar al usuario a otra pantalla. Hace polling del
 * estado cada 5 s mientras hay un QR en pantalla y lo corta al conectar.
 */
const WhatsAppConnectionCard: React.FC<{ onConnectedChange?: (connected: boolean) => void }> = ({ onConnectedChange }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qr, setQr] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const isOpen = status?.status === 'open';

  const fetchStatus = useCallback(async () => {
    try {
      const data: WhatsAppStatus = await whatsappApi.getStatus();
      setStatus(data);
      onConnectedChange?.(data.status === 'open');
      return data;
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onConnectedChange]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Mientras se muestra el QR, esperamos el escaneo.
  useEffect(() => {
    if (!qr) return;
    const interval = setInterval(async () => {
      const data = await fetchStatus();
      if (data?.status === 'open') {
        setQr('');
        setMessage({ type: 'success', text: '¡WhatsApp conectado! El asistente ya puede contestar.' });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [qr, fetchStatus]);

  const connect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await whatsappApi.connect();
      setQr(result.qrCodeBase64 || '');
      setStatus((prev) => ({ ...(prev || { status: 'connecting' }), status: 'connecting' }));
      if (!result.qrCodeBase64) setMessage({ type: 'info', text: 'Instancia creada. Tocá "Actualizar QR" si no aparece el código.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.response?.data?.message || 'No se pudo iniciar la conexión.' });
    } finally {
      setBusy(false);
    }
  };

  const refreshQr = async () => {
    setBusy(true);
    try {
      const result = await whatsappApi.refreshQr();
      setQr(result.qrCodeBase64 || '');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'No se pudo actualizar el QR.' });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await whatsappApi.disconnect();
      setQr('');
      await fetchStatus();
      setMessage({ type: 'info', text: 'WhatsApp desconectado. El asistente no contesta hasta que vuelvas a conectar.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'No se pudo desconectar.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}><WhatsApp sx={{ mr: 1, verticalAlign: 'middle', color: '#25d366' }} />Conexión de WhatsApp</Typography>
          {status && (
            <Chip size="small" color={isOpen ? 'success' : 'warning'} label={isOpen ? 'Conectado' : status.status === 'connecting' || qr ? 'Esperando escaneo' : 'Desconectado'} />
          )}
        </Box>
        {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        ) : qr ? (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>Escaneá este QR con el WhatsApp del negocio</Typography>
            <Box sx={{ display: 'inline-block', p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}>
              <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR de WhatsApp" style={{ width: 240, height: 240, display: 'block' }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              WhatsApp › Menú › Dispositivos vinculados › Vincular dispositivo
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#128c7e', mt: 0.5 }}>Esperando escaneo…</Typography>
            <Button size="small" sx={{ mt: 1.5 }} onClick={refreshQr} disabled={busy}>{busy ? '…' : 'Actualizar QR'}</Button>
          </Box>
        ) : isOpen ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(37, 211, 102, 0.10)', mb: 1.5 }}>
              <CheckCircle sx={{ color: '#1faa53' }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>WhatsApp conectado{status?.connectedPhone ? ` · +${status.connectedPhone}` : ''}</Typography>
                <Typography variant="caption" color="text.secondary">El asistente contesta desde este número.{status?.profileName ? ` Perfil: ${status.profileName}.` : ''}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => fetchStatus()} disabled={busy}>Verificar conexión</Button>
              <Button size="small" color="error" onClick={disconnect} disabled={busy}>Desconectar</Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <QrCode2 sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              {status?.status === 'close'
                ? 'La sesión se cerró. Volvé a escanear el QR para que el asistente siga contestando.'
                : 'Conectá el WhatsApp del negocio escaneando un QR: el asistente contesta desde tu propio número.'}
            </Typography>
            <Button variant="contained" startIcon={<WhatsApp />} onClick={connect} disabled={busy}>
              {busy ? 'Generando QR…' : status?.status === 'close' ? 'Reconectar' : 'Conectar WhatsApp'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppConnectionCard;
