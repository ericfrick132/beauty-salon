'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ThemeProvider,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  AccountBalance,
  AddCircle,
  Assessment,
  AttachMoney,
  AutoAwesome,
  Block as BlockIcon,
  CalendarToday,
  Close,
  CreditCard,
  Dashboard,
  ExpandLess,
  ExpandMore,
  Group,
  Home,
  Inventory2Outlined,
  LockOutlined,
  ManageAccounts,
  Menu as MenuIcon,
  Notifications,
  Payment,
  People,
  Schedule,
  Settings,
  SmartToy,
  Storefront,
  WhatsApp,
  ArrowBack,
  ArrowForward,
  PhoneIphone,
  PlayArrow,
} from '@mui/icons-material';
import { useSignupModal } from '@/app/(components)/(sections)/SignupModal';
import { trackDemoView } from '@/app/(lib)/demoTracking';
import { adminTheme, ui } from './adminTheme';
import { AutopilotCursor, useAutopilot, type Pilot } from './autopilot';
import {
  ADMIN,
  BUSINESS,
  buildBookings,
  buildCustomers,
  fullName,
  METHOD_LABEL,
  money,
  serviceById,
  type Booking,
  type Customer,
  type PayMethod,
} from './data';
import { CalendarScreen, CustomersScreen, DashboardScreen } from './ScreensMain';
import { AgentScreen, BotScreen, PaymentsScreen, ReportsScreen, ServicesScreen } from './ScreensMore';
import type { Demo, ScreenId } from './types';

const BANNER_H = 36;
const SIDEBAR_W = 280;

type MenuNode = { text: string; icon: ReactNode; screen?: ScreenId; children?: MenuNode[]; badge?: string };

// Mismo menú que AdminLayout.tsx del panel real. Lo que no tiene pantalla en la demo queda con candado.
const MENU: MenuNode[] = [
  { text: 'Inicio', icon: <Dashboard />, screen: 'dashboard' },
  {
    text: 'Agenda', icon: <CalendarToday />, children: [
      { text: 'Agenda', icon: <Schedule fontSize="small" />, screen: 'calendar' },
      { text: 'Bloqueos', icon: <BlockIcon fontSize="small" /> },
    ],
  },
  {
    text: 'Clientes y Servicios', icon: <People />, children: [
      { text: 'Clientes', icon: <People fontSize="small" />, screen: 'customers' },
      { text: 'Servicios', icon: <ManageAccounts fontSize="small" />, screen: 'services' },
      { text: 'Empleados', icon: <Group fontSize="small" /> },
    ],
  },
  {
    text: 'Ventas e Inventario', icon: <AttachMoney />, children: [
      { text: 'Punto de venta', icon: <Storefront fontSize="small" /> },
      { text: 'Productos', icon: <Inventory2Outlined fontSize="small" /> },
      { text: 'Pagos', icon: <Payment fontSize="small" />, screen: 'payments' },
    ],
  },
  { text: 'Reportes', icon: <Assessment />, screen: 'reports' },
  {
    text: 'Configuración', icon: <Settings />, children: [
      { text: 'General', icon: <Settings fontSize="small" /> },
      { text: 'Equipo', icon: <Group fontSize="small" /> },
      { text: 'Suscripción', icon: <CreditCard fontSize="small" /> },
      { text: 'Mensajería', icon: <WhatsApp fontSize="small" /> },
      { text: 'Bot de Confirmación', icon: <SmartToy fontSize="small" />, screen: 'bot', badge: 'Nuevo' },
      { text: 'Agente IA', icon: <AutoAwesome fontSize="small" />, screen: 'agent', badge: 'Nuevo' },
      { text: 'MercadoPago', icon: <AccountBalance fontSize="small" /> },
      { text: 'Chytapay', icon: <AccountBalance fontSize="small" /> },
    ],
  },
];

const parentOf = (screen: ScreenId) => MENU.find((m) => m.children?.some((c) => c.screen === screen))?.text ?? null;

