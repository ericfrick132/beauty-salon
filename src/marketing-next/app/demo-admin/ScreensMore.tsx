'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  AccountBalance,
  Add,
  AttachMoney,
  AutoAwesome,
  CalendarToday,
  CheckCircle,
  CreditCard,
  EventAvailable,
  EventBusy,
  HourglassEmpty,
  LocalAtm,
  PersonOff,
  PhoneIphone,
  QueryStats,
  Receipt,
  SmartToy,
  WhatsApp,
} from '@mui/icons-material';
import { mono, ui } from './adminTheme';
import {
  BOT_STATS,
  BUSINESS,
  DAYS,
  METHOD_LABEL,
  PAST_WEEKS_NOSHOW,
  PROS,
  SERVICES,
  addDays,
  addMinutes,
  atTime,
  daysBetween,
  fmtShort,
  fmtTime,
  fullName,
  money,
  proById,
  sameDay,
  serviceById,
  type Booking,
  type PayMethod,
  type Service,
} from './data';
import type { Demo } from './types';
import { BarList, Bars, Kpi, PageTitle, Section, StatusChip, WhatsAppPhone, type ChatMsg } from './ui';

const nowTime = () => fmtTime(new Date());

/* ───────────────────────────── SERVICIOS ───────────────────────────── */

