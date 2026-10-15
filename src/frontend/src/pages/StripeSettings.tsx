/**
 * /stripe-settings — cobro de señas con Stripe Connect (negocios de España, donde no hay Mercado Pago).
 * El negocio crea su cuenta Express de Stripe desde acá (onboarding alojado por Stripe) y las señas de la
 * reserva online se cobran con tarjeta directo en esa cuenta, en euros.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Typography,
} from '@mui/material';
import { ArrowBack, CheckCircle, Warning, Link as LinkIcon, OpenInNew, LinkOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ConnectStatus {
  available: boolean;
  connected: boolean;
  accountId?: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  email?: string | null;
}

const StripeSettings: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stripe/connect/status', { params: { refresh: true } });
      setStatus(res.data);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'No pudimos leer el estado de Stripe' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const back = params.get('stripe');
    if (back === 'return') setMessage({ type: 'info', text: 'Volviste de Stripe. Si completaste todos los datos, en unos segundos queda habilitado el cobro.' });
    if (back === 'refresh') setMessage({ type: 'info', text: 'El link de Stripe venció. Tocá "Continuar en Stripe" para seguir donde quedaste.' });
    if (back) {
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe');
      window.history.replaceState({}, '', url.toString());
    }
    load();
  }, []);

  const startOnboarding = async () => {
    setWorking(true);
    try {
      const res = await api.post('/stripe/connect/onboarding');
      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
      setMessage({ type: 'error', text: 'No pudimos abrir Stripe. Probá de nuevo.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'No pudimos abrir Stripe. Probá de nuevo.' });
    }
    setWorking(false);
  };

  const openDashboard = async () => {
    setWorking(true);
    try {
      const res = await api.post('/stripe/connect/dashboard');
      if (res.data?.url) window.open(res.data.url, '_blank', 'noopener');
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'No pudimos abrir el panel de Stripe.' });
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('¿Desvincular tu cuenta de Stripe? Las reservas online no van a poder cobrar seña hasta que la vuelvas a conectar.')) return;
    setWorking(true);
    try {
      await api.post('/stripe/connect/disconnect');
      setMessage({ type: 'success', text: 'Cuenta de Stripe desvinculada.' });
      await load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'No pudimos desvincular la cuenta.' });
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const ready = !!status?.connected && !!status?.chargesEnabled;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate('/dashboard')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Cobro de señas con Stripe
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {!status?.available ? (
        <Alert severity="info">El cobro de señas con Stripe todavía no está disponible para tu negocio. Escribinos y lo activamos.</Alert>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6">Tu cuenta de Stripe</Typography>
              <Chip
                icon={ready ? <CheckCircle /> : <Warning />}
                label={ready ? 'Cobrando señas' : status?.connected ? 'Falta completar datos' : 'Sin conectar'}
                color={ready ? 'success' : status?.connected ? 'warning' : 'default'}
              />
            </Box>

            {ready ? (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Tus clientes pagan la seña con tarjeta al reservar online y el dinero entra en tu cuenta de Stripe, en euros.
                  La reserva se confirma sola al acreditarse el pago.
                </Alert>
                {status?.email && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Cuenta:</strong> {status.email}
                  </Typography>
                )}
                {!status?.payoutsEnabled && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Stripe todavía no habilitó las transferencias a tu banco: revisá los datos pendientes en tu panel de Stripe.
                  </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<OpenInNew />} onClick={openDashboard} disabled={working}>
                    Abrir mi panel de Stripe
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<LinkOff />} onClick={disconnect} disabled={working}>
                    Desvincular
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Conectá una cuenta de Stripe para cobrar la seña de las reservas online con tarjeta. Stripe te pide los
                  datos del negocio y la cuenta bancaria donde querés recibir el dinero; lleva unos minutos.
                </Typography>
                <Button variant="contained" size="large" startIcon={<LinkIcon />} onClick={startOnboarding} disabled={working}>
                  {working ? 'Abriendo Stripe…' : status?.connected ? 'Continuar en Stripe' : 'Conectar con Stripe'}
                </Button>
                {status?.connected && (
                  <Button sx={{ ml: 2 }} color="error" onClick={disconnect} disabled={working}>
                    Desvincular
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        La seña de cada servicio se configura en Servicios (porcentaje o monto fijo y a qué clientes se les pide).
      </Alert>
    </Container>
  );
};

export default StripeSettings;