const MOBILE_NAV: Array<{ label: string; icon: ReactNode; screen?: ScreenId }> = [
  { label: 'Inicio', icon: <Home fontSize="small" />, screen: 'dashboard' },
  { label: 'Agenda', icon: <CalendarToday fontSize="small" />, screen: 'calendar' },
  { label: 'Clientes', icon: <People fontSize="small" />, screen: 'customers' },
  { label: 'Servicios', icon: <Storefront fontSize="small" />, screen: 'services' },
  { label: 'Más', icon: <MenuIcon fontSize="small" /> },
];

type Toast = { id: number; msg: string; cta?: boolean };

// Navega como lo haría una persona: menú lateral en desktop, barra inferior o menú hamburguesa en mobile.
async function navTo(p: Pilot, screen: ScreenId, isMobile: boolean) {
  if (isMobile) {
    if (MOBILE_NAV.some((n) => n.screen === screen)) return void await p.tap(`[data-tour="mnav-${screen}"]`);
    await p.tap('[aria-label="Abrir menú"]');
    await p.sleep(450);
  }
  const group = parentOf(screen);
  if (group && !p.exists(`[data-tour="nav-${screen}"]`)) {
    await p.tap(`[data-tour="group-${group}"]`);
    await p.sleep(450);
  }
  await p.tap(`[data-tour="nav-${screen}"]`);
  await p.sleep(700);
}

async function adminTour(p: Pilot, isMobile: boolean) {
  await p.scrollWindow(0);
  p.caption('Arrancás el día viendo turnos, ingresos y pendientes de un vistazo');
  await p.sleep(2600);
  await p.scrollWindow(520);
  await p.sleep(1600);
  await p.scrollWindow(0);

  await navTo(p, 'calendar', isMobile);
  p.caption('Tu agenda, por día y por profesional');
  await p.sleep(2200);
  p.caption('Cargás un turno en segundos');
  await p.tap('[data-tour="cal-new"]');
  await p.sleep(400);
  await p.tap('[data-tour="cal-new-booking"]');
  await p.sleep(700);
  await p.pick('Servicio', 'Coloración completa');
  await p.pick('Profesional', 'Lucía');
  // Algunos días la profesional está completa: se prueba el siguiente hasta encontrar horarios.
  let slots: HTMLElement[] = [];
  for (let d = 1; d < 7 && !slots.length; d++) {
    await p.pick('Día', d);
    await p.sleep(400);
    slots = p.all('[data-tour="nb-slot"]');
  }
  if (slots.length) await p.tap(slots[Math.min(2, slots.length - 1)]);
  await p.sleep(700);
  await p.tap('[data-tour="nb-create"]');
  p.caption('Queda en la agenda y al cliente le llega el link para pagar la seña');
  await p.sleep(3200);

  await navTo(p, 'payments', isMobile);
  p.caption('Efectivo, tarjeta, transferencia y MercadoPago en un solo lugar');
  await p.sleep(2000);
  const cobrar = p.exists('[data-tour="pay-cobrar"]');
  if (cobrar) {
    await p.tap(cobrar);
    p.caption('Cobrás con un clic y la caja del día se actualiza sola');
    await p.sleep(2600);
  }

  await navTo(p, 'bot', isMobile);
  p.caption('El bot le pide confirmación a cada cliente por WhatsApp');
  await p.sleep(2200);
  await p.tap('[data-tour="bot-si"]');
  p.caption('El cliente responde SI y el turno se confirma solo en tu agenda');
  await p.sleep(3400);

  await navTo(p, 'agent', isMobile);
  p.caption('El Agente IA atiende tu WhatsApp las 24 hs y agenda turnos nuevos');
  await p.sleep(1800);
  const tried = new Set<string>();
  for (let i = 0; i < 8 && !p.exists('[data-tour="agent-done"]'); i++) {
    const opt = await p.find(() => {
      const opts = p.all('[data-tour="agent-opt"]');
      return opts.find((o) => o.textContent === 'Sí, dale')
        ?? opts.find((o) => o.textContent === 'Hola! quería sacar un turno')
        ?? opts.find((o) => o.textContent && o.textContent !== '¿Cuánto sale el corte?' && o.textContent !== 'Mejor otro horario' && !tried.has(o.textContent));
    }, 6000);
    if (opt.textContent) tried.add(opt.textContent);
    await p.tap(opt);
    await p.sleep(1200);
  }
  await p.find('[data-tour="agent-done"]', 6000);
  p.caption('Turno nuevo en tu agenda, sin que toques el celular');
  await p.sleep(3200);

  await navTo(p, 'reports', isMobile);
  p.caption('Y ves cuánto facturás, por servicio y por profesional');
  await p.sleep(2400);
  await p.scrollWindow(600);
  await p.sleep(1800);

  await navTo(p, 'dashboard', isMobile);
}

