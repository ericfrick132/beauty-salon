'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  Add,
  AttachMoney,
  AutoAwesome,
  CalendarToday,
  ChevronLeft,
  ChevronRight,
  ContentCopy,
  EventAvailable,
  History,
  OpenInNew,
  People,
  PhoneIphone,
  Search,
  SmartToy,
  Today,
  TrendingUp,
  ViewDay,
  ViewModule,
  ViewWeek,
  Warning,
  WhatsApp,
} from '@mui/icons-material';
import { mono, ui } from './adminTheme';
import {
  BOT_STATS,
  BUSINESS,
  DAYS_SHORT,
  METHOD_LABEL,
  PROS,
  SERVICES,
  STATUS_COLOR,
  SUBDOMAIN,
  addDays,
  addMinutes,
  atTime,
  daysBetween,
  fmtDate,
  fmtShort,
  fmtTime,
  fullName,
  initials,
  longDate,
  money,
  proById,
  sameDay,
  serviceById,
  startOfDay,
  type Booking,
  type Customer,
  type PayMethod,
} from './data';
import type { Demo } from './types';
import { BarList, Bars, Kpi, PageTitle, Section, StatusChip } from './ui';

const customerOf = (demo: Demo, b: Booking) => demo.customers.find((c) => c.id === b.customerId);

/* ───────────────────────────── INICIO ───────────────────────────── */

