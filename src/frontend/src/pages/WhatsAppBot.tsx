import React, { useCallback, useEffect, useState } from 'react';
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
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  WhatsApp,
  EventAvailable,
  Bolt,
  PhoneIphone,
  Chat,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { featureAddonsApi, menuBotApi, FeatureAddonStatus, MenuBotStatus } from '../services/api';

const ADDON_CODE = 'menu_bot';

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

// Burbujas estilo WhatsApp para la demo del paywall
const ChatBubble: React.FC<{ from: 'bot' | 'client'; children: React.ReactNode }> = ({ from, children }) => (
  <Box sx={{ display: 'flex', justifyContent: from === 'bot' ? 'flex-start' : 'flex-end', mb: 1 }}>
    <Box
      sx={{
        maxWidth: '85%', px: 1.5, py: 1, borderRadius: 2,
        borderTopLeftRadius: from === 'bot' ? 0.5 : 2,
        borderTopRightRadius: from === 'client' ? 0.5 : 2,
        bgcolor: from === 'bot' ? '#ffffff' : '#d9fdd3',
        boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#111b21' }}>{children}</Typography>
    </Box>
  </Box>
);

const BenefitItem: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(37, 211, 102, 0.12)', color: '#1faa53', flexShrink: 0 }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Box>
  </Box>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}22`, color, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const WhatsAppBot: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');

  const [loading, setLoading] = useState(true);
  const [addon, setAddon] = useState<FeatureAddonStatus | null>(null);
  const [status, setStatus] = useState<MenuBotStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Configuración editable
  const [enabled, setEnabled] = useState(false);
  const [cutoff, setCutoff] = useState(24);
  const [advance, setAdvance] = useState(60);
  const [days, setDays] = useState(7);
  const [infoText, setInfoText] = useState('');

  // Vista previa
  const [previewText, setPreviewText] = useState('Hola');
  const [previewReply, setPreviewReply] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const addons = await featureAddonsApi.list();
      setAddon(addons.find((a) => a.code === ADDON_CODE) || null);
      const s = await menuBotApi.status();
      setStatus(s);
      setEnabled(s.enabled);
      setCutoff(s.settings.cancellationCutoffHours);
      setAdvance(s.settings.minBookingAdvanceMinutes);
      setDays(s.settings.daysToOffer);
      setInfoText(s.settings.infoText ?? '');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo cargar el asistente de WhatsApp.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (paymentResult === 'success') setToast('¡Pago recibido! El asistente se activa en unos segundos, apenas Mercado Pago nos avisa.');
    else if (paymentResult === 'pending') setToast('Tu pago quedó pendiente en Mercado Pago. Cuando se acredite, el asistente se activa solo.');
    else if (paymentResult === 'failure') setToast('El pago no se completó. Podés intentarlo de nuevo cuando quieras.');
  }, [paymentResult]);

  const handleBuy = async () => {
    setPurchasing(true);
    try {
      const res = await featureAddonsApi.purchase(ADDON_CODE);
      if (res?.paymentLink) window.location.href = res.paymentLink;
      else setError('No se pudo generar el link de pago.');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo generar el link de pago.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleSave = async (next?: { enabled?: boolean }) => {
    setSaving(true);
    try {
      const res = await menuBotApi.updateSettings({
        enabled: next?.enabled ?? enabled,
        cancellationCutoffHours: cutoff,
        minBookingAdvanceMinutes: advance,
        daysToOffer: days,
        infoText,
      });
      setToast(res.message);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await menuBotApi.preview(previewText);
      setPreviewReply(res.reply ?? '(el bot no respondería a este mensaje)');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No se pudo probar el asistente.');
    } finally {
      setPreviewing(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const active = !!status?.addonActive;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Asistente de WhatsApp</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tus clientes reservan, consultan y cancelan turnos por WhatsApp respondiendo con números, 24/7, desde tu propio
        número y sin que nadie del negocio conteste. Lo que ofrece sale de tu agenda: si un horario está tomado, no lo muestra.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast(null)} message={toast} />

      {status && !status.whatsAppConnected && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate('/messaging')}>Conectar WhatsApp</Button>}>
          {status.blockedReason}
        </Alert>
      )}

      {!active ? (
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Tu WhatsApp contesta solo</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <BenefitItem icon={<EventAvailable />} title="Reserva de punta a punta" text="Servicio, profesional, día y hora. El turno entra a tu agenda como cualquier otro." />
                  <BenefitItem icon={<Bolt />} title="Con tu disponibilidad real" text="Sólo ofrece horarios libres. Si alguien reservó por otro lado, no lo muestra." />
                  <BenefitItem icon={<Schedule />} title="Cancelaciones con tus reglas" text="El cliente cancela solo hasta la anticipación que vos definas; el horario se libera al toque." />
                  <BenefitItem icon={<PhoneIphone />} title="Desde tu número, sin Meta" text="Se conecta escaneando un QR. Sin costo por mensaje ni cuentas de empresa." />
                </Box>

                <Card sx={{ mt: 3, bgcolor: '#efe7de' }}>
                  <CardContent>
                    <ChatBubble from="client">Hola</ChatBubble>
                    <ChatBubble from="bot">{'¡Hola! 👋 Soy el asistente.\n1️⃣ Reservar un turno\n2️⃣ Ver mis turnos\n3️⃣ Cancelar un turno\n4️⃣ Servicios y precios\n5️⃣ Hablar con el negocio'}</ChatBubble>
                    <ChatBubble from="client">1</ChatBubble>
                    <ChatBubble from="bot">{'💇 ¿Qué servicio querés?\n1) Corte · $12.000 · 45 min\n2) Color · $25.000 · 90 min'}</ChatBubble>
                    <ChatBubble from="client">1</ChatBubble>
                    <ChatBubble from="bot">{'🕐 Horarios libres el mar 23/09:\n1) 10:00   2) 11:30   3) 16:00'}</ChatBubble>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={800}>
                      {addon ? money(addon.monthlyPrice) : '—'} <Typography component="span" color="text.secondary">/ mes</Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Se paga por mes adelantado con Mercado Pago. Sin permanencia.
                    </Typography>
                    {addon?.hasPendingPurchase && <Alert severity="info" sx={{ mt: 2 }}>Tenés un pago pendiente de acreditar en Mercado Pago.</Alert>}
                    <Button variant="contained" fullWidth sx={{ mt: 2 }} startIcon={<WhatsApp />} disabled={purchasing || !addon} onClick={handleBuy}>
                      {purchasing ? 'Generando link…' : 'Activar con Mercado Pago'}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Después de pagar, conectás tu WhatsApp escaneando un QR y el asistente arranca.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip size="small" color="success" label={`Activo hasta ${addon?.paidUntil ? new Date(addon.paidUntil).toLocaleDateString('es-AR') : '—'}`} />
                <Chip size="small" color={status?.whatsAppConnected ? 'success' : 'warning'} label={status?.whatsAppConnected ? `WhatsApp conectado${status.connectedPhone ? ` · ${status.connectedPhone}` : ''}` : 'WhatsApp sin conectar'} />
                <Chip size="small" color={status?.active ? 'success' : 'default'} label={status?.active ? 'Contestando' : 'No está contestando'} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch checked={enabled} onChange={(e) => { setEnabled(e.target.checked); handleSave({ enabled: e.target.checked }); }} />
                  <Typography variant="body2">{enabled ? 'Asistente prendido' : 'Asistente apagado'}</Typography>
                </Box>
                <Button variant="text" onClick={handleBuy} disabled={purchasing}>Renovar</Button>
              </Box>
            </CardContent>
          </Card>

          {status && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}><StatCard icon={<Chat />} label="Conversaciones (30 d)" value={status.stats.conversations} color="#128c7e" /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={<WhatsApp />} label="Mensajes recibidos" value={status.stats.messages} color="#25d366" /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={<CheckCircle />} label="Turnos reservados" value={status.stats.bookingsCreated} color="#2e7d32" /></Grid>
              <Grid item xs={6} md={3}><StatCard icon={<EventAvailable />} label="Turnos cancelados" value={status.stats.bookingsCancelled} color="#ed6c02" /></Grid>
            </Grid>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>Cómo atiende</Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth label="Anticipación mínima para reservar" value={advance} onChange={(e) => setAdvance(Number(e.target.value))}>
                        <MenuItem value={0}>Sin mínimo</MenuItem>
                        <MenuItem value={30}>30 minutos</MenuItem>
                        <MenuItem value={60}>1 hora</MenuItem>
                        <MenuItem value={120}>2 horas</MenuItem>
                        <MenuItem value={240}>4 horas</MenuItem>
                        <MenuItem value={1440}>24 horas</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth label="Anticipación para cancelar" value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))}>
                        <MenuItem value={0}>Sin límite</MenuItem>
                        <MenuItem value={2}>2 horas</MenuItem>
                        <MenuItem value={4}>4 horas</MenuItem>
                        <MenuItem value={12}>12 horas</MenuItem>
                        <MenuItem value={24}>24 horas</MenuItem>
                        <MenuItem value={48}>48 horas</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth label="Días hacia adelante que ofrece" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                        {[3, 7, 14, 21, 30].map((d) => <MenuItem key={d} value={d}>{d} días</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth multiline minRows={2} label="Texto extra en «Servicios y precios» (opcional)"
                        placeholder="Estamos en Av. Siempreviva 742. Aceptamos transferencia y efectivo."
                        value={infoText} onChange={(e) => setInfoText(e.target.value)} />
                    </Grid>
                  </Grid>
                  <Button variant="contained" sx={{ mt: 2 }} disabled={saving} onClick={() => handleSave()}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>Probalo</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Escribí como si fueras un cliente. Esto no manda nada por WhatsApp.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField fullWidth size="small" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Hola" />
                    <Button variant="outlined" onClick={handlePreview} disabled={previewing}>{previewing ? '…' : 'Probar'}</Button>
                  </Box>
                  {previewReply && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#efe7de' }}>
                      <ChatBubble from="client">{previewText}</ChatBubble>
                      <ChatBubble from="bot">{previewReply}</ChatBubble>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {status && status.recent.length > 0 && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Últimas conversaciones</Typography>
                {status.recent.map((r) => (
                  <Box key={r.phone} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">{r.contactName || r.phone}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.lastMessageAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {r.bookingsCreated > 0 ? ` · ${r.bookingsCreated} turno(s)` : ''}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default WhatsAppBot;