export default function DemoAdmin() {
  const { open: openSignup } = useSignupModal();
  const isMobile = useMediaQuery(adminTheme.breakpoints.down('md'));
  const [today, setToday] = useState<Date | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [screen, setScreen] = useState<ScreenId>('dashboard');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ctaCollapsed, setCtaCollapsed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [botEnabled, setBotEnabled] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const toastId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const pilot = useAutopilot({
    overlay: overlayRef, root: rootRef, windowScroll: true,
    script: (p) => adminTour(p, isMobileRef.current),
    // Si algo no apareció, se cierra todo (diálogos, menú) volviendo al inicio antes de reintentar.
    onError: () => { setDrawerOpen(false); setScreen('dashboard'); setRestartKey((k) => k + 1); },
  });

  // Los datos dependen de la fecha y la hora: se arman recién en el cliente (el HTML exportado queda vacío).
  useEffect(() => {
    const now = new Date();
    const cs = buildCustomers(now);
    setToday(now);
    setCustomers(cs);
    setBookings(buildBookings(cs, now));
    trackDemoView('demo-admin');
  }, []);

  const toast = useCallback((msg: string, opts?: { cta?: boolean }) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, cta: opts?.cta }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts?.cta ? 6000 : 4000);
  }, []);

  const go = useCallback((next: ScreenId) => {
    setScreen(next);
    setDrawerOpen(false);
    setOpenGroup((g) => parentOf(next) ?? g);
    window.scrollTo({ top: 0 });
  }, []);

  const locked = (label: string) =>
    toast(`«${label}» ya está en tu cuenta real. Probá TurnosPro 7 días gratis y lo usás con tu negocio.`, { cta: true });

  const register = useCallback(() => openSignup(), [openSignup]);

  const addBooking = useCallback((b: Omit<Booking, 'id'>) => {
    const created = { ...b, id: Date.now() };
    setBookings((list) => [...list, created].sort((x, y) => x.start.getTime() - y.start.getTime()));
    return created;
  }, []);

  const updateBooking = useCallback((id: number, patch: Partial<Booking>) => {
    setBookings((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const registerPayment = useCallback((id: number, method: PayMethod) => {
    // Cobrar un turno que ya pasó lo da por completado; uno futuro queda como está (pago adelantado).
    setBookings((list) => list.map((b) => (b.id === id
      ? { ...b, paid: true, method, status: b.start.getTime() < Date.now() && (b.status === 'pending' || b.status === 'confirmed') ? 'completed' : b.status }
      : b)));
    const b = bookings.find((x) => x.id === id);
    if (b) toast(`Pago registrado: ${money(serviceById(b.serviceId).price)} · ${METHOD_LABEL[method]}.`);
  }, [bookings, toast]);

  const addCustomer = useCallback((c: Omit<Customer, 'id'>) => {
    const created = { ...c, id: Date.now() };
    setCustomers((list) => [created, ...list]);
    toast(`${fullName(created)} quedó en tu base de clientes.`);
    return created;
  }, [toast]);

  const demo: Demo | null = useMemo(() => (today && customers.length
    ? {
        today, customers, bookings, botEnabled, isMobile,
        go, toast, register, locked, addBooking, updateBooking, registerPayment, addCustomer, setBotEnabled,
      }
    : null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [today, customers, bookings, botEnabled, isMobile, go, toast, register, addBooking, updateBooking, registerPayment, addCustomer]);

  // La demo se mueve sola apenas cargan los datos; con un clic o una tecla el visitante toma el control.
  const ready = !!demo;
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => pilot.start(), 900);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const replay = () => {
    setDrawerOpen(false);
    setScreen('dashboard');
    setRestartKey((k) => k + 1);
    window.setTimeout(() => pilot.start(), 300);
  };

  const pendingCount = bookings.filter((b) => b.status === 'pending' && today && b.start > today).length;
  const mobileNavValue = MOBILE_NAV.findIndex((n) => n.screen === screen);
  const ctaH = ctaCollapsed ? 56 : isMobile ? 112 : 132;
  const bottomNavH = isMobile ? 56 : 0;

  const drawer = (
    <Box>
      <Box sx={{ p: 2, pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: '12px', backgroundColor: '#F9FAFB', border: `1px solid ${ui.line}`, mb: 2 }}>
          <Avatar sx={{ bgcolor: ui.primary, color: '#fff', width: 40, height: 40, fontWeight: 600 }}>S</Avatar>
          <Box sx={{ ml: 2, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: ui.text }}>{ADMIN.firstName}</Typography>
            <Typography variant="caption" sx={{ color: ui.textMute, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ADMIN.email}</Typography>
          </Box>
        </Box>
      </Box>
      <List sx={{ px: 1 }}>
        {MENU.map((item) => {
          if (!item.children) {
            const active = item.screen === screen;
            return (
              <ListItem key={item.text} disablePadding>
                <NavButton tour={item.screen && `nav-${item.screen}`} active={active} locked={!item.screen} onClick={() => (item.screen ? go(item.screen) : locked(item.text))}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </NavButton>
              </ListItem>
            );
          }
          const expanded = openGroup === item.text;
          return (
            <Box key={item.text}>
              <ListItem disablePadding>
                <NavButton tour={`group-${item.text}`} onClick={() => setOpenGroup(expanded ? null : item.text)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </NavButton>
              </ListItem>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.text} disablePadding sx={{ pl: 2 }}>
                      <NavButton
                        tour={child.screen && `nav-${child.screen}`}
                        small
                        active={child.screen === screen}
                        locked={!child.screen}
                        onClick={() => (child.screen ? go(child.screen) : locked(child.text))}
                      >
                        <ListItemIcon sx={{ minWidth: '35px !important' }}>{child.icon}</ListItemIcon>
                        <ListItemText primary={child.text} />
                        {child.badge && (
                          <Chip label={child.badge} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#25d366', color: '#fff' }} />
                        )}
                        {!child.screen && <LockOutlined sx={{ fontSize: 13, color: ui.textMute, opacity: 0.7 }} />}
                      </NavButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>
      <Box sx={{ p: 2, pb: `${ctaH + 24}px`, textAlign: 'center', borderTop: `1px solid ${ui.line}`, mt: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block">PELUQUERÍA Edition</Typography>
        <Typography variant="caption" color="text.secondary" display="block">v1.0.0</Typography>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={adminTheme}>
      <Box ref={rootRef} sx={{ minHeight: '100vh', bgcolor: ui.bg, fontFamily: adminTheme.typography.fontFamily }}>
        {/* Banner de demo */}
        <Box
          sx={{
            position: 'fixed', top: 0, left: 0, right: 0, height: BANNER_H, zIndex: 1250,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, px: 2,
            bgcolor: '#F4C038', color: '#171410', fontSize: 13, fontWeight: 600,
          }}
        >
          <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#E8593C', flexShrink: 0 }} />
          <Box component="h1" sx={{ m: 0, font: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Demo del panel de TurnosPro
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}> con datos de ejemplo</Box>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={register}
            sx={{ border: '1.5px solid #171410', bgcolor: '#171410', color: '#F4C038', borderRadius: 999, px: 1.5, py: 0.25, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', '&:hover': { bgcolor: 'transparent', color: '#171410' } }}
          >
            Probalo gratis →
          </Box>
        </Box>

        {/* Navbar oscura del panel */}
        <Box
          component="header"
          sx={{
            position: 'fixed', top: BANNER_H, left: 0, right: 0, height: { xs: 56, md: 64 }, zIndex: 1210,
            bgcolor: ui.navbar, color: '#fff', display: 'flex', alignItems: 'center', px: { xs: 1, md: 2 }, gap: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <IconButton onClick={() => setDrawerOpen((v) => !v)} sx={{ color: '#fff', display: { xs: 'inline-flex', md: 'none' }, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }} aria-label="Abrir menú">
            <MenuIcon />
          </IconButton>
          <IconButton sx={{ color: '#fff', display: { xs: 'none', md: 'inline-flex' }, mr: 1, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }} aria-label="Menú" onClick={() => toast('En tu cuenta real este botón oculta el menú lateral.')}>
            <MenuIcon />
          </IconButton>
          <Typography component="div" sx={{ color: '#fff', fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {BUSINESS}
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
            <Button size="small" variant="contained" startIcon={<AddCircle />} onClick={() => go('calendar')} sx={{ backgroundColor: ui.accent, '&:hover': { backgroundColor: '#1D4ED8' } }}>
              Nueva reserva
            </Button>
            <Button size="small" variant="outlined" onClick={() => go('customers')} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}>
              Nuevo cliente
            </Button>
            <Button size="small" variant="outlined" onClick={() => go('payments')} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}>
              Cobrar
            </Button>
          </Box>
          <Tooltip title="Turnos pendientes de confirmar">
            <IconButton onClick={() => go('calendar')} aria-label="Notificaciones">
              <Badge badgeContent={pendingCount} sx={{ '& .MuiBadge-badge': { backgroundColor: ui.accent, color: '#fff' } }}>
                <Notifications sx={{ color: '#fff' }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Avatar sx={{ backgroundColor: ui.accent, color: '#fff', width: 36, height: 36, fontWeight: 600, border: '2px solid rgba(255,255,255,0.3)' }}>S</Avatar>
        </Box>

        {/* Sidebar */}
        {isMobile ? (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { width: '85%', maxWidth: SIDEBAR_W, bgcolor: '#fff', borderRight: 'none', borderRadius: 0, pt: `${BANNER_H}px` } }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú"><Close /></IconButton>
            </Box>
            {drawer}
          </Drawer>
        ) : (
          <Box
            component="nav"
            sx={{
              position: 'fixed', top: BANNER_H + 64, bottom: 0, left: 0, width: SIDEBAR_W, zIndex: 1100,
              bgcolor: '#fff', borderRight: `1px solid ${ui.line}`, overflowY: 'auto',
            }}
          >
            {drawer}
          </Box>
        )}

        {/* Contenido */}
        <Box
          component="main"
          sx={{
            ml: { xs: 0, md: `${SIDEBAR_W}px` },
            pt: { xs: `${BANNER_H + 56 + 16}px`, md: `${BANNER_H + 64 + 24}px` },
            px: { xs: 2, md: 3 },
            pb: `${ctaH + bottomNavH + 32}px`,
          }}
        >
          {!demo ? (
            <Typography sx={{ py: 10, textAlign: 'center', color: ui.textMute }}>Cargando tu agenda…</Typography>
          ) : (
            <Box key={`${screen}-${restartKey}`} sx={{ maxWidth: 1240, mx: 'auto', animation: 'tpDemoIn 280ms ease', '@keyframes tpDemoIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } } }}>
              {screen === 'dashboard' && <DashboardScreen demo={demo} />}
              {screen === 'calendar' && <CalendarScreen demo={demo} />}
              {screen === 'customers' && <CustomersScreen demo={demo} />}
              {screen === 'services' && <ServicesScreen demo={demo} />}
              {screen === 'payments' && <PaymentsScreen demo={demo} />}
              {screen === 'reports' && <ReportsScreen demo={demo} />}
              {screen === 'bot' && <BotScreen demo={demo} />}
              {screen === 'agent' && <AgentScreen demo={demo} />}
            </Box>
          )}
        </Box>

        {/* Piloto automático: cursor + estado de la demo */}
        <Box ref={overlayRef} aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: 1500, pointerEvents: 'none' }}>
          <AutopilotCursor cursor={pilot.cursor} variant={isMobile ? 'touch' : 'mouse'} />
        </Box>
        <Box
          data-autopilot-ui
          sx={{
            position: 'fixed', zIndex: 1450, display: 'flex', justifyContent: 'center', pointerEvents: 'none',
            left: { xs: 12, md: SIDEBAR_W + 24 }, right: { xs: 12, md: 420 },
            ...(isMobile ? { top: BANNER_H + 56 + 8 } : { bottom: ctaH + 16 }),
          }}
        >
          {pilot.running ? (
            <Box sx={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 1.25, pl: 1.5, pr: 0.75, py: 0.75, maxWidth: 640, bgcolor: '#fff', color: ui.text, border: `1px solid ${ui.line}`, borderRadius: 999, boxShadow: '0 10px 28px rgba(17,24,39,0.16)', fontSize: { xs: 13, md: 14 } }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#E8593C', flexShrink: 0, animation: 'tpLive 1.4s ease-in-out infinite', '@keyframes tpLive': { '50%': { opacity: 0.25 } } }} />
              <Box key={pilot.caption} sx={{ flex: 1, minWidth: 0, fontWeight: 600, lineHeight: 1.3, animation: 'tpCap 300ms ease', '@keyframes tpCap': { from: { opacity: 0, transform: 'translateY(4px)' } } }}>
                {pilot.caption || 'Demo en vivo'}
              </Box>
              <Button size="small" onClick={pilot.stop} sx={{ flexShrink: 0, borderRadius: 999, whiteSpace: 'nowrap', fontSize: 12 }}>
                Probar yo
              </Button>
            </Box>
          ) : (
            <Button variant="contained" size="small" startIcon={<PlayArrow />} onClick={replay} sx={{ pointerEvents: 'auto', borderRadius: 999, px: 2, bgcolor: ui.navbar, boxShadow: '0 10px 28px rgba(17,24,39,0.25)', '&:hover': { bgcolor: '#1f2937' } }}>
              Ver la demo automática
            </Button>
          )}
        </Box>

        {/* Toasts */}
        <Box sx={{ position: 'fixed', right: 16, left: { xs: 16, sm: 'auto' }, bottom: ctaH + bottomNavH + 16, zIndex: 1350, display: 'flex', flexDirection: 'column', gap: 1, width: { sm: 380 }, pointerEvents: 'none' }} aria-live="polite">
          {toasts.map((t) => (
            <Box key={t.id} sx={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: ui.navbar, color: '#fff', borderRadius: 2, boxShadow: '0 12px 32px rgba(17,24,39,0.3)', fontSize: 14, animation: 'tpToast 220ms ease', '@keyframes tpToast': { from: { opacity: 0, transform: 'translateY(8px)' } } }}>
              <Box sx={{ flex: 1 }}>{t.msg}</Box>
              {t.cta && (
                <Button size="small" variant="contained" onClick={register} sx={{ bgcolor: ui.accent, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Probar gratis
                </Button>
              )}
            </Box>
          ))}
        </Box>

        {/* Barra CTA */}
        <Box
          sx={{
            position: 'fixed', left: 0, right: 0, bottom: bottomNavH, zIndex: 1150,
            bgcolor: 'rgba(17,24,39,0.97)', color: '#fff', borderTop: '3px solid #F4C038',
            px: 2, py: ctaCollapsed ? 1 : { xs: 1.25, md: 2 }, textAlign: 'center',
          }}
        >
          {ctaCollapsed ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>¿Te imaginás tu negocio acá?</Typography>
              <Button size="small" variant="contained" onClick={register} sx={{ bgcolor: '#F4C038', color: '#171410', '&:hover': { bgcolor: '#f7cf5f' } }}>
                Empezar gratis 7 días →
              </Button>
              <IconButton size="small" onClick={() => setCtaCollapsed(false)} sx={{ color: '#fff' }} aria-label="Expandir"><ExpandLess /></IconButton>
            </Box>
          ) : (
            <Box sx={{ position: 'relative', maxWidth: 960, mx: 'auto' }}>
              <IconButton size="small" onClick={() => setCtaCollapsed(true)} sx={{ position: 'absolute', right: -8, top: -6, color: 'rgba(255,255,255,0.7)' }} aria-label="Minimizar"><ExpandMore /></IconButton>
              <Typography sx={{ color: '#fff', fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 500, fontSize: { xs: '1rem', md: '1.35rem' }, px: 4, lineHeight: 1.25 }}>
                Así vas a manejar tu agenda, tus cobros y tu WhatsApp
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', display: { xs: 'none', md: 'block' }, mt: 0.5 }}>
                Tu sitio de reservas listo en 15 minutos. Probá 7 días gratis.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1, md: 2 }, mt: { xs: 1, md: 1.5 } }}>
                <Button variant="contained" onClick={register} endIcon={<ArrowForward />} sx={{ bgcolor: '#F4C038', color: '#171410', fontWeight: 700, px: { xs: 1.5, md: 3 }, fontSize: { xs: '0.85rem', md: '0.95rem' }, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#f7cf5f' } }}>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Empezar gratis 7 días</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Probar gratis</Box>
                </Button>
                <Button variant="outlined" href="/demo-app" startIcon={<PhoneIphone />} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', px: { xs: 1.5, md: 2.5 }, fontSize: { xs: '0.85rem', md: '0.95rem' }, whiteSpace: 'nowrap', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Ver lo que ve tu cliente</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Vista cliente</Box>
                </Button>
                <Button variant="text" href="/" startIcon={<ArrowBack />} sx={{ color: 'rgba(255,255,255,0.75)', display: { xs: 'none', md: 'inline-flex' }, '&:hover': { color: '#fff', background: 'transparent' } }}>
                  Volver al inicio
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {isMobile && (
          <BottomNavigation
            showLabels
            value={mobileNavValue === -1 ? false : mobileNavValue}
            onChange={(_, v: number) => {
              const target = MOBILE_NAV[v];
              if (target?.screen) go(target.screen);
              else setDrawerOpen(true);
            }}
            sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1160, borderTop: `1px solid ${ui.border}`, boxShadow: '0 -6px 18px rgba(0,0,0,0.08)', bgcolor: '#fff' }}
          >
            {MOBILE_NAV.map((n) => <BottomNavigationAction key={n.label} data-tour={n.screen && `mnav-${n.screen}`} label={n.label} icon={n.icon} sx={{ minWidth: 0 }} />)}
          </BottomNavigation>
        )}
      </Box>
    </ThemeProvider>
  );
}

function NavButton({ tour, active, locked, small, onClick, children }: { tour?: string; active?: boolean; locked?: boolean; small?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <ListItemButton
      data-tour={tour}
      onClick={onClick}
      sx={{
        mx: 1, my: 0.5, borderRadius: '8px', transition: 'all 0.2s ease',
        color: active ? ui.primary : ui.textSoft,
        backgroundColor: active ? `${ui.primary}0D` : 'transparent',
        borderLeft: active ? `3px solid ${ui.primary}` : '3px solid transparent',
        opacity: locked ? 0.62 : 1,
        '&:hover': { backgroundColor: ui.hover, color: ui.text },
        '& .MuiListItemIcon-root': { color: active ? ui.primary : ui.textMute, minWidth: 40 },
        '& .MuiListItemText-primary': { color: active ? ui.primary : ui.textSoft, fontWeight: active ? 600 : 500, fontSize: small ? '0.875rem' : '0.95rem' },
      }}
    >
      {children}
    </ListItemButton>
  );
}