export function DashboardScreen({ demo }: { demo: Demo }) {
  const { today, bookings, go } = demo;
  const [copied, setCopied] = useState(false);
  const todays = bookings.filter((b) => sameDay(b.start, today) && b.status !== 'cancelled');
  const yesterday = bookings.filter((b) => sameDay(b.start, addDays(today, -1)) && b.status !== 'cancelled');
  const todayRevenue = todays.filter((b) => b.paid).reduce((a, b) => a + serviceById(b.serviceId).price, 0);
  const unpaid = bookings.filter((b) => b.status === 'completed' && !b.paid);
  const lastWeek = bookings.filter((b) => daysBetween(b.start, today) >= 0 && daysBetween(b.start, today) < 8 && b.status === 'completed');
  const monthRevenue = Math.round((lastWeek.reduce((a, b) => a + serviceById(b.serviceId).price, 0) * 3.75) / 1000) * 1000;
  const expenses = Math.round((monthRevenue * 0.38) / 1000) * 1000;
  const bookingChange = yesterday.length ? Math.round(((todays.length - yesterday.length) / yesterday.length) * 100) : 0;

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({
    label: DAYS_SHORT[d.getDay()],
    value: bookings.filter((b) => sameDay(b.start, d) && b.paid).reduce((a, b) => a + serviceById(b.serviceId).price, 0),
    highlight: sameDay(d, today),
  }));

  const byService = SERVICES.map((s) => ({ label: s.name, value: lastWeek.filter((b) => b.serviceId === s.id).length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const shareUrl = `https://${SUBDOMAIN}.turnos-pro.com/book`;

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: ui.text, fontSize: { xs: '1.45rem', md: '1.9rem' } }}>
          ¡Bienvenido de vuelta, {BUSINESS}!
        </Typography>
        <Typography variant="body1" sx={{ color: ui.textMute }}>
          Aquí está el resumen de tu negocio para hoy, {longDate(today)}
        </Typography>
      </Box>

      <Card sx={{ mb: 3, borderColor: '#F4C038', bgcolor: '#FFFBEB' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 2, '&:last-child': { pb: 2 } }}>
          <Typography sx={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#92400E', mr: 1 }}>Probá esto</Typography>
          <Chip icon={<CalendarToday sx={{ fontSize: 16 }} />} label="Agendá un turno" onClick={() => go('calendar')} sx={{ bgcolor: '#fff', border: `1px solid ${ui.line}` }} />
          <Chip icon={<SmartToy sx={{ fontSize: 16 }} />} label="El bot confirma por WhatsApp" onClick={() => go('bot')} sx={{ bgcolor: '#fff', border: `1px solid ${ui.line}` }} />
          <Chip icon={<AutoAwesome sx={{ fontSize: 16 }} />} label="Pedile un turno al Agente IA" onClick={() => go('agent')} sx={{ bgcolor: '#fff', border: `1px solid ${ui.line}` }} />
          <Chip icon={<PhoneIphone sx={{ fontSize: 16 }} />} label="Reservá como cliente" component="a" href="/demo-app" clickable sx={{ bgcolor: '#fff', border: `1px solid ${ui.line}` }} />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1, color: ui.text }}>Comparte este enlace con tus clientes para reservar</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ p: 1.5, px: 2, flex: 1, minWidth: { xs: '100%', sm: 280 }, border: `1px solid ${ui.border}`, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{shareUrl}</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<ContentCopy />}
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl).catch(() => {});
                setCopied(true);
                demo.toast('Link copiado. En tu cuenta es tu propio subdominio.');
                window.setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="outlined" startIcon={<OpenInNew />} href="/demo-app">Abrir</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, cursor: 'pointer' }} onClick={() => go('bot')}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <SmartToy sx={{ color: ui.whatsapp }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: ui.text, flex: 1, minWidth: 180 }}>Bot de Confirmación</Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box><Typography variant="h6" sx={{ fontWeight: 700, color: ui.whatsapp }}>{BOT_STATS.sent}</Typography><Typography variant="caption" sx={{ color: ui.textMute }}>enviados (30d)</Typography></Box>
            <Box><Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>{BOT_STATS.confirmed}</Typography><Typography variant="caption" sx={{ color: ui.textMute }}>confirmados</Typography></Box>
            <Box><Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{BOT_STATS.cancelled}</Typography><Typography variant="caption" sx={{ color: ui.textMute }}>cancelados</Typography></Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Kpi icon={<CalendarToday />} title="Turnos Hoy" value={todays.length} change={`${bookingChange >= 0 ? '+' : ''}${bookingChange}%`} color={ui.primary} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Kpi icon={<AttachMoney />} title="Ingresos del Día" value={money(todayRevenue)} change="+12%" color={ui.accent} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Kpi icon={<People />} title="Clientes Nuevos" value={4} change="+4" color={ui.secondary} />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccountBalance sx={{ color: ui.primary, mr: 2 }} />
            <Typography variant="h6" component="h2">Resumen Financiero del Mes</Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" sx={{ color: ui.textMute }} gutterBottom>Facturación Total</Typography>
              <Typography variant="h5" sx={{ color: ui.primary, fontWeight: 600 }}>{money(monthRevenue)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" sx={{ color: ui.textMute }} gutterBottom>Gastos (Sueldos + Comisiones)</Typography>
              <Typography variant="h5" sx={{ color: ui.error, fontWeight: 600 }}>-{money(expenses)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" sx={{ color: ui.textMute }} gutterBottom>Ganancia Neta</Typography>
              <Typography variant="h5" sx={{ color: ui.success, fontWeight: 600 }}>{money(monthRevenue - expenses)}</Typography>
              <Chip size="small" icon={<TrendingUp />} label="62.0% margen" color="success" sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" sx={{ color: ui.textMute }} gutterBottom>Crecimiento vs Mes Anterior</Typography>
              <Typography variant="h5" sx={{ color: ui.success, fontWeight: 600 }}>+12.4%</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {unpaid.length > 0 && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: '#fff', border: 'none', boxShadow: '0 8px 25px rgba(255,152,0,0.3)' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Warning sx={{ fontSize: 30 }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>⚠️ Reservas Pendientes de Pago</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Hay {unpaid.length} reserva{unpaid.length !== 1 ? 's' : ''} sin pago registrado
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => go('payments')} sx={{ bgcolor: '#fff', color: '#E65100', '&:hover': { bgcolor: '#FFF3E0' } }}>
              Registrar pagos
            </Button>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Section title="Ingresos de la Semana">
            <Bars data={week} format={money} label="Ingresos de la semana" />
          </Section>
        </Grid>
        <Grid item xs={12} md={5}>
          <Section title="Distribución de Servicios">
            <BarList rows={byService} format={(n) => `${n} turnos`} />
          </Section>
        </Grid>
        <Grid item xs={12} md={7}>
          <Section title="Agenda de Hoy" action={<Button size="small" onClick={() => go('calendar')}>Ver agenda</Button>}>
            {todays.length === 0 ? (
              <Typography sx={{ color: ui.textMute }}>Hoy no hay turnos. Tu sitio de reservas sigue abierto 24/7.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {todays.slice(0, 7).map((b) => {
                  const c = customerOf(demo, b);
                  return (
                    <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: `1px solid ${ui.line}`, '&:last-child': { borderBottom: 0 } }}>
                      <Typography sx={{ fontFamily: mono, fontWeight: 600, width: 48, flexShrink: 0 }}>{fmtTime(b.start)}</Typography>
                      <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: 2, bgcolor: STATUS_COLOR[b.status], flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: ui.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c ? fullName(c) : 'Cliente'}</Typography>
                        <Typography variant="body2" sx={{ color: ui.textMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {serviceById(b.serviceId).name} · {proById(b.proId).name.split(' ')[0]}
                        </Typography>
                      </Box>
                      <StatusChip status={b.status} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Section>
        </Grid>
        <Grid item xs={12} md={5}>
          <Section title="Actividad Reciente">
            <RecentActivity demo={demo} />
          </Section>
        </Grid>
      </Grid>
    </>
  );
}

function RecentActivity({ demo }: { demo: Demo }) {
  const { bookings, customers, today } = demo;
  const items = useMemo(() => {
    const upcoming = bookings.filter((b) => b.start > today && b.status !== 'cancelled').slice(0, 12);
    const name = (b: Booking) => customers.find((c) => c.id === b.customerId)?.firstName ?? 'Cliente';
    const list = [
      upcoming[0] && { icon: <SmartToy fontSize="small" />, color: ui.whatsapp, title: `${name(upcoming[0])} confirmó por WhatsApp`, sub: `${serviceById(upcoming[0].serviceId).name} · ${fmtShort(upcoming[0].start)} ${fmtTime(upcoming[0].start)}`, time: 'Ahora mismo' },
      upcoming[1] && { icon: <EventAvailable fontSize="small" />, color: ui.primary, title: 'Cliente nuevo - reserva', sub: `${name(upcoming[1])} reservó desde tu link`, time: 'Hace 1 hora' },
      upcoming[2] && { icon: <AttachMoney fontSize="small" />, color: ui.success, title: 'Seña acreditada', sub: `${money(12000)} por MercadoPago · ${name(upcoming[2])}`, time: 'Hace 2 horas' },
      upcoming[3] && { icon: <AutoAwesome fontSize="small" />, color: '#7C3AED', title: 'El Agente IA agendó un turno', sub: `${name(upcoming[3])} · ${serviceById(upcoming[3].serviceId).name}`, time: 'Hace 3 horas' },
      upcoming[4] && { icon: <WhatsApp fontSize="small" />, color: '#c62828', title: 'Reserva cancelada', sub: `${name(upcoming[4])} avisó por WhatsApp · el horario se liberó`, time: 'Ayer' },
    ].filter(Boolean) as Array<{ icon: JSX.Element; color: string; title: string; sub: string; time: string }>;
    return list;
  }, [bookings, customers, today]);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 1.25, borderBottom: `1px solid ${ui.line}`, '&:last-child': { borderBottom: 0 } }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: `${it.color}18`, color: it.color }}>{it.icon}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: ui.text }}>{it.title}</Typography>
            <Typography variant="caption" sx={{ color: ui.textMute, display: 'block' }}>{it.sub}</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: ui.textMute, whiteSpace: 'nowrap' }}>{it.time}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/* ───────────────────────────── AGENDA ───────────────────────────── */

