import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  SmartToy,
  WhatsApp,
  CheckCircle,
  EventAvailable,
  EventBusy,
  HourglassEmpty,
  Send,
  Bolt,
  PersonOff,
  PhoneIphone,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { featureAddonsApi, messagingApi, whatsappApi, FeatureAddonStatus } from '../services/api';

const CONFIRMATION_BOT_CODE = 'confirmation_bot';

const defaultTemplate =
  'Hola {customer_name}! Te escribimos de {business_name} por tu turno de {service_name} el {date} a las {time}.';

const tokenHelp = '{customer_name}, {service_name}, {date}, {time}, {business_name}';

const botInstructions = 'Respondé *1* para confirmar tu turno ✅ o *2* para cancelarlo ❌';

// Burbujas estilo WhatsApp para la demo del paywall
const ChatBubble: React.FC<{ from: 'bot' | 'client'; children: React.ReactNode }> = ({ from, children }) => (
  <Box sx={{ display: 'flex', justifyContent: from === 'bot' ? 'flex-start' : 'flex-end', mb: 1 }}>
    <Box
      sx={{
        maxWidth: '85%',
        px: 1.5,
        py: 1,
        borderRadius: 2,
        borderTopLeftRadius: from === 'bot' ? 0.5 : 2,
        borderTopRightRadius: from === 'client' ? 0.5 : 2,
        bgcolor: from === 'bot' ? '#ffffff' : '#d9fdd3',
        boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#111b21' }}>
        {children}
      </Typography>
    </Box>
  </Box>
);

const BenefitItem: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(37, 211, 102, 0.12)',
        color: '#1faa53',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Box>
  </Box>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; sub?: string; color: string }> = ({
  icon, label, value, sub, color,
}) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center',
        justifyContent: 'center', bgcolor: `${color}22`, color, flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}{sub ? ` · ${sub}` : ''}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const ConfirmationBot: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const [loading, setLoading] = useState(true);
  const [addon, setAddon] = useState<FeatureAddonStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Settings
  const [enabled, setEnabled] = useState(false);
  const [advanceValue, setAdvanceValue] = useState(24);
  const [advanceUnit, setAdvanceUnit] = useState<'hours' | 'minutes'>('hours');
  const [template, setTemplate] = useState(defaultTemplate);
  const [saving, setSaving] = useState(false);

  // Estado de conexión de WhatsApp y stats
  const [whatsappOpen, setWhatsappOpen] = useState<boolean | null>(null);
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const addons = await featureAddonsApi.list();
      const bot = addons.find(a => a.code === CONFIRMATION_BOT_CODE) || null;
      setAddon(bot);

      const s = await messagingApi.getSettings();
      setEnabled(!!s.confirmationBotEnabled);
      const minutes = s.confirmationAdvanceMinutes ?? 1440;
      if (minutes % 60 === 0) {
        setAdvanceValue(minutes / 60);
        setAdvanceUnit('hours');
      } else {
        setAdvanceValue(minutes);
        setAdvanceUnit('minutes');
      }
      setTemplate(s.confirmationTemplate || defaultTemplate);

      if (bot?.active) {
        try {
          const [status, botStats] = await Promise.all([
            whatsappApi.getStatus(),
            messagingApi.getConfirmationBotStats(),
          ]);
          setWhatsappOpen(status?.status === 'open');
          setStats(botStats);
        } catch {
          // stats/status secundarios: no bloquear la pantalla
        }
      }
    } catch {
      setError('No se pudo cargar la información del bot.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePurchase = async () => {
    setPurchasing(true);
    setError(null);
    try {
      const result = await featureAddonsApi.purchase(CONFIRMATION_BOT_CODE);
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

  const save = async () => {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const minutes = advanceUnit === 'hours' ? advanceValue * 60 : advanceValue;
      // El PUT de settings comparte payload con los recordatorios: mandamos también
      // los valores actuales de recordatorios para no pisarlos.
      const current = await messagingApi.getSettings();
      await messagingApi.updateSettings({
        whatsappRemindersEnabled: !!current.whatsappRemindersEnabled,
        reminderAdvanceMinutes: current.reminderAdvanceMinutes ?? 60,
        reminderTemplate: current.reminderTemplate,
        confirmationBotEnabled: enabled,
        confirmationAdvanceMinutes: minutes,
        confirmationTemplate: template,
      });
      setSaved('Configuración guardada');
    } catch (e: any) {
      if (e?.response?.status === 402) {
        setError('El bot requiere el add-on activo. Activalo con MercadoPago.');
      } else {
        setError('Error guardando la configuración.');
      }
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => {
    const now = new Date();
    const date = now.toLocaleDateString('es-AR');
    const time = '15:30';
    return (
      template
        .replace('{customer_name}', 'Juan')
        .replace('{service_name}', 'Corte y Peinado')
        .replace('{date}', date)
        .replace('{time}', time)
        .replace('{business_name}', 'Mi Negocio') +
      '\n\n' + botInstructions.replace(/\*/g, '')
    );
  }, [template]);

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
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <CardContent sx={{ py: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <SmartToy sx={{ fontSize: 36 }} />
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Bot de Confirmación de Turnos
            </Typography>
            <Chip label="NUEVO" size="small" sx={{ bgcolor: '#ffd54f', color: '#5d4000', fontWeight: 700 }} />
            {addon?.active && (
              <Chip icon={<CheckCircle sx={{ '&&': { color: '#0b3d2e' } }} />} label="Activo" size="small"
                sx={{ bgcolor: '#d9fdd3', color: '#0b3d2e', fontWeight: 700 }} />
            )}
          </Box>
          <Typography variant="body1" sx={{ maxWidth: 640, opacity: 0.95 }}>
            Tu asistente automático por WhatsApp: le pide a cada cliente que confirme su turno antes de
            la cita y, si no puede venir, lo cancela solo y te libera el horario. Todo desde tu propio número.
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
          ¡Pago recibido! Si el bot todavía figura inactivo, la acreditación puede demorar unos segundos — refrescá la página.
        </Alert>
      )}
      {paymentResult === 'pending' && (
        <Alert severity="info" sx={{ mb: 2 }}>Tu pago está pendiente de acreditación. El bot se activa automáticamente al aprobarse.</Alert>
      )}
      {paymentResult === 'failure' && (
        <Alert severity="warning" sx={{ mb: 2 }}>El pago no se completó. Podés intentarlo de nuevo cuando quieras.</Alert>
      )}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>{saved}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!addon?.active ? (
        /* ---------- Paywall / venta ---------- */
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  ¿Qué hace por tu negocio?
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                  <BenefitItem
                    icon={<PersonOff />}
                    title="Menos ausencias"
                    text="Los clientes que no van a venir cancelan con un mensaje, y vos recuperás ese horario para otro cliente."
                  />
                  <BenefitItem
                    icon={<Bolt />}
                    title="Responde solo, al instante"
                    text="El bot entiende la respuesta del cliente y confirma o cancela el turno en tu agenda automáticamente."
                  />
                  <BenefitItem
                    icon={<PhoneIphone />}
                    title="Desde tu propio número"
                    text="Los mensajes salen del WhatsApp de tu negocio (el que escaneaste), no de un número desconocido."
                  />
                  <BenefitItem
                    icon={<EventAvailable />}
                    title="Configurable a tu medida"
                    text="Elegís con cuántas horas de anticipación pedir la confirmación y personalizás el mensaje."
                  />
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h5" fontWeight={800} color="success.main">
                      {priceLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Se activa automáticamente al acreditarse el pago. Sin permanencia.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={purchasing ? <CircularProgress size={18} color="inherit" /> : <WhatsApp />}
                    onClick={handlePurchase}
                    disabled={purchasing || !addon}
                  >
                    Activar con MercadoPago
                  </Button>
                </Box>
                {addon?.hasPendingPurchase && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Tenés un pago pendiente. Al acreditarse, el bot se activa solo.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: '#efeae2', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: '#111b21' }}>
                  Así se ve en el WhatsApp de tu cliente:
                </Typography>
                <ChatBubble from="bot">
                  {'Hola Juan! Te escribimos de Mi Negocio por tu turno de Corte y Peinado el viernes a las 15:30.\n\nRespondé 1 para confirmar tu turno ✅ o 2 para cancelarlo ❌'}
                </ChatBubble>
                <ChatBubble from="client">1</ChatBubble>
                <ChatBubble from="bot">
                  ¡Gracias Juan! Tu turno del viernes a las 15:30 quedó confirmado. Te esperamos 😊
                </ChatBubble>
                <Alert icon={<CheckCircle fontSize="inherit" />} severity="success" sx={{ mt: 2 }}>
                  El turno queda confirmado en tu agenda, sin que muevas un dedo.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        /* ---------- Activo: configuración + stats ---------- */
        <Grid container spacing={3}>
          {whatsappOpen === false && (
            <Grid item xs={12}>
              <Alert
                severity="warning"
                action={
                  <Button color="inherit" size="small" onClick={() => navigate('/whatsapp')}>
                    Conectar
                  </Button>
                }
              >
                Tu WhatsApp no está conectado: el bot no puede enviar mensajes hasta que escanees el QR.
              </Alert>
            </Grid>
          )}

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SmartToy color="success" />
                  <Typography variant="h6">Configuración del bot</Typography>
                </Box>

                <Box display="flex" alignItems="center">
                  <Switch checked={enabled} onChange={(_, v) => setEnabled(v)} color="success" />
                  <Typography>{enabled ? 'Bot activado' : 'Bot desactivado'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <TextField
                    label="Pedir confirmación"
                    type="number"
                    value={advanceValue}
                    onChange={e => setAdvanceValue(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    sx={{ flex: 1 }}
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    select
                    label="Unidad"
                    value={advanceUnit}
                    onChange={e => setAdvanceUnit(e.target.value as 'hours' | 'minutes')}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="hours">horas antes</MenuItem>
                    <MenuItem value="minutes">minutos antes</MenuItem>
                  </TextField>
                </Box>

                <TextField
                  label="Mensaje de confirmación"
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mt: 2 }}
                  helperText={`Tokens: ${tokenHelp}. Las instrucciones de respuesta (1/2) se agregan solas al final.`}
                />

                <Box mt={2}>
                  <Typography variant="subtitle2">Vista previa</Typography>
                  <Card variant="outlined" sx={{ mt: 1, bgcolor: '#efeae2' }}>
                    <CardContent>
                      <ChatBubble from="bot">{preview}</ChatBubble>
                    </CardContent>
                  </Card>
                </Box>

                <Button variant="contained" color="success" sx={{ mt: 2 }} onClick={save} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <StatCard icon={<Send />} label="Enviados" sub="últ. 30 días" value={stats?.sentLast30Days ?? 0} color="#128c7e" />
              </Grid>
              <Grid item xs={6}>
                <StatCard icon={<EventAvailable />} label="Confirmados" sub="últ. 30 días" value={stats?.confirmedLast30Days ?? 0} color="#2e7d32" />
              </Grid>
              <Grid item xs={6}>
                <StatCard icon={<EventBusy />} label="Cancelados" sub="últ. 30 días" value={stats?.cancelledLast30Days ?? 0} color="#c62828" />
              </Grid>
              <Grid item xs={6}>
                <StatCard icon={<HourglassEmpty />} label="Sin respuesta" sub="total" value={stats?.noResponse ?? 0} color="#ef6c00" />
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Renovación
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {addon?.paidUntil
                        ? `Tu bot está pago hasta el ${new Date(addon.paidUntil).toLocaleDateString('es-AR')}. Podés extenderlo un mes más cuando quieras.`
                        : 'Extendé la vigencia del bot un mes más.'}
                    </Typography>
                    <Button variant="outlined" color="success" onClick={handlePurchase} disabled={purchasing}>
                      {purchasing ? 'Generando pago…' : `Extender 1 mes (${priceLabel})`}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ConfirmationBot;