export function ServicesScreen({ demo }: { demo: Demo }) {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const categories = Array.from(new Set(services.map((s) => s.category)));

  const toggleDeposit = (s: Service) => {
    const deposit = s.deposit > 0 ? 0 : Math.round((s.price * 0.3) / 1000) * 1000;
    setServices((list) => list.map((x) => (x.id === s.id ? { ...x, deposit } : x)));
    demo.toast(deposit
      ? `Desde ahora, reservar «${s.name}» pide una seña de ${money(deposit)} con MercadoPago.`
      : `«${s.name}» ya no pide seña al reservar.`);
  };

  return (
    <>
      <PageTitle
        title="Servicios"
        subtitle="Lo que tus clientes ven y reservan desde tu link. Con seña, el turno se confirma recién cuando pagan."
        actions={<Button variant="contained" startIcon={<Add />} onClick={() => demo.locked('Nuevo servicio')}>Nuevo servicio</Button>}
      />
      {categories.map((cat) => (
        <Box key={cat} sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: ui.textMute, mb: 1.5 }}>{cat}</Typography>
          <Grid container spacing={2}>
            {services.filter((s) => s.category === cat).map((s) => (
              <Grid item xs={12} sm={6} lg={4} key={s.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: ui.text }}>{s.name}</Typography>
                      {s.popular && <Chip size="small" label="Popular" sx={{ bgcolor: '#EFF6FF', color: ui.primary, fontWeight: 600 }} />}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, color: ui.textMute, fontSize: 14 }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><AccessTime sx={{ fontSize: 16 }} />{s.duration} min</Box>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: ui.text, fontWeight: 600 }}>{money(s.price)}</Box>
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${ui.line}` }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Pide seña</Typography>
                        <Typography variant="caption" sx={{ color: ui.textMute }}>
                          {s.deposit > 0 ? `${money(s.deposit)} por MercadoPago` : 'Reserva sin pago previo'}
                        </Typography>
                      </Box>
                      <Switch checked={s.deposit > 0} onChange={() => toggleDeposit(s)} inputProps={{ 'aria-label': `Pide seña ${s.name}` }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </>
  );
}

/* ───────────────────────────── PAGOS ───────────────────────────── */

const METHOD_ICON: Record<PayMethod, JSX.Element> = {
  cash: <LocalAtm fontSize="small" />,
  card: <CreditCard fontSize="small" />,
  transfer: <AccountBalance fontSize="small" />,
  mercadopago: <Receipt fontSize="small" />,
};

export function PaymentsScreen({ demo }: { demo: Demo }) {
  const { bookings, customers, today } = demo;
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [dialog, setDialog] = useState(false);

  const paidToday = bookings.filter((b) => b.paid && sameDay(b.start, today));
  const byMethod = (m: PayMethod) => paidToday.filter((b) => b.method === m).reduce((a, b) => a + serviceById(b.serviceId).price, 0);
  const totalToday = paidToday.reduce((a, b) => a + serviceById(b.serviceId).price, 0);
  const pending = bookings.filter((b) => b.status === 'completed' && !b.paid);
  const recent = bookings
    .filter((b) => b.start.getTime() <= Date.now() && (b.paid || b.status === 'completed'))
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  const rows = (filter === 'pending' ? pending : recent).slice(0, 20);
  const name = (b: Booking) => { const c = customers.find((x) => x.id === b.customerId); return c ? fullName(c) : 'Cliente'; };

  return (
    <>
      <PageTitle
        title="Pagos y Facturación"
        subtitle="Efectivo, tarjeta, transferencia y MercadoPago en un solo lugar."
        actions={<Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>Registrar Pago</Button>}
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}><Kpi icon={<AttachMoney />} title="Total del Día" value={money(totalToday)} color={ui.primary} /></Grid>
        {(['cash', 'card', 'transfer', 'mercadopago'] as PayMethod[]).map((m) => (
          <Grid item xs={6} md={2} key={m}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ color: ui.primary, mb: 1 }}>{METHOD_ICON[m]}</Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.15rem' }}>{money(byMethod(m))}</Typography>
                <Typography variant="caption" sx={{ color: ui.textMute }}>{METHOD_LABEL[m]}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Movimientos</Typography>
          <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
            <ToggleButton value="all">Todos</ToggleButton>
            <ToggleButton value="pending">Ver pendientes ({pending.length})</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Servicio</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Método de Pago</TableCell>
                <TableCell align="right">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontFamily: mono, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtShort(b.start)} {fmtTime(b.start)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{name(b)}</TableCell>
                  <TableCell>{serviceById(b.serviceId).name}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{money(serviceById(b.serviceId).price)}</TableCell>
                  <TableCell>
                    {b.method ? <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>{METHOD_ICON[b.method]}{METHOD_LABEL[b.method]}</Box> : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {b.paid ? (
                      <Chip size="small" icon={<CheckCircle sx={{ fontSize: 16 }} />} label="Pagado" color="success" />
                    ) : (
                      <Button size="small" variant="outlined" onClick={() => demo.registerPayment(b.id, 'cash')}>Cobrar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: ui.textMute, py: 4 }}>No hay pagos pendientes. 🎉</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {dialog && <PaymentDialog demo={demo} pending={pending} name={name} onClose={() => setDialog(false)} />}
    </>
  );
}

function PaymentDialog({ demo, pending, name, onClose }: { demo: Demo; pending: Booking[]; name: (b: Booking) => string; onClose: () => void }) {
  const [bookingId, setBookingId] = useState<number | ''>(pending[0]?.id ?? '');
  const [method, setMethod] = useState<PayMethod>('cash');
  const booking = pending.find((b) => b.id === bookingId);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Registrar Pago</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pending.length === 0 ? (
          <Typography sx={{ color: ui.textMute }}>No quedan turnos sin cobrar.</Typography>
        ) : (
          <>
            <TextField select label="Turno" value={bookingId} onChange={(e) => setBookingId(Number(e.target.value))}>
              {pending.map((b) => <MenuItem key={b.id} value={b.id}>{fmtShort(b.start)} · {name(b)} · {serviceById(b.serviceId).name}</MenuItem>)}
            </TextField>
            <TextField select label="Método de Pago" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => <MenuItem key={m} value={m}>{METHOD_LABEL[m]}</MenuItem>)}
            </TextField>
            {booking && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: '#F9FAFB', border: `1px solid ${ui.line}` }}>
                <Typography variant="body2">Monto</Typography>
                <Typography sx={{ fontWeight: 700 }}>{money(serviceById(booking.serviceId).price)}</Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!booking} onClick={() => { if (booking) demo.registerPayment(booking.id, method); onClose(); }}>Registrar Pago</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ───────────────────────────── REPORTES ───────────────────────────── */

export function ReportsScreen({ demo }: { demo: Demo }) {
  const { bookings, today } = demo;
  const past = bookings.filter((b) => b.start.getTime() <= Date.now());
  const completed = past.filter((b) => b.status === 'completed');
  const revenue = completed.reduce((a, b) => a + serviceById(b.serviceId).price, 0);
  const noShows = past.filter((b) => b.status === 'no_show').length;
  const noShowRate = past.length ? Math.round((noShows / past.length) * 100) : 0;

  const daily = Array.from({ length: 8 }, (_, i) => addDays(today, i - 7)).filter((d) => d.getDay() !== 0).map((d) => ({
    label: fmtShort(d),
    value: completed.filter((b) => sameDay(b.start, d)).reduce((a, b) => a + serviceById(b.serviceId).price, 0),
    highlight: sameDay(d, today),
  }));
  const byPro = PROS.map((p) => ({ label: p.name, value: completed.filter((b) => b.proId === p.id).length, color: p.color }));
  const byService = SERVICES.map((s) => ({ label: s.name, value: completed.filter((b) => b.serviceId === s.id).reduce((a, b) => a + serviceById(b.serviceId).price, 0) }))
    .filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageTitle
        title="Reportes"
        subtitle="Últimos 8 días. En tu cuenta elegís el período y exportás a Excel."
        actions={<Button variant="outlined" onClick={() => demo.locked('Exportar a Excel')}>Exportar</Button>}
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><Kpi icon={<CalendarToday />} title="Turnos atendidos" value={completed.length} change="+9%" color={ui.primary} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Kpi icon={<AttachMoney />} title="Facturación" value={money(revenue)} change="+12%" color={ui.accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Kpi icon={<QueryStats />} title="Ticket promedio" value={money(revenue / Math.max(1, completed.length))} color={ui.secondary} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Kpi icon={<PersonOff />} title={`Ausentismo (era ${PAST_WEEKS_NOSHOW.before}% sin el bot)`} value={`${noShowRate}%`} change={`-${PAST_WEEKS_NOSHOW.before - noShowRate} pts`} color={ui.success} /></Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}><Section title="Ingresos por día"><Bars data={daily} format={money} label="Ingresos por día" /></Section></Grid>
        <Grid item xs={12} md={5}><Section title="Turnos por profesional"><BarList rows={byPro} format={(n) => `${n} turnos`} /></Section></Grid>
        <Grid item xs={12}><Section title="Facturación por servicio"><BarList rows={byService} format={money} /></Section></Grid>
      </Grid>
    </>
  );
}

/* ─────────────────────────── BOT DE CONFIRMACIÓN ─────────────────────────── */

const DEFAULT_TEMPLATE = '¡Hola {nombre}! 👋 Te escribimos de {negocio} para confirmar tu turno de {servicio} el {dia} a las {hora}.\n\nRespondé SI para confirmar o NO si no podés venir.';

export function BotScreen({ demo }: { demo: Demo }) {
  const { bookings, customers, botEnabled, setBotEnabled, today } = demo;
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [hours, setHours] = useState('24');
  const [sampleIdx, setSampleIdx] = useState(0);
  const [reply, setReply] = useState<'si' | 'no' | null>(null);

  const candidates = useMemo(
    () => bookings.filter((b) => b.start > today && (b.status === 'pending' || b.status === 'confirmed')).slice(0, 8),
    // Los candidatos se fijan al entrar: si se confirman desde acá no deben cambiar de lugar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const sample = candidates[sampleIdx % Math.max(1, candidates.length)];
  const customer = sample ? customers.find((c) => c.id === sample.customerId) : undefined;
  const dayLabel = sample ? (daysBetween(today, sample.start) === 1 ? 'mañana' : `${DAYS[sample.start.getDay()]} ${fmtShort(sample.start)}`) : '';
  const first = customer?.firstName ?? 'Juan';
  const fill = (text: string, key: string, value: string) => text.split(`{${key}}`).join(value);
  const bizMsg = [
    ['nombre', first],
    ['negocio', BUSINESS],
    ['servicio', sample ? serviceById(sample.serviceId).name.toLowerCase() : 'corte'],
    ['dia', dayLabel],
    ['hora', sample ? fmtTime(sample.start) : '15:30'],
  ].reduce((text, [k, v]) => fill(text, k, v), template);

  const messages: ChatMsg[] = [{ from: 'business', text: bizMsg, time: nowTime() }];
  if (reply === 'si') {
    messages.push({ from: 'client', text: 'Si', time: nowTime() });
    messages.push({ from: 'business', text: `¡Gracias ${first}! Tu turno del ${dayLabel} a las ${sample ? fmtTime(sample.start) : ''} quedó confirmado. Te esperamos 😊`, time: nowTime() });
  } else if (reply === 'no') {
    messages.push({ from: 'client', text: 'No voy a poder, perdón', time: nowTime() });
    messages.push({ from: 'business', text: `Listo ${first}, cancelamos tu turno del ${dayLabel} a las ${sample ? fmtTime(sample.start) : ''}. ¡Te esperamos la próxima! 🙌`, time: nowTime() });
  }

  const answer = (r: 'si' | 'no') => {
    setReply(r);
    if (!sample) return;
    if (r === 'si') {
      demo.updateBooking(sample.id, { status: 'confirmed', viaBot: true });
      demo.toast(`${first} confirmó por WhatsApp. El turno ya figura confirmado en tu agenda.`);
    } else {
      demo.updateBooking(sample.id, { status: 'cancelled' });
      demo.toast(`${first} canceló. El horario de las ${fmtTime(sample.start)} se liberó y ya se puede reservar.`);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <SmartToy sx={{ color: ui.whatsapp, fontSize: 34 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.6rem' } }}>Bot de Confirmación de Turnos</Typography>
        <Chip label="NUEVO" size="small" sx={{ bgcolor: '#ffd54f', color: '#5d4000', fontWeight: 700 }} />
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Activo</Typography>
          <Switch checked={botEnabled} onChange={(e) => { setBotEnabled(e.target.checked); demo.toast(e.target.checked ? 'Bot activado: le escribe solo a cada cliente antes de su turno.' : 'Bot pausado.'); }} color="success" />
        </Box>
      </Box>
      <Typography sx={{ color: ui.textMute, mb: 3, maxWidth: 760 }}>
        Cada turno que no se confirma es plata que podés perder. El bot le escribe solo a cada cliente por WhatsApp, y según lo que responda confirma o libera el horario.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip icon={<WhatsApp />} label={`Enviados ${BOT_STATS.sent}`} sx={{ bgcolor: '#E0F2F1', color: ui.whatsappDeep, fontWeight: 600, height: 32 }} />
        <Chip icon={<EventAvailable />} label={`Confirmados ${BOT_STATS.confirmed}`} sx={{ bgcolor: '#E8F5E9', color: '#1B5E20', fontWeight: 600, height: 32 }} />
        <Chip icon={<EventBusy />} label={`Cancelados ${BOT_STATS.cancelled}`} sx={{ bgcolor: '#FFEBEE', color: '#B71C1C', fontWeight: 600, height: 32 }} />
        <Chip icon={<HourglassEmpty />} label={`Sin respuesta ${BOT_STATS.noAnswer}`} sx={{ bgcolor: '#F3F4F6', color: ui.textSoft, fontWeight: 600, height: 32 }} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Section title="Configuración del bot">
            <TextField select fullWidth label="Pedir confirmación" value={hours} onChange={(e) => { setHours(e.target.value); demo.toast(`Listo: el bot escribe ${e.target.value} hs antes de cada turno.`); }} sx={{ mb: 2 }}>
              {['48', '24', '12', '3'].map((h) => <MenuItem key={h} value={h}>{h} horas antes del turno</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Mensaje de confirmación"
              value={template}
              onChange={(e) => { setTemplate(e.target.value); setReply(null); }}
              helperText="Usá {nombre}, {servicio}, {dia} y {hora}. La vista previa se actualiza sola."
            />
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5 }}>¿Qué hace por tu negocio?</Typography>
            {[
              [<CheckCircle key="a" sx={{ color: ui.success }} />, 'El turno queda confirmado en tu agenda, sin que muevas un dedo.'],
              [<EventBusy key="b" sx={{ color: ui.error }} />, 'El horario se libera solo y queda disponible para otro cliente.'],
              [<PhoneIphone key="c" sx={{ color: ui.whatsapp }} />, 'Desde tu propio número: tus clientes ven tu negocio, no un número raro.'],
            ].map(([icon, text], i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.25, alignItems: 'flex-start' }}>
                {icon}
                <Typography variant="body2" sx={{ color: ui.textSoft }}>{text}</Typography>
              </Box>
            ))}
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Vista previa">
            <Typography variant="body2" sx={{ color: ui.textMute, mb: 2 }}>Así se ve en el WhatsApp de tu cliente. Respondé como si fueras {first}:</Typography>
            <WhatsAppPhone
              name={BUSINESS}
              messages={messages}
              footer={reply ? (
                <Button fullWidth onClick={() => { setReply(null); setSampleIdx((i) => i + 1); }}>Probar con otro turno</Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button fullWidth variant="contained" onClick={() => answer('si')} sx={{ bgcolor: '#25d366', '&:hover': { bgcolor: '#1ebe5b' } }}>Responder SI</Button>
                  <Button fullWidth variant="outlined" onClick={() => answer('no')} sx={{ bgcolor: '#fff' }}>Responder NO</Button>
                </Box>
              )}
            />
            {sample && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: ui.textMute }}>En tu agenda:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtShort(sample.start)} {fmtTime(sample.start)} · {proById(sample.proId).name.split(' ')[0]}</Typography>
                <StatusChip status={bookings.find((b) => b.id === sample.id)?.status ?? sample.status} />
                <Button size="small" onClick={() => demo.go('calendar')}>Ver agenda</Button>
              </Box>
            )}
          </Section>
        </Grid>
      </Grid>
    </>
  );
}

/* ─────────────────────────── AGENTE IA ─────────────────────────── */

type Step = 'start' | 'service' | 'slot' | 'confirm' | 'done';

export function AgentScreen({ demo }: { demo: Demo }) {
  const { today, bookings, customers } = demo;
  const client = customers[5];
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [step, setStep] = useState<Step>('start');
  const [service, setService] = useState<Service | null>(null);
  const [slot, setSlot] = useState<{ start: Date; proId: string } | null>(null);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [messages, typing]);

  const nextDay = (() => { let d = addDays(today, 1); if (d.getDay() === 0) d = addDays(d, 1); return d; })();

  const freeSlots = (s: Service) => {
    const pro = s.category === 'Barbería' ? 'matias' : s.category === 'Color' ? 'lucia' : 'sofia';
    const taken = bookings.filter((b) => b.proId === pro && sameDay(b.start, nextDay) && b.status !== 'cancelled');
    const close = nextDay.getDay() === 6 ? 15 : 20;
    const out: Date[] = [];
    for (let t = atTime(nextDay, 9); addMinutes(t, s.duration).getHours() + addMinutes(t, s.duration).getMinutes() / 60 <= close; t = addMinutes(t, 30)) {
      const end = addMinutes(t, s.duration);
      if (!taken.some((b) => t < addMinutes(b.start, serviceById(b.serviceId).duration) && end > b.start)) out.push(t);
    }
    const picks = [out[0], out[Math.floor(out.length / 2)], out[out.length - 1]].filter(Boolean);
    return { pro, times: Array.from(new Set(picks.map((d) => d.getTime()))).map((n) => new Date(n)) };
  };

  const say = (text: string, bot: string | string[], next: Step) => {
    setMessages((m) => [...m, { from: 'client', text, time: nowTime() }]);
    setTyping(true);
    const replies = Array.isArray(bot) ? bot : [bot];
    replies.forEach((r, i) => {
      window.setTimeout(() => {
        setMessages((m) => [...m, { from: 'business', text: r, time: nowTime() }]);
        if (i === replies.length - 1) { setTyping(false); setStep(next); }
      }, 900 + i * 1100);
    });
  };

  const dayName = daysBetween(today, nextDay) === 1 ? 'mañana' : DAYS[nextDay.getDay()];
  const reset = () => { setMessages([]); setStep('start'); setService(null); setSlot(null); };

  let options: Array<{ label: string; onClick: () => void }> = [];
  if (!typing) {
    if (step === 'start') {
      options = [
        { label: 'Hola! quería sacar un turno', onClick: () => say('Hola! quería sacar un turno', `¡Hola ${client.firstName}! 👋 Soy el asistente de ${BUSINESS}. ¿Qué te querés hacer?`, 'service') },
        { label: '¿Cuánto sale el corte?', onClick: () => say('¿Cuánto sale el corte?', `El corte de pelo sale ${money(14000)} y dura 45 min. Corte + barba, ${money(18000)}. ¿Te reservo uno? 😊`, 'service') },
      ];
    } else if (step === 'service') {
      options = SERVICES.filter((s) => ['corte', 'corte-barba', 'color'].includes(s.id)).map((s) => ({
        label: s.name,
        onClick: () => {
          const { pro, times } = freeSlots(s);
          if (!times.length) {
            say(s.name, `Uh, ${dayName} ya está completo para ${s.name.toLowerCase()}. ¿Querés que te anote en lista de espera?`, 'start');
            return;
          }
          setService(s);
          setSlot({ start: times[0], proId: pro });
          say(s.name, `Genial. Para ${s.name.toLowerCase()} tengo lugar ${dayName} con ${proById(pro).name.split(' ')[0]}: ${times.map(fmtTime).join(', ')}. ¿Cuál te queda mejor?`, 'slot');
        },
      }));
    } else if (step === 'slot' && service && slot) {
      options = freeSlots(service).times.map((t) => ({
        label: fmtTime(t),
        onClick: () => {
          setSlot({ start: t, proId: slot.proId });
          say(fmtTime(t), `Te confirmo: ${service.name}, ${DAYS[t.getDay()]} ${fmtShort(t)} a las ${fmtTime(t)}, a nombre de ${client.firstName}. ¿Va? ✅`, 'confirm');
        },
      }));
    } else if (step === 'confirm' && service && slot) {
      options = [
        {
          label: 'Sí, dale',
          onClick: () => {
            const replies = service.deposit > 0
              ? [`Para dejarlo reservado se abona una seña de ${money(service.deposit)} acá: mpago.la/2Tn8qR. Apenas se acredita, queda confirmado.`, `¡Listo ${client.firstName}! Tu turno quedó reservado 🎉 Te esperamos.`]
              : [`¡Listo ${client.firstName}! Tu turno quedó reservado 🎉 Te esperamos.`];
            say('Sí, dale', replies, 'done');
            window.setTimeout(() => {
              demo.addBooking({ customerId: client.id, serviceId: service.id, proId: slot.proId, start: slot.start, status: 'confirmed', depositPaid: service.deposit > 0, paid: false, viaAgent: true });
              demo.toast(`El Agente IA agendó a ${client.firstName}: ${service.name}, ${fmtShort(slot.start)} ${fmtTime(slot.start)}. Ya está en tu agenda.`);
            }, 900 + (replies.length - 1) * 1100);
          },
        },
        { label: 'Mejor otro horario', onClick: () => say('Mejor otro horario', `Sin problema. Tengo estos: ${freeSlots(service).times.map(fmtTime).join(', ')}.`, 'slot') },
      ];
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <AutoAwesome sx={{ color: '#7C3AED', fontSize: 32 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.6rem' } }}>Agente IA de WhatsApp</Typography>
        <Chip label="NUEVO" size="small" sx={{ bgcolor: '#ffd54f', color: '#5d4000', fontWeight: 700 }} />
        <Chip label="Activo" size="small" color="success" />
      </Box>
      <Typography sx={{ color: ui.textMute, mb: 3, maxWidth: 760 }}>
        Atiende tu WhatsApp las 24 horas: responde precios y disponibilidad, y reserva el turno directo en tu agenda.
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Section title="Qué hace por vos">
            {[
              [<AccessTime key="a" />, 'Atiende 24/7', 'Los mensajes de las 23 hs también se convierten en turnos.'],
              [<QueryStats key="b" />, 'Responde precios y disponibilidad', 'Con tus servicios, duraciones y horarios reales.'],
              [<CalendarToday key="c" />, 'Reserva turnos solo', 'Elige profesional y horario libre, y cobra la seña si hace falta.'],
              [<WhatsApp key="d" />, 'Desde tu propio número', 'Tus clientes siguen hablando con tu negocio.'],
            ].map(([icon, title, sub], i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#F5F3FF', color: '#7C3AED', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
                  <Typography variant="body2" sx={{ color: ui.textMute }}>{sub}</Typography>
                </Box>
              </Box>
            ))}
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F9FAFB', border: `1px solid ${ui.line}` }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>¿En qué se diferencia del Bot de Confirmación?</Typography>
              <Typography variant="body2" sx={{ color: ui.textMute }}>El bot confirma los turnos que ya tenés. El agente conversa y consigue turnos nuevos.</Typography>
            </Box>
          </Section>
        </Grid>
        <Grid item xs={12} md={7}>
          <Section title="Así atiende a tus clientes" action={messages.length > 0 ? <Button size="small" onClick={reset}>Reiniciar</Button> : undefined}>
            <Typography variant="body2" sx={{ color: ui.textMute, mb: 2 }}>Escribile como si fueras {client.firstName}, tocando las respuestas:</Typography>
            <Box ref={scroller} sx={{ maxHeight: 460, overflowY: 'auto', borderRadius: '22px' }}>
              <WhatsAppPhone
                name={BUSINESS}
                messages={typing ? [...messages, { from: 'business', text: 'escribiendo…', time: '' }] : messages}
                footer={
                  step === 'done' && !typing ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button fullWidth variant="contained" startIcon={<CalendarToday />} onClick={() => demo.go('calendar')}>Ver en la agenda</Button>
                      <Button fullWidth variant="outlined" onClick={reset} sx={{ bgcolor: '#fff' }}>Otra conversación</Button>
                    </Box>
                  ) : options.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {options.map((o) => (
                        <Chip key={o.label} label={o.label} onClick={o.onClick} sx={{ bgcolor: '#fff', border: `1px solid ${ui.border}`, height: 32, '&:hover': { bgcolor: '#E7F8EE' } }} />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: ui.textMute }}>El agente está respondiendo…</Typography>
                  )
                }
              />
            </Box>
          </Section>
        </Grid>
      </Grid>
    </>
  );
}
