import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Switch, TextField, Button, Grid, Alert, Chip, FormControlLabel, Checkbox, Stack, Divider } from '@mui/material';
import { WhatsApp, CheckCircle, Info, NotificationsActive, SmartToy, Send, Assessment } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { messagingApi, whatsappApi } from '../services/api';
import { useSubscription } from '../contexts/SubscriptionContext';

const defaultTemplate = 'Hola {customer_name}! Te recordamos tu turno para {service_name} el {date} a las {time}. Si no podés asistir, avisanos respondiendo este mensaje.';

const tokenHelp = '{customer_name}, {service_name}, {date}, {time}, {business_name}';

const MessagingSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [template, setTemplate] = useState(defaultTemplate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Respuesta automática por menú (línea del negocio) y avisos al WhatsApp del dueño
  const [autoReply, setAutoReply] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [notifyOnBooking, setNotifyOnBooking] = useState(false);
  const [dailyReport, setDailyReport] = useState(false);
  const [reportTime, setReportTime] = useState('08:30');
  const [lastReportOn, setLastReportOn] = useState<string | null>(null);
  const [savingOwner, setSavingOwner] = useState(false);
  const [testing, setTesting] = useState<'msg' | 'report' | null>(null);
  const [ownerMsg, setOwnerMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [lineConnected, setLineConnected] = useState<boolean | null>(null);
  const [lineUsage, setLineUsage] = useState<{ lastHour: number; last24h: number } | null>(null);

  const { subscription, hasFeature, isUnlimited } = useSubscription();
  const whatsAppIncluded = hasFeature('allowWhatsApp');
  const whatsAppLimit = subscription?.features?.whatsAppMonthlyLimit ?? 0;
  const isWhatsAppUnlimited = isUnlimited('whatsAppMonthlyLimit');

  const load = async () => {
    try {
      const s = await messagingApi.getSettings();
      setEnabled(!!s.whatsappRemindersEnabled);
      setMinutes(s.reminderAdvanceMinutes ?? 60);
      setTemplate(s.reminderTemplate || defaultTemplate);
      setAutoReply(!!s.autoReplyBotEnabled);
      setOwnerPhone(s.ownerNotifyPhone || '');
      setNotifyOnBooking(!!s.ownerNotifyOnBooking);
      setDailyReport(!!s.ownerDailyReportEnabled);
      setReportTime(s.ownerDailyReportTime || '08:30');
      setLastReportOn(s.ownerDailyReportLastSentOn || null);
    } catch (e: any) {
      setError('No se pudieron cargar los ajustes.');
    }
    try {
      const st = await whatsappApi.getStatus();
      setLineConnected(st?.status === 'open');
    } catch {
      setLineConnected(null);
    }
    try {
      setLineUsage(await messagingApi.getLineUsage());
    } catch {
      setLineUsage(null);
    }
  };

  useEffect(() => { load(); }, []);

  const saveOwner = async () => {
    setSavingOwner(true); setOwnerMsg(null);
    try {
      await messagingApi.updateSettings({
        whatsappRemindersEnabled: enabled,
        reminderAdvanceMinutes: minutes,
        reminderTemplate: template,
        autoReplyBotEnabled: autoReply,
        ownerNotifyPhone: ownerPhone,
        ownerNotifyOnBooking: notifyOnBooking,
        ownerDailyReportEnabled: dailyReport,
        ownerDailyReportTime: reportTime,
      });
      setOwnerMsg({ ok: true, text: 'Ajustes guardados' });
    } catch (e: any) {
      setOwnerMsg({ ok: false, text: e?.response?.data?.error || 'Error guardando ajustes' });
    } finally { setSavingOwner(false); }
  };

  const testOwner = async (report: boolean) => {
    setTesting(report ? 'report' : 'msg'); setOwnerMsg(null);
    try {
      // Se guarda primero para que la prueba use el número que está en pantalla
      await messagingApi.updateSettings({
        whatsappRemindersEnabled: enabled,
        reminderAdvanceMinutes: minutes,
        reminderTemplate: template,
        ownerNotifyPhone: ownerPhone,
      });
      const r = await messagingApi.ownerNotifyTest(report);
      setOwnerMsg({ ok: true, text: r?.message || 'Enviado' });
    } catch (e: any) {
      setOwnerMsg({ ok: false, text: e?.response?.data?.error || 'No se pudo enviar' });
    } finally { setTesting(null); }
  };

  const save = async () => {
    setSaving(true); setSaved(null); setError(null);
    try {
      await messagingApi.updateSettings({ whatsappRemindersEnabled: enabled, reminderAdvanceMinutes: minutes, reminderTemplate: template, autoReplyBotEnabled: autoReply });
      setSaved('Ajustes guardados');
    } catch (e: any) {
      setError('Error guardando ajustes');
    } finally { setSaving(false); }
  };

  const preview = () => {
    const now = new Date();
    const date = now.toLocaleDateString('es-AR');
    const time = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return template
      .replace('{customer_name}', 'Juan Pérez')
      .replace('{service_name}', 'Corte y Peinado')
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{business_name}', 'Mi Negocio');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Mensajería y Recordatorios</Typography>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>{saved}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WhatsApp color="success" />
                <Typography variant="h6">Recordatorios por WhatsApp</Typography>
              </Box>

              {/* Plan Info Alert */}
              <Alert
                severity={whatsAppIncluded ? "success" : "info"}
                icon={whatsAppIncluded ? <CheckCircle /> : <Info />}
                sx={{ mb: 2 }}
              >
                {whatsAppIncluded ? (
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      WhatsApp incluido en tu plan {subscription?.planName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={isWhatsAppUnlimited ? 'Mensajes ilimitados' : `${whatsAppLimit} mensajes/mes`}
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2">
                    WhatsApp no está incluido en tu plan actual. Actualiza tu suscripción para acceder a esta función.
                  </Typography>
                )}
              </Alert>

              <Box display="flex" alignItems="center" mt={2}>
                <Switch checked={enabled} onChange={(_, v) => setEnabled(v)} />
                <Typography>Habilitar</Typography>
              </Box>
              <TextField
                label="Minutos antes de la cita"
                type="number"
                value={minutes}
                onChange={e => setMinutes(parseInt(e.target.value || '0', 10))}
                fullWidth
                sx={{ mt: 2 }}
                inputProps={{ min: 5, step: 5 }}
              />
              <TextField
                label="Plantilla de mensaje"
                value={template}
                onChange={e => setTemplate(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                sx={{ mt: 2 }}
                helperText={`Tokens: ${tokenHelp}`}
              />
              <Box mt={2}>
                <Typography variant="subtitle2">Vista previa</Typography>
                <Card variant="outlined" sx={{ mt: 1 }}>
                  <CardContent>
                    <Typography variant="body2">{preview()}</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
                Guardar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            {/* Respuesta automática por menú */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SmartToy color="success" />
                  <Typography variant="h6">Respuesta automática</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Cuando un cliente le escribe a tu WhatsApp, el bot contesta con un menú: reservar
                  turno (link a tu página), ver sus próximos turnos o hablar con una persona. Si escribe
                  cualquier otra cosa manda el menú una sola vez y después no se mete en la charla.
                </Typography>
                {lineConnected === false && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    Tu WhatsApp no está conectado. <RouterLink to="/whatsapp">Conectalo acá</RouterLink> para que el bot pueda responder.
                  </Alert>
                )}
                <Box display="flex" alignItems="center" mt={1.5}>
                  <Switch checked={autoReply} onChange={(_, v) => setAutoReply(v)} />
                  <Typography>Responder automáticamente</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  ¿Querés que entienda lenguaje natural y reserve solo? Activá el <RouterLink to="/agente-ia">Agente IA</RouterLink>: cuando está activo tiene prioridad sobre el menú.
                </Typography>
                <Box>
                  <Button variant="outlined" size="small" sx={{ mt: 1.5 }} onClick={saveOwner} disabled={savingOwner}>
                    Guardar
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Avisos al dueño */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <NotificationsActive color="success" />
                  <Typography variant="h6">Avisos a tu WhatsApp</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Te avisamos a vos, no a tus clientes. Si tu WhatsApp está conectado, el aviso sale por
                  tu propia línea; si no, te llega desde la línea de Turnos Pro.
                </Typography>
                {ownerMsg && <Alert severity={ownerMsg.ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>{ownerMsg.text}</Alert>}
                <TextField
                  label="Número de WhatsApp para los avisos"
                  value={ownerPhone}
                  onChange={e => setOwnerPhone(e.target.value)}
                  fullWidth
                  sx={{ mt: 2 }}
                  placeholder="Ej: 11 5555 5555"
                  helperText="Si lo dejás vacío se usa el teléfono del dueño cargado en Configuración."
                />
                <Stack sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={<Checkbox checked={notifyOnBooking} onChange={(_, v) => setNotifyOnBooking(v)} />}
                    label="Avisarme cada turno nuevo (web, panel o Agente IA)"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={dailyReport} onChange={(_, v) => setDailyReport(v)} />}
                    label="Reporte diario: agenda de hoy, cierre de ayer y la semana"
                  />
                </Stack>
                <TextField
                  label="Hora del reporte"
                  type="time"
                  value={reportTime}
                  onChange={e => setReportTime(e.target.value)}
                  disabled={!dailyReport}
                  sx={{ mt: 1, width: 180 }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  helperText={lastReportOn ? `Último enviado: ${new Date(lastReportOn).toLocaleDateString('es-AR', { timeZone: 'UTC' })}` : ' '}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                  <Button variant="contained" onClick={saveOwner} disabled={savingOwner}>
                    Guardar
                  </Button>
                  <Button variant="outlined" startIcon={<Send />} onClick={() => testOwner(false)} disabled={testing !== null}>
                    {testing === 'msg' ? 'Enviando…' : 'Probar aviso'}
                  </Button>
                  <Button variant="outlined" startIcon={<Assessment />} onClick={() => testOwner(true)} disabled={testing !== null}>
                    {testing === 'report' ? 'Enviando…' : 'Enviarme el reporte de hoy'}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Freno anti-bloqueo */}
            {lineUsage && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2">Cuidado de tu número</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Los recordatorios y pedidos de confirmación salen espaciados y con tope por hora y por
                    día, como lo haría una persona: WhatsApp bloquea los números que mandan en ráfaga.
                    Las respuestas a clientes que te escriben salen siempre al instante.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Enviados por tu línea: <strong>{lineUsage.lastHour}</strong> en la última hora · <strong>{lineUsage.last24h}</strong> en las últimas 24 h
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagingSettings;

