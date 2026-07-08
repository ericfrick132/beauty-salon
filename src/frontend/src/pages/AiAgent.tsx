import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import {
  SmartToy,
  CheckCircle,
  EventAvailable,
  QueryStats,
  WhatsApp,
  AccessTime,
  InfoOutlined,
} from '@mui/icons-material';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { featureAddonsApi, whatsappApi, FeatureAddonStatus } from '../services/api';

const AI_AGENT_CODE = 'ai_agent';

const Benefit: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box sx={{ color: '#128c7e', mt: 0.3 }}>{icon}</Box>
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Box>
  </Box>
);

const Bubble: React.FC<{ from: 'client' | 'bot'; children: React.ReactNode }> = ({ from, children }) => (
  <Box
    sx={{
      alignSelf: from === 'client' ? 'flex-end' : 'flex-start',
      maxWidth: '85%',
      bgcolor: from === 'client' ? '#d9fdd3' : '#fff',
      color: '#111b21',
      borderRadius: 2,
      px: 1.5,
      py: 0.9,
      boxShadow: '0 1px 1px rgba(0,0,0,0.13)',
      fontSize: 14,
      lineHeight: 1.4,
      whiteSpace: 'pre-line',
    }}
  >
    {children}
  </Box>
);

const AiAgent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const [loading, setLoading] = useState(true);
  const [addon, setAddon] = useState<FeatureAddonStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const addons = await featureAddonsApi.list();
      const found = addons.find(a => a.code === AI_AGENT_CODE) || null;
      setAddon(found);
      try {
        const status = await whatsappApi.getStatus();
        setWhatsappOpen(status?.status === 'open');
      } catch {
        /* estado secundario, no bloquea */
      }
    } catch {
      setError('No se pudo cargar la información del Agente IA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePurchase = async () => {
    setPurchasing(true);
    setError(null);
    try {
      const result = await featureAddonsApi.purchase(AI_AGENT_CODE);
      if (result?.paymentLink) {
        window.location.href = result.paymentLink;
      } else {
        setError('No se pudo generar el link de pago.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error generando el pago.');
    } finally {
      setPurchasing(false);
    }
  };

  const priceLabel = addon
    ? `$${Math.round(addon.monthlyPrice).toLocaleString('es-AR')} ${addon.currency}/mes`
    : '';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Hero */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #075e54 0%, #128c7e 55%, #25d366 100%)',
          color: '#fff',
        }}
      >
        <CardContent sx={{ py: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <SmartToy sx={{ fontSize: 36 }} />
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Agente IA de WhatsApp
            </Typography>
            <Chip label="NUEVO" size="small" sx={{ bgcolor: '#ffd54f', color: '#5d4000', fontWeight: 700 }} />
            {addon?.active && (
              <Chip icon={<CheckCircle sx={{ '&&': { color: '#0b3d2e' } }} />} label="Activo" size="small"
                sx={{ bgcolor: '#d9fdd3', color: '#0b3d2e', fontWeight: 700 }} />
            )}
          </Box>
          <Typography variant="body1" sx={{ maxWidth: 680, opacity: 0.95 }}>
            Un asistente con inteligencia artificial que atiende a tus clientes por WhatsApp desde tu propio número:
            responde qué servicios ofrecés, precios y horarios disponibles, y <strong>reserva los turnos solo</strong>,
            las 24 horas. Vos te dedicás a atender; el agente llena tu agenda.
          </Typography>
          {addon?.active && addon.paidUntil && (
            <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.9 }}>
              Vigente hasta el {new Date(addon.paidUntil).toLocaleDateString('es-AR')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {paymentResult === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ¡Pago recibido! Si el agente todavía figura inactivo, la acreditación puede demorar unos segundos — refrescá la página.
        </Alert>
      )}
      {paymentResult === 'pending' && (
        <Alert severity="info" sx={{ mb: 2 }}>Tu pago está pendiente de acreditación. El agente se activa automáticamente al aprobarse.</Alert>
      )}
      {paymentResult === 'failure' && (
        <Alert severity="error" sx={{ mb: 2 }}>El pago no se completó. Podés intentar de nuevo.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {whatsappOpen === false && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" component={RouterLink} to="/whatsapp">Conectar WhatsApp</Button>}
        >
          <strong>Primero conectá tu WhatsApp.</strong> El agente atiende desde tu propio número: hasta que no lo vincules
          (escaneás un QR), recibe los mensajes pero no puede responder.
        </Alert>
      )}

      <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 3 }}>
        <strong>¿En qué se diferencia del Bot de Confirmación?</strong> El bot de confirmación solo pide
        “1 = confirmo / 2 = cancelo” antes de cada turno ya agendado. El <strong>Agente IA</strong> conversa de verdad:
        responde precios y disponibilidad y <strong>reserva turnos nuevos</strong> por su cuenta. Podés tener los dos.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Qué hace por vos</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Benefit icon={<EventAvailable />} title="Reserva turnos solo"
                  text="El cliente escribe por WhatsApp y el agente le muestra horarios libres y crea la reserva en tu agenda, sin que vos toques nada." />
                <Benefit icon={<QueryStats />} title="Responde precios y disponibilidad"
                  text="Contesta al instante qué servicios ofrecés, cuánto salen y con qué profesional y horario hay lugar." />
                <Benefit icon={<AccessTime />} title="Atiende 24/7"
                  text="No perdés más turnos por no contestar a tiempo: el agente responde de día, de noche y los fines de semana." />
                <Benefit icon={<WhatsApp />} title="Desde tu propio número"
                  text="Usa la conexión de WhatsApp de tu negocio. Tus clientes te escriben a vos, como siempre." />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="overline" color="text.secondary">Suscripción mensual</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>{priceLabel}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Se cobra por Mercado Pago. Cancelás cuando quieras.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {addon?.active ? (
                <>
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                    El Agente IA está activo.
                  </Alert>
                  {whatsappOpen === false && (
                    <Alert
                      severity="warning"
                      action={<Button color="inherit" size="small" component={RouterLink} to="/whatsapp">Conectar</Button>}
                    >
                      Falta conectar tu WhatsApp para que el agente atienda.
                    </Alert>
                  )}
                  {whatsappOpen === true && (
                    <Typography variant="body2" color="text.secondary">
                      WhatsApp conectado. Ya está atendiendo a tus clientes.
                    </Typography>
                  )}
                </>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={purchasing}
                  onClick={handlePurchase}
                  startIcon={purchasing ? <CircularProgress size={18} color="inherit" /> : <SmartToy />}
                  sx={{ bgcolor: '#128c7e', '&:hover': { bgcolor: '#075e54' } }}
                >
                  {purchasing ? 'Generando pago…' : 'Activar Agente IA'}
                </Button>
              )}

              {addon?.hasPendingPurchase && !addon?.active && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Tenés un pago pendiente de acreditación.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>Así atiende a tus clientes</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ejemplo de una reserva por WhatsApp, de principio a fin:
          </Typography>
          <Box sx={{ bgcolor: '#efeae2', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 560 }}>
            <Bubble from="client">Hola! quería sacar un turno</Bubble>
            <Bubble from="bot">{'¡Hola! 👋 ¿Qué servicio te interesa?\n1️⃣ Corte de pelo — $8.000\n2️⃣ Color — $15.000'}</Bubble>
            <Bubble from="client">corte, mañana a la tarde</Bubble>
            <Bubble from="bot">{'Mañana (jue 09/07) hay lugar:\n1️⃣ 15:00   2️⃣ 16:00   3️⃣ 17:00\n¿Cuál te conviene?'}</Bubble>
            <Bubble from="client">16hs, a nombre de Eric</Bubble>
            <Bubble from="bot">Te confirmo: Corte, jueves 09/07 a las 16:00, a nombre de Eric. ¿Va? ✅</Bubble>
            <Bubble from="client">sí, dale</Bubble>
            <Bubble from="bot">¡Listo Eric! Tu turno quedó reservado 🎉 Te esperamos.</Bubble>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AiAgent;