const OPEN_H = 9;
const CLOSE_H = 20;
const HOUR_H = 56;

export function CalendarScreen({ demo }: { demo: Demo }) {
  const { today, bookings, isMobile } = demo;
  const [view, setView] = useState<'week' | 'day'>(isMobile ? 'day' : 'week');
  const [cursor, setCursor] = useState(() => startOfDay(today.getDay() === 0 ? addDays(today, 1) : today));
  const [proFilter, setProFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [newAnchor, setNewAnchor] = useState<HTMLElement | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (isMobile) setView('day'); }, [isMobile]);

  const monday = addDays(cursor, -((cursor.getDay() + 6) % 7));
  const days = view === 'week' ? Array.from({ length: 6 }, (_, i) => addDays(monday, i)) : [cursor];
  const columns = view === 'day'
    ? PROS.filter((p) => proFilter === 'all' || p.id === proFilter).map((p) => ({ key: p.id, title: p.name.split(' ')[0], sub: p.role, day: cursor, proId: p.id }))
    : days.map((d) => ({ key: d.toISOString(), title: `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`, sub: '', day: d, proId: proFilter === 'all' ? null : proFilter }));

  const current = selected ? bookings.find((b) => b.id === selected.id) ?? null : null;
  const title = view === 'week'
    ? `${fmtShort(days[0])} – ${fmtShort(days[days.length - 1])}`
    : `${DAYS_SHORT[cursor.getDay()]} ${fmtDate(cursor)}`;

  const step = (dir: number) => {
    let next = addDays(cursor, dir * (view === 'week' ? 7 : 1));
    if (view === 'day' && next.getDay() === 0) next = addDays(next, dir);
    setCursor(startOfDay(next));
  };

  const nowTop = ((today.getHours() + today.getMinutes() / 60) - OPEN_H) * HOUR_H;

  return (
    <Box>
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 600, minWidth: 180 }}>Calendario de Turnos</Typography>
          <ButtonGroup size="small">
            <IconButton size="small" onClick={() => step(-1)} aria-label="Anterior"><ChevronLeft /></IconButton>
            <Button size="small" startIcon={<Today />} onClick={() => setCursor(startOfDay(today))}>Hoy</Button>
            <IconButton size="small" onClick={() => step(1)} aria-label="Siguiente"><ChevronRight /></IconButton>
          </ButtonGroup>
          <ButtonGroup size="small">
            <Button variant="outlined" startIcon={<ViewModule />} onClick={() => demo.toast('La vista mensual está en tu cuenta real.', { cta: true })} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Mes</Button>
            <Button variant={view === 'week' ? 'contained' : 'outlined'} startIcon={<ViewWeek />} onClick={() => setView('week')} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Semana</Button>
            <Button variant={view === 'day' ? 'contained' : 'outlined'} startIcon={<ViewDay />} onClick={() => setView('day')}>Día</Button>
          </ButtonGroup>
        </Box>
      </Card>

      <Card sx={{ p: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography sx={{ fontWeight: 600, mr: 1 }}>{title}</Typography>
          {[{ id: 'all', name: 'Todos' }, ...PROS].map((p) => (
            <Chip
              key={p.id}
              label={p.id === 'all' ? 'Todos' : p.name.split(' ')[0]}
              onClick={() => setProFilter(p.id)}
              variant={proFilter === p.id ? 'filled' : 'outlined'}
              sx={proFilter === p.id ? { bgcolor: ui.primary, color: '#fff' } : { borderColor: ui.border }}
            />
          ))}
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<Add />} onClick={(e) => setNewAnchor(e.currentTarget)}>Nuevo</Button>
          <Menu anchorEl={newAnchor} open={!!newAnchor} onClose={() => setNewAnchor(null)}>
            <MenuItem onClick={() => { setNewAnchor(null); setCreating(true); }}>Nueva Reserva</MenuItem>
            <MenuItem onClick={() => { setNewAnchor(null); demo.locked('Bloquear horario'); }}>Bloquear horario</MenuItem>
          </Menu>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
          {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
            <Box key={s} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: ui.textMute }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: STATUS_COLOR[s] }} />
              {s === 'pending' ? 'Pendiente' : s === 'confirmed' ? 'Confirmado' : s === 'completed' ? 'Completado' : 'Cancelado'}
            </Box>
          ))}
        </Box>

        {view === 'day' && (
          <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 1 }}>
            {Array.from({ length: 12 }, (_, i) => addDays(today, i)).filter((d) => d.getDay() !== 0).map((d) => {
              const active = sameDay(d, cursor);
              return (
                <Box
                  key={d.toISOString()}
                  component="button"
                  type="button"
                  onClick={() => setCursor(startOfDay(d))}
                  sx={{ flexShrink: 0, width: 52, py: 0.75, borderRadius: 2, border: `1px solid ${active ? ui.primary : ui.line}`, bgcolor: active ? ui.primary : '#fff', color: active ? '#fff' : ui.text, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Box sx={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.8 }}>{DAYS_SHORT[d.getDay()]}</Box>
                  <Box sx={{ fontWeight: 700, fontSize: 16 }}>{d.getDate()}</Box>
                </Box>
              );
            })}
          </Box>
        )}

        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: view === 'week' ? 760 : 0 }}>
            <Box sx={{ display: 'flex', borderBottom: `1px solid ${ui.line}` }}>
              <Box sx={{ width: 44, flexShrink: 0 }} />
              {columns.map((col) => (
                <Box key={col.key} sx={{ flex: 1, minWidth: 0, textAlign: 'center', py: 1, fontWeight: 600, fontSize: 13, color: sameDay(col.day, today) && view === 'week' ? ui.primary : ui.text }}>
                  {col.title}
                  {col.sub && <Box sx={{ fontSize: 11, color: ui.textMute, fontWeight: 400 }}>{col.sub}</Box>}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', position: 'relative' }}>
              <Box sx={{ width: 44, flexShrink: 0 }}>
                {Array.from({ length: CLOSE_H - OPEN_H }, (_, i) => (
                  <Box key={i} sx={{ height: HOUR_H, fontSize: 11, color: ui.textMute, pr: 1, textAlign: 'right', transform: 'translateY(-7px)' }}>{`${OPEN_H + i}:00`}</Box>
                ))}
              </Box>
              {columns.map((col) => {
                const colBookings = bookings.filter((b) =>
                  sameDay(b.start, col.day) && (col.proId ? b.proId === col.proId : true));
                const isToday = sameDay(col.day, today);
                return (
                  <Box key={col.key} sx={{ flex: 1, minWidth: 0, position: 'relative', borderLeft: `1px solid ${ui.line}`, bgcolor: isToday && view === 'week' ? '#EFF6FF66' : 'transparent', height: (CLOSE_H - OPEN_H) * HOUR_H }}>
                    {Array.from({ length: CLOSE_H - OPEN_H }, (_, i) => (
                      <Box key={i} sx={{ position: 'absolute', left: 0, right: 0, top: i * HOUR_H, borderTop: `1px solid ${ui.line}` }} />
                    ))}
                    {isToday && nowTop > 0 && nowTop < (CLOSE_H - OPEN_H) * HOUR_H && (
                      <Box sx={{ position: 'absolute', left: 0, right: 0, top: nowTop, borderTop: `2px solid ${ui.error}`, zIndex: 2 }} />
                    )}
                    {colBookings.map((b) => {
                      const s = serviceById(b.serviceId);
                      const top = ((b.start.getHours() + b.start.getMinutes() / 60) - OPEN_H) * HOUR_H;
                      const height = Math.max(22, (s.duration / 60) * HOUR_H - 2);
                      const lane = view === 'week' && !col.proId ? PROS.findIndex((p) => p.id === b.proId) : 0;
                      const lanes = view === 'week' && !col.proId ? PROS.length : 1;
                      const c = customerOf(demo, b);
                      return (
                        <Box
                          key={b.id}
                          component="button"
                          type="button"
                          onClick={() => setSelected(b)}
                          title={`${fmtTime(b.start)} ${c ? fullName(c) : ''} · ${s.name}`}
                          sx={{
                            position: 'absolute', top, height,
                            left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`,
                            bgcolor: STATUS_COLOR[b.status], opacity: b.status === 'cancelled' ? 0.55 : 1,
                            color: '#fff', border: 0, borderRadius: '6px', p: '2px 5px', textAlign: 'left', overflow: 'hidden', cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 11, lineHeight: 1.25, zIndex: 1,
                            textDecoration: b.status === 'cancelled' ? 'line-through' : 'none',
                            '&:hover': { filter: 'brightness(0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 3 },
                          }}
                        >
                          <Box sx={{ fontWeight: 700 }}>{fmtTime(b.start)}</Box>
                          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c?.firstName}</Box>
                          {lanes === 1 && height > 44 && <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.9 }}>{s.name}</Box>}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Card>

      <Fab color="primary" aria-label="nueva cita" onClick={() => setCreating(true)} sx={{ position: 'fixed', right: 24, bottom: { xs: 190, md: 156 }, zIndex: 1140 }}>
        <Add />
      </Fab>

      {current && <BookingDialog demo={demo} booking={current} onClose={() => setSelected(null)} />}
      {creating && <NewBookingDialog demo={demo} initialDay={cursor} onClose={() => setCreating(false)} onCreated={(b) => { setCursor(startOfDay(b.start)); }} />}
    </Box>
  );
}

function BookingDialog({ demo, booking, onClose }: { demo: Demo; booking: Booking; onClose: () => void }) {
  const [payAnchor, setPayAnchor] = useState<HTMLElement | null>(null);
  const s = serviceById(booking.serviceId);
  const p = proById(booking.proId);
  const c = customerOf(demo, booking);
  const rows: Array<[string, string]> = [
    ['Cliente', c ? fullName(c) : '—'],
    ['Teléfono', c?.phone ?? '—'],
    ['Servicio', `${s.name} · ${s.duration} min`],
    ['Profesional', p.name],
    ['Fecha y hora', `${longDate(booking.start)} · ${fmtTime(booking.start)} a ${fmtTime(addMinutes(booking.start, s.duration))}`],
    ['Precio', money(s.price)],
  ];
  if (s.deposit > 0) rows.push(['Seña', booking.depositPaid ? `${money(s.deposit)} pagada por MercadoPago` : `${money(s.deposit)} pendiente`]);
  if (booking.paid && booking.method) rows.push(['Pago', `Cobrado · ${METHOD_LABEL[booking.method]}`]);

  const act = (patch: Partial<Booking>, msg: string) => { demo.updateBooking(booking.id, patch); demo.toast(msg); onClose(); };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 2 }}>
        <Box sx={{ flex: 1 }}>Detalles de la Cita</Box>
        <StatusChip status={booking.status} />
      </DialogTitle>
      <DialogContent dividers>
        {booking.viaBot && booking.status === 'confirmed' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, mb: 2, borderRadius: 2, bgcolor: '#E8F5E9', color: '#1B5E20', fontSize: 14 }}>
            <SmartToy fontSize="small" /> Confirmado por el bot de WhatsApp
          </Box>
        )}
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: `1px solid ${ui.line}`, '&:last-child': { borderBottom: 0 } }}>
            <Typography variant="body2" sx={{ color: ui.textMute, width: 110, flexShrink: 0 }}>{k}</Typography>
            <Typography variant="body2" sx={{ color: ui.text, fontWeight: 500 }}>{v}</Typography>
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, p: 2, '& > :not(:first-of-type)': { ml: 0 } }}>
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <Button color="error" onClick={() => act({ status: 'cancelled' }, 'Turno cancelado. El horario se libera solo y queda disponible para otro cliente.')}>
            Cancelar turno
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <Button variant="outlined" startIcon={<WhatsApp />} onClick={() => { demo.toast(`Recordatorio enviado a ${c?.firstName ?? 'tu cliente'} por WhatsApp.`); onClose(); }}>
            Recordatorio
          </Button>
        )}
        {booking.status === 'pending' && (
          <Button variant="contained" onClick={() => act({ status: 'confirmed' }, 'Turno confirmado.')}>Confirmar</Button>
        )}
        {booking.status === 'confirmed' && (
          <Button variant="contained" onClick={() => act({ status: 'completed' }, 'Turno marcado como completado.')}>Completar</Button>
        )}
        {!booking.paid && booking.status !== 'cancelled' && (
          <>
            <Button variant="contained" color="success" startIcon={<AttachMoney />} onClick={(e) => setPayAnchor(e.currentTarget)}>Registrar pago</Button>
            <Menu anchorEl={payAnchor} open={!!payAnchor} onClose={() => setPayAnchor(null)}>
              {(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => (
                <MenuItem key={m} onClick={() => { setPayAnchor(null); demo.registerPayment(booking.id, m); onClose(); }}>{METHOD_LABEL[m]}</MenuItem>
              ))}
            </Menu>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function NewBookingDialog({ demo, initialDay, onClose, onCreated }: { demo: Demo; initialDay: Date; onClose: () => void; onCreated: (b: Booking) => void }) {
  const { today, bookings, customers } = demo;
  const workDays = Array.from({ length: 10 }, (_, i) => addDays(today, i)).filter((d) => d.getDay() !== 0).slice(0, 7);
  const [customerId, setCustomerId] = useState(customers[0].id);
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [proId, setProId] = useState(PROS[0].id);
  const [dayIdx, setDayIdx] = useState(Math.max(0, workDays.findIndex((d) => sameDay(d, initialDay))));
  const day = workDays[dayIdx] ?? workDays[0];
  const service = serviceById(serviceId);

  const slots = useMemo(() => {
    const taken = bookings.filter((b) => b.proId === proId && sameDay(b.start, day) && b.status !== 'cancelled');
    const out: Date[] = [];
    const close = day.getDay() === 6 ? 15 : CLOSE_H;
    for (let t = atTime(day, OPEN_H); addMinutes(t, service.duration).getHours() + addMinutes(t, service.duration).getMinutes() / 60 <= close; t = addMinutes(t, 30)) {
      const end = addMinutes(t, service.duration);
      if (t.getTime() < Date.now()) continue;
      const clash = taken.some((b) => t < addMinutes(b.start, serviceById(b.serviceId).duration) && end > b.start);
      if (!clash) out.push(t);
    }
    return out;
  }, [bookings, proId, day, service.duration]);

  const [slotIdx, setSlotIdx] = useState(0);
  useEffect(() => setSlotIdx(0), [proId, dayIdx, serviceId]);

  const create = () => {
    const start = slots[slotIdx];
    if (!start) return;
    const created = demo.addBooking({ customerId, serviceId, proId, start, status: 'pending', depositPaid: false, paid: false });
    const c = customers.find((x) => x.id === customerId);
    demo.toast(`Turno agendado para ${c?.firstName ?? 'tu cliente'}. El bot le pide confirmación por WhatsApp 24 hs antes.`);
    onCreated(created);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva Reserva</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField select label="Cliente" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))} fullWidth>
          {customers.slice(0, 40).map((c) => <MenuItem key={c.id} value={c.id}>{fullName(c)}</MenuItem>)}
        </TextField>
        <TextField select label="Servicio" value={serviceId} onChange={(e) => setServiceId(e.target.value)} fullWidth>
          {SERVICES.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} · {s.duration} min · {money(s.price)}</MenuItem>)}
        </TextField>
        <TextField select label="Profesional" value={proId} onChange={(e) => setProId(e.target.value)} fullWidth>
          {PROS.map((p) => <MenuItem key={p.id} value={p.id}>{p.name} · {p.role}</MenuItem>)}
        </TextField>
        <TextField select label="Día" value={dayIdx} onChange={(e) => setDayIdx(Number(e.target.value))} fullWidth>
          {workDays.map((d, i) => <MenuItem key={i} value={i}>{longDate(d)}</MenuItem>)}
        </TextField>
        <Box>
          <Typography variant="body2" sx={{ color: ui.textMute, mb: 1 }}>Horarios disponibles</Typography>
          {slots.length === 0 ? (
            <Typography variant="body2" sx={{ color: ui.textSoft }}>No hay horarios disponibles para esta fecha.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {slots.slice(0, 16).map((t, i) => (
                <Chip key={t.toISOString()} label={fmtTime(t)} onClick={() => setSlotIdx(i)} variant={i === slotIdx ? 'filled' : 'outlined'} sx={i === slotIdx ? { bgcolor: ui.primary, color: '#fff' } : { borderColor: ui.border }} />
              ))}
            </Box>
          )}
        </Box>
        {service.deposit > 0 && (
          <Typography variant="body2" sx={{ p: 1.25, borderRadius: 2, bgcolor: '#EFF6FF', color: ui.primary }}>
            Este servicio pide seña de {money(service.deposit)}: al cliente le llega el link de MercadoPago.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={create} disabled={!slots.length}>Crear reserva</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ───────────────────────────── CLIENTES ───────────────────────────── */

const PAGE = 10;

export function CustomersScreen({ demo }: { demo: Demo }) {
  const { customers, bookings, today, isMobile } = demo;
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);

  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = customers.filter((c) => !q || norm(`${fullName(c)} ${c.phone} ${c.email}`).includes(norm(q)));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  useEffect(() => setPage(0), [q]);

  const lastVisit = (c: Customer) => (c.lastVisit ? (daysBetween(c.lastVisit, today) === 0 ? 'Hoy' : `Hace ${daysBetween(c.lastVisit, today)} días`) : 'Nunca');

  return (
    <>
      <PageTitle
        title="Clientes"
        subtitle={`${customers.length} clientes · se cargan solos cuando reservan desde tu link`}
        actions={<Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>Nuevo cliente</Button>}
      />
      <Card>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre, teléfono o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          />
        </Box>
        {isMobile ? (
          <Box>
            {rows.map((c) => (
              <Box key={c.id} component="button" type="button" onClick={() => setSelected(c)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', px: 2, py: 1.25, border: 0, borderTop: `1px solid ${ui.line}`, bgcolor: '#fff', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}>
                <Avatar sx={{ bgcolor: ui.primary, width: 38, height: 38, fontSize: 14 }}>{initials(fullName(c))}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{fullName(c)}</Typography>
                  <Typography variant="caption" sx={{ color: ui.textMute }}>{c.phone}</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: ui.textMute, whiteSpace: 'nowrap' }}>{lastVisit(c)}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Última Visita</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: ui.primary, width: 34, height: 34, fontSize: 13 }}>{initials(fullName(c))}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fullName(c)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell sx={{ color: ui.textMute }}>{c.email}</TableCell>
                    <TableCell>{lastVisit(c)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelected(c); }} aria-label="Historial"><History fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); demo.toast(`Se abre WhatsApp con ${c.firstName}.`); }} aria-label="WhatsApp"><WhatsApp fontSize="small" sx={{ color: '#25d366' }} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderTop: `1px solid ${ui.line}` }}>
          <Typography variant="body2" sx={{ color: ui.textMute }}>{filtered.length} clientes · página {page + 1} de {pages}</Typography>
          <Box>
            <IconButton size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Anterior"><ChevronLeft /></IconButton>
            <IconButton size="small" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente"><ChevronRight /></IconButton>
          </Box>
        </Box>
      </Card>

      {selected && (
        <Dialog open onClose={() => setSelected(null)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: ui.primary }}>{initials(fullName(selected))}</Avatar>
            <Box>
              {fullName(selected)}
              <Typography variant="body2" sx={{ color: ui.textMute }}>{selected.phone} · {selected.email}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[['Visitas', String(selected.visits)], ['Última visita', lastVisit(selected)], ['Cliente desde', fmtDate(selected.since)]].map(([k, v]) => (
                <Grid item xs={4} key={k}>
                  <Typography variant="caption" sx={{ color: ui.textMute }}>{k}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{v}</Typography>
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Turnos</Typography>
            {bookings.filter((b) => b.customerId === selected.id).slice(-5).reverse().map((b) => (
              <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, borderBottom: `1px solid ${ui.line}` }}>
                <Typography variant="body2" sx={{ fontFamily: mono, width: 96, flexShrink: 0 }}>{fmtShort(b.start)} {fmtTime(b.start)}</Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>{serviceById(b.serviceId).name}</Typography>
                <StatusChip status={b.status} />
              </Box>
            ))}
            {bookings.filter((b) => b.customerId === selected.id).length === 0 && (
              <Typography variant="body2" sx={{ color: ui.textMute }}>Sin turnos en las últimas dos semanas.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button startIcon={<WhatsApp />} onClick={() => demo.toast(`Se abre WhatsApp con ${selected.firstName}.`)}>WhatsApp</Button>
            <Button variant="contained" startIcon={<CalendarToday />} onClick={() => { setSelected(null); demo.go('calendar'); }}>Agendar turno</Button>
          </DialogActions>
        </Dialog>
      )}

      {adding && <NewCustomerDialog demo={demo} onClose={() => setAdding(false)} />}
    </>
  );
}

function NewCustomerDialog({ demo, onClose }: { demo: Demo; onClose: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const valid = firstName.trim() && phone.trim();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nuevo cliente</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
        <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 5555-1234" />
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!valid}
          onClick={() => {
            demo.addCustomer({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim(), lastVisit: null, visits: 0, since: demo.today });
            onClose();
          }}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
