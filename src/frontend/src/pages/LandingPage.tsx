import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Chip,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  TextField,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  useMediaQuery,
  Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import {
  CalendarMonth,
  AccessTime,
  PeopleAlt,
  BarChart,
  Payments,
  ReceiptLong,
  Star,
} from '@mui/icons-material';
import { selfRegistrationApi } from '../services/api';

type BusinessType =
  | 'barbershop' // Peluquería/Barbería
  | 'peluqueria' // Centro de Estética / Peluquería
  | 'aesthetics' // Spa/Masajes, Consultorio
  | 'other';

type TeamSize = 'solo' | 'small' | 'large';
type MainProblem = 'noShows' | 'whatsapp' | 'deposits' | 'reports';

const COLORS = {
  primaryGreen: '#2D5A47',
  gold: '#B8860B',
  leatherBrown: '#8B4513',
  black: '#1a1a1a',
  cream: '#F5F5DC',
  lightGray: '#f8f8f8',
  white: '#ffffff',
  success: '#28a745',
};

const formatNumberAr = (n: number | string) => new Intl.NumberFormat('es-AR').format(Number(n));

const normalizeSubdomain = (raw: string) => {
  const noAccents = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  const lower = noAccents.toLowerCase();
  const replaced = lower
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return replaced;
};

const strongRandomPassword = () => {
  // Ensure at least one of each required type and length >= 12
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '@$!%*?&';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(upper) + pick(lower) + pick(nums) + pick(syms);
  const all = upper + lower + nums + syms;
  while (pwd.length < 12) pwd += pick(all);
  return pwd
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

const useParallax = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY * 0.3);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return offset;
};

const trackEvent = (name: string, params: Record<string, any> = {}) => {
  try {
    // GA4 if present
    // @ts-ignore
    if (window.gtag) {
      // @ts-ignore
      window.gtag('event', name, params);
    } else {
      // eslint-disable-next-line no-console
      console.log('[analytics]', name, params);
    }
  } catch {}
};

const heroMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const Section: React.FC<{ id?: string; bg?: string; children: React.ReactNode }> = ({ id, bg, children }) => (
  <Box id={id} sx={{ py: { xs: 6, md: 10 }, background: bg || 'transparent' }}>
    <Container maxWidth="lg">{children}</Container>
  </Box>
);

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const parallax = useParallax();

  const [stepperOpen, setStepperOpen] = useState(false);
  const TOTAL_STEPS = 4; // 0..3
  const [activeStep, setActiveStep] = useState(0); // 0..3
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingOverlay, setLoadingOverlay] = useState(false);

  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [problems, setProblems] = useState<MainProblem[]>([]);

  const [businessName, setBusinessName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [checkingSub, setCheckingSub] = useState(false);
  const [subAvailable, setSubAvailable] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const [checklistIdx, setChecklistIdx] = useState(0);
  const checklist = useMemo(
    () => [
      'Configurando servicios típicos',
      'Ajustando horarios sugeridos',
      'Activando recordatorios automáticos',
      'Preparando tu panel de control',
    ],
    []
  );

  useEffect(() => {
    // Load Inter font for this page per spec
    const id = 'tp-inter-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    setProgress(((activeStep + 1) / TOTAL_STEPS) * 100);
  }, [activeStep]);

  useEffect(() => {
    if (!stepperOpen) return;
    trackEvent('stepper_started');
  }, [stepperOpen]);

  useEffect(() => {
    if (!loadingOverlay) return;
    setChecklistIdx(0);
    const t = setInterval(() => {
      setChecklistIdx((i) => {
        if (i >= checklist.length - 1) {
          clearInterval(t);
          return i;
        }
        return i + 1;
      });
    }, 800);
    return () => clearInterval(t);
  }, [loadingOverlay, checklist.length]);

  const openStepper = () => setStepperOpen(true);
  const closeStepper = () => {
    setStepperOpen(false);
    setActiveStep(0);
    setBusinessType(null);
    setTeamSize(null);
    setProblems([]);
    setBusinessName('');
    setSubdomain('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFormError('');
    trackEvent('stepper_abandoned', { step: activeStep + 1 });
  };

  const autoAdvance = () => {
    setActiveStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const handleSelectBusiness = (bt: BusinessType) => {
    setBusinessType(bt);
    trackEvent('business_type_selected', { businessType: bt });
  };

  const handleSelectTeam = (size: TeamSize) => {
    setTeamSize(size);
    trackEvent('team_size_selected', { teamSize: size });
    trackEvent('step_completed', { step: 2 });
    autoAdvance();
  };

  const handleSelectProblem = (p: MainProblem) => {
    setProblems((prev) => {
      const exists = prev.includes(p);
      const next = exists ? prev.filter((x) => x !== p) : [...prev, p];
      trackEvent('main_problem_selected', { problems: next });
      return next;
    });
  };

  // Google signup no utilizado en el nuevo flujo (email + contraseña)

  const debouncedSub = useRef<number | null>(null);
  useEffect(() => {
    if (!businessName) {
      setSubAvailable(null);
      return;
    }
    const candidate = normalizeSubdomain(businessName);
    setSubdomain(candidate);
  }, [businessName]);

  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubAvailable(null);
      return;
    }
    if (debouncedSub.current) window.clearTimeout(debouncedSub.current);
    debouncedSub.current = window.setTimeout(async () => {
      setCheckingSub(true);
      try {
        const res = await selfRegistrationApi.checkSubdomain(subdomain);
        const available = res?.available ?? res?.data?.available;
        setSubAvailable(Boolean(available));
      } catch {
        setSubAvailable(null);
      } finally {
        setCheckingSub(false);
      }
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const mapBusinessToVertical = (bt: BusinessType | null): string => {
    switch (bt) {
      case 'barbershop':
        return 'barbershop';
      case 'peluqueria':
        return 'peluqueria';
      case 'aesthetics':
        return 'aesthetics';
      default:
        return 'barbershop';
    }
  };

  const passwordOk = useMemo(() => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password), [password]);

  const canStep1Continue = () => {
    return !!businessType && businessName.trim().length >= 2 && subdomain.trim().length >= 3 && subAvailable !== false;
  };

  const canSubmit = () => {
    const emailOk = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    return businessType !== null && emailOk && passwordOk && password === confirmPassword && subdomain.trim().length >= 3 && subAvailable !== false && businessName.trim().length >= 2;
  };

  const API_BASE = (process.env.REACT_APP_API_URL as string) || '/api';

  const buildAutoLoginUrl = (payload: any) => {
    // Prefer server-provided redirectUrl if present
    if (payload?.redirectUrl) return payload.redirectUrl as string;

    const token = payload?.token;
    const tenantSubdomain = payload?.tenantSubdomain || payload?.subdomain;
    const dashboardUrl = payload?.dashboardUrl || payload?.tenantUrl;

    // Determine base domain based on current host (support localhost)
    const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
    const domain = isLocal ? 'localhost:3001' : 'turnos-pro.com';
    const protocol = isLocal ? 'http:' : 'https:';

    if (token && tenantSubdomain) {
      // Direct auto-login into dashboard via impersonationToken and start tour
      return `${protocol}//${tenantSubdomain}.${domain}/dashboard?impersonationToken=${encodeURIComponent(token)}&tour=onboarding&onboarding=1`;
    }

    if (tenantSubdomain && dashboardUrl) {
      try {
        const base = new URL(dashboardUrl);
        return base.toString();
      } catch {
        return `${protocol}//${tenantSubdomain}.${domain}`;
      }
    }
    return '';
  };

  const register = async () => {
    setFormError('');
    if (!canSubmit()) {
      setFormError('Completá los datos para crear tu cuenta');
      return;
    }
    setBusy(true);
    trackEvent('signup_started', { method: 'email' });
    try {
      const firstNameGuess = 'Admin';
      const lastNameGuess = 'Turnos Pro';
      const pwd = strongRandomPassword();

      // intento primario: endpoint con token
      const primaryBody = {
        gymName: businessName.trim(),
        subdomain: subdomain.trim(),
        adminEmail: email.trim(),
        adminFirstName: firstNameGuess,
        adminLastName: lastNameGuess,
        password: pwd,
      };
      let res = await fetch(`${API_BASE}/tenants/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(primaryBody),
      });
      let ok = res.ok;
      let data: any = null;
      if (ok) {
        data = await res.json();
        const success = data?.success;
        const payload = success ? data?.data : data;
        const redirect = buildAutoLoginUrl(payload);
        if (redirect) {
          trackEvent('signup_completed', { method: 'email', flow: 'primary' });
          window.location.href = redirect; // instantáneo
          return;
        }
      }

      // fallback: nuestro self-registration
      const fallbackBody = {
        verticalCode: mapBusinessToVertical(businessType),
        subdomain,
        businessName: businessName.trim(),
        adminEmail: email.trim(),
        adminFirstName: firstNameGuess,
        adminLastName: lastNameGuess,
        adminPassword: pwd,
        confirmPassword: pwd,
        timeZone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        language: 'es',
        isDemo: true,
        demoDays: 30,
      };
      res = await fetch(`${API_BASE}/self-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Error creando la cuenta');
      }
      data = await res.json();
      const payload = data?.data || data;
      const redirect = buildAutoLoginUrl(payload);
      trackEvent('signup_completed', { method: 'email', flow: 'fallback' });
      if (redirect) {
        window.location.href = redirect;
      } else if (payload?.tenantUrl) {
        window.location.href = payload.tenantUrl;
      } else {
        window.location.href = `${window.location.protocol}//${subdomain}.turnos-pro.com`;
      }
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'No pudimos crear tu cuenta. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const personalizedBenefits = () => {
    const bullets: string[] = [];
    switch (businessType) {
      case 'barbershop':
        bullets.push(
          'Reducí 70% las inasistencias con recordatorios automáticos',
          'Tus clientes reservan corte + barba online 24/7',
          'Cobrá señas por Mercado Pago para asegurar turnos',
          'Controlá cuánto facturás por servicio en tiempo real'
        );
        break;
      case 'peluqueria':
        bullets.push(
          'Organizá tratamientos largos sin problemas de coordinación',
          'Recordatorios automáticos reducen 70% las faltas',
          'Fichas de cliente con historial de tratamientos',
          'Reportes de servicios más rentables'
        );
        break;
      case 'aesthetics':
        bullets.push(
          'Agenda relajada sin coordinar por WhatsApp',
          'Clientes reservan cuando quieren; vos te enfocás en atender',
          'Cobrá señas para terapias premium',
          'Seguimiento de clientes frecuentes'
        );
        break;
      default:
        bullets.push(
          'Reservas 24/7 desde cualquier dispositivo',
          'Recordatorios por WhatsApp y Email con 1 click',
          'Cobro de señas por Mercado Pago',
          'Reportes claros para decidir mejor'
        );
    }
    return bullets;
  };

  const savingsCalc = useMemo(() => {
    // Simple mock calculation based on selections
    const hours = teamSize === 'large' ? 10 : teamSize === 'small' ? 6 : 4;
    const pesos = problems.includes('noShows') ? 80000 : 45000;
    const percent = problems.includes('whatsapp') ? 25 : 18;
    return { hours, pesos, percent };
  }, [teamSize, problems]);

  return (
    <Box sx={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', color: COLORS.black }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{ backgroundColor: COLORS.white, borderBottom: '1px solid #eee' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.primaryGreen }}>
            Turnos Pro
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button color="inherit" href="#features">Características</Button>
            <Button color="inherit" href="#precios">Precios</Button>
            <Button color="inherit" href="#faq">FAQ</Button>
            <Button variant="contained" onClick={openStepper} sx={{
              backgroundColor: COLORS.gold,
              color: COLORS.white,
              '&:hover': { backgroundColor: '#9c6d09', transform: 'translateY(-2px)' },
              transition: 'all .3s'
            }}>
              Probá GRATIS 30 días
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${COLORS.cream} 0%, ${COLORS.lightGray} 50%, ${COLORS.white} 100%)`,
      }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 14 } }}>
          <motion.div {...heroMotion}>
            <Chip label="✨ Sin datos de pago requeridos" sx={{ mb: 2, backgroundColor: COLORS.white }} />
            <Typography variant="h1" sx={{ fontSize: { xs: 32, md: 44 }, fontWeight: 800, lineHeight: 1.2, color: COLORS.black }}>
              Olvidate del dolor de agendar turnos
            </Typography>
            <Typography variant="h6" sx={{ mt: 2, maxWidth: 720, color: '#333' }}>
              Ofrecé un mejor servicio, reducí el ausentismo y agilízá la administración de tu emprendimiento
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button size="large" variant="contained" onClick={openStepper} endIcon={<ArrowForwardIcon />} sx={{
                backgroundColor: COLORS.gold,
                color: COLORS.white,
                px: 3,
                py: 1.2,
                '&:hover': { backgroundColor: '#9c6d09', transform: 'translateY(-2px)' },
                transition: 'all .3s'
              }}>
                Probá GRATIS 30 días
              </Button>
              <Typography variant="body2" sx={{ color: '#666' }}>Tu tiempo, nuestra prioridad</Typography>
            </Box>
          </motion.div>

          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: `translateY(${parallax}px)` }} />
        </Container>
      </Box>

      {/* Stats */}
      <Section>
        <Grid container spacing={3}>
          {[
            ['+12.000', 'negocios nos recomiendan'],
            ['82%', 'menos inasistencias'],
            ['100M+', 'turnos procesados'],
            ['24/7', 'reservas online'],
          ].map(([k, v]) => (
            <Grid item xs={6} md={3} key={k}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.primaryGreen }}>{k}</Typography>
                  <Typography variant="body2" color="text.secondary">{v}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Features */}
      <Section id="features" bg={COLORS.lightGray}>
        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Todo lo que tu negocio necesita</Typography>
        <Grid container spacing={3}>
          {[
            { icon: <CalendarMonth color="primary" />, title: 'Agenda Online', desc: 'Permití que tus clientes reserven turnos 24/7 desde cualquier dispositivo' },
            { icon: <AccessTime color="primary" />, title: 'Recordatorios Automáticos', desc: 'Reducí las inasistencias con notificaciones por email y WhatsApp' },
            { icon: <PeopleAlt color="primary" />, title: 'Gestión de Clientes', desc: 'Mantené un registro detallado de tus clientes y su historial' },
            { icon: <BarChart color="primary" />, title: 'Reportes en Tiempo Real', desc: 'Analizá el rendimiento de tu negocio con datos al instante' },
            { icon: <Payments color="primary" />, title: 'Cobro de Señas', desc: 'Reducí el ausentismo aceptando pagos por adelantado con Mercado Pago' },
            { icon: <ReceiptLong color="primary" />, title: 'Facturación AFIP', desc: 'Emití facturas electrónicas con un solo click' },
          ].map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.title}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ mb: 1 }}>{f.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Para quién es */}
      <Section>
        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>¿Para quién es?</Typography>
        <Grid container spacing={3}>
          {[
            ['💇‍♂️ Belleza y Bienestar', 'Peluquerías, barberías, estética, spa, uñas'],
            ['🏥 Salud', 'Consultorios, kinesiología, terapias alternativas'],
            ['📚 Profesionales', 'Asesorías, clases particulares, servicios independientes'],
          ].map(([t, d]) => (
            <Grid item xs={12} md={4} key={t}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{t}</Typography>
                  <Typography variant="body2" color="text.secondary">{d}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Beneficios */}
      <Section bg={COLORS.lightGray}>
        <Grid container spacing={3}>
          {[
            ['🚀 Mayor Productividad', 'Automatizá la gestión de turnos y enfocate en lo importante'],
            ['😊 Satisfacción del Cliente', 'Reservas fáciles y rápidas desde cualquier dispositivo'],
            ['⏰ Ahorro de Tiempo', 'Menos coordinación manual, más ventas'],
          ].map(([t, d]) => (
            <Grid item xs={12} md={4} key={t}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{t}</Typography>
                  <Typography variant="body2" color="text.secondary">{d}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Trust */}
      <Section>
        <Grid container spacing={3}>
          {[
            '600+ empresas confían en nosotros',
            '5/5 estrellas en Google (+145 reseñas)',
            '50.000+ usuarios activos',
            'Soporte en español',
          ].map((t) => (
            <Grid item xs={12} sm={6} md={3} key={t}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Star sx={{ color: COLORS.gold }} />
                  <Typography variant="body2" sx={{ mt: 1 }}>{t}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Testimonios */}
      <Section bg={COLORS.lightGray}>
        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Lo que dicen nuestros clientes</Typography>
        <Grid container spacing={3}>
          {[
            ['Gaby Conde', 'Esteticista', 'Me cambió totalmente el trabajo, te ahorra tiempo y problema con el tema de las señas'],
            ['Angie Aicardi', '', 'Mis turnos incrementaron, ya que los clientes sacan turnos las 24hs'],
            ['Erica Rodriguez', '', 'Es la solución a tu negocio, súper recomendable'],
          ].map(([name, role, quote]) => (
            <Grid item xs={12} md={4} key={name}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar>{String(name).charAt(0)}</Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{name}</Typography>
                      {role ? <Typography variant="caption" color="text.secondary">{role}</Typography> : null}
                    </Box>
                  </Box>
                  <Typography variant="body2">“{quote}”</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Precios */}
      <Section id="precios">
        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Precios simples</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="overline">GRATIS 30 días</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>0 ARS</Typography>
                <Typography variant="body2" color="text.secondary">Sin datos de pago, todas las funciones, soporte WhatsApp</Typography>
              </CardContent>
              <CardActions>
                <Button fullWidth variant="contained" onClick={openStepper}>Comenzar</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="overline">Plan Profesional</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>$XX.XXX/mes</Typography>
                <Typography variant="body2" color="text.secondary">1 profesional, clientes ilimitados</Typography>
              </CardContent>
              <CardActions>
                <Button fullWidth variant="outlined" onClick={openStepper}>Probar</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="overline">Plan Empresa</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>$XX.XXX/profesional</Typography>
                <Typography variant="body2" color="text.secondary">Múltiples profesionales, reportes avanzados</Typography>
              </CardContent>
              <CardActions>
                <Button fullWidth variant="outlined" onClick={openStepper}>Probar</Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Section>

      {/* FAQ */}
      <Section id="faq" bg={COLORS.lightGray}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>Preguntas frecuentes</Typography>
        {[
          ['¿Tengo que cargar datos de pago para la prueba?', 'No. La prueba es 100% gratis por 30 días.'],
          ['¿Para qué tipo de negocios sirve?', 'Funciona excelente para belleza, salud y profesionales con turnos.'],
          ['¿Cobran comisión por turno?', 'No cobramos comisión por turno. Pagás solo tu plan.'],
          ['¿Puedo cancelar cuando quiera?', 'Sí, sin ataduras ni costos ocultos.'],
        ].map(([q, a]) => (
          <Accordion key={q} defaultExpanded={q.includes('pago')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>{q}</AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">{a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Section>

      {/* Footer CTA */}
      <Section bg={COLORS.primaryGreen}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" sx={{ color: COLORS.white, fontWeight: 800 }}>
              Comenzá a optimizar tu negocio hoy
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.white }}>
              Unite a todas las empresas que ya confían en Turnos Pro
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth size="large" variant="contained" onClick={openStepper} sx={{
              backgroundColor: COLORS.gold,
              color: COLORS.white,
              '&:hover': { backgroundColor: '#9c6d09' }
            }}>
              Probá GRATIS 30 días
            </Button>
          </Grid>
        </Grid>
      </Section>

      {/* Stepper Modal */}
      <Dialog open={stepperOpen} onClose={closeStepper} fullScreen={isMobile} maxWidth="md" fullWidth>
        <Box sx={{ position: 'relative' }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6 }} />
          <IconButton onClick={closeStepper} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
          <Typography variant="caption" sx={{ position: 'absolute', right: 48, top: 10 }}>
            {activeStep + 1} de 4
          </Typography>
        </Box>
        <DialogContent sx={{ minHeight: 420, p: { xs: 2, md: 4 } }}>
          <AnimatePresence mode="wait">
            {activeStep === 0 && (
              <motion.div key="step1" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.6 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>¿Qué tipo de negocio tenés?</Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>Elegí tu sector y contanos cómo se llama tu local</Typography>
                <Grid container spacing={2}>
                  {[
                    { key: 'barbershop', title: '💇‍♂️ Peluquería/Barbería', sub: 'Cortes, barba, tratamientos' },
                    { key: 'peluqueria', title: '💅 Centro de Estética', sub: 'Uñas, cejas, tratamientos' },
                    { key: 'aesthetics', title: '💆‍♀️ Spa/Masajes', sub: 'Relajación y bienestar' },
                    { key: 'aesthetics', title: '🏥 Consultorio', sub: 'Médico, kinesiología, etc.' },
                    { key: 'aesthetics', title: '📚 Clases/Asesorías', sub: 'Particulares, tutorías' },
                    { key: 'other', title: '🔧 Otro', sub: 'Servicios con turnos' },
                  ].map((opt) => (
                    <Grid item xs={12} sm={6} key={opt.title}>
                      <Card onClick={() => handleSelectBusiness(opt.key as BusinessType)} sx={{ cursor: 'pointer', border: businessType === (opt.key as BusinessType) ? `2px solid ${COLORS.primaryGreen}` : '1px solid #eee' }}>
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{opt.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{opt.sub}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {/* Nombre del local aparece luego de seleccionar el tipo */}
                <AnimatePresence>
                  {businessType && (
                    <motion.div
                      key="business-name"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Como se llama tu local?"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            error={subAvailable === false && businessName.trim().length > 0}
                            helperText={
                              checkingSub
                                ? 'Validando nombre…'
                                : subAvailable === false && businessName.trim().length > 0
                                ? 'Ese nombre ya está en uso. Probá con otra variante.'
                                : ' '
                            }
                          />
                        </Grid>
                      </Grid>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button variant="contained" disabled={!canStep1Continue()} onClick={() => { trackEvent('step_completed', { step: 1 }); autoAdvance(); }}>
                    Continuar
                  </Button>
                </Box>
              </motion.div>
            )}

            {activeStep === 1 && (
              <motion.div key="step2" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.6 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>¿Cuántos profesionales trabajan?</Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>Esto nos ayuda a configurar tu agenda perfecta</Typography>
                <Grid container spacing={2}>
                  {[
                    { key: 'solo', title: '👤 Solo yo', sub: 'Trabajo independiente' },
                    { key: 'small', title: '👥 2-5 profesionales', sub: 'Equipo pequeño' },
                    { key: 'large', title: '👨‍👩‍👧‍👦 6+ profesionales', sub: 'Empresa establecida' },
                  ].map((opt) => (
                    <Grid item xs={12} key={opt.title}>
                      <Card onClick={() => handleSelectTeam(opt.key as TeamSize)} sx={{ cursor: 'pointer', border: teamSize === (opt.key as TeamSize) ? `2px solid ${COLORS.primaryGreen}` : '1px solid #eee' }}>
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{opt.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{opt.sub}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {/* avance inmediato: sin spinner */}
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div key="step3" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.6 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>¿Cuál es tu mayor problema?</Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>Vamos a solucionarlo juntos</Typography>
                <Grid container spacing={2}>
                  {[
                    { key: 'noShows', title: '📱 Clientes que faltan sin avisar', sub: 'Pierdo tiempo y dinero por inasistencias' },
                    { key: 'whatsapp', title: '📞 Coordinar turnos por WhatsApp', sub: 'Paso horas respondiendo mensajes' },
                    { key: 'deposits', title: '💰 No poder cobrar señas fácilmente', sub: 'Necesito asegurar los turnos' },
                    { key: 'reports', title: '📊 No tener control de ingresos', sub: 'Quiero ver reportes claros' },
                  ].map((opt) => {
                    const checked = problems.includes(opt.key as MainProblem);
                    return (
                      <Grid item xs={12} key={opt.title}>
                        <Card
                          onClick={() => handleSelectProblem(opt.key as MainProblem)}
                          sx={{
                            cursor: 'pointer',
                            border: checked ? `2px solid ${COLORS.primaryGreen}` : '1px solid #eee',
                            backgroundColor: checked ? '#f3faf7' : 'inherit',
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Checkbox
                                checked={checked}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSelectProblem(opt.key as MainProblem);
                                }}
                                sx={{ p: 0.5, mr: 1 }}
                              />
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{opt.title}</Typography>
                                <Typography variant="body2" color="text.secondary">{opt.sub}</Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button variant="contained" onClick={() => { trackEvent('step_completed', { step: 3, problems }); autoAdvance(); }} disabled={problems.length === 0}>
                    Continuar
                  </Button>
                </Box>
              </motion.div>
            )}

            {activeStep === 3 && (
              <motion.div key="step4" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.6 }}>
               
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>💰 Vas a ahorrar:</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 800 }}>{formatNumberAr(savingsCalc.hours)} hs/sem</Typography><Typography variant="caption" color="text.secondary">en coordinación</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 800 }}>${formatNumberAr(savingsCalc.pesos)}/mes</Typography><Typography variant="caption" color="text.secondary">en inasistencias</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 800 }}>{savingsCalc.percent}%</Typography><Typography variant="caption" color="text.secondary">más turnos 24/7</Typography></CardContent></Card></Grid>
                </Grid>
                {/* Datos finales para crear la cuenta directamente en este paso */}
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Como es tu mail?</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="email" label="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Grid>
                </Grid>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 2 }}>QUE CONTRASEÑA LE PONEMOS?</Typography>
                <Typography variant="caption" color={password.length === 0 ? 'text.secondary' : (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}/.test(password) ? 'success.main' : 'error') as any}>
                  Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo. Ej: Turnospro.123!
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="password" label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="password" label="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={confirmPassword.length > 0 && confirmPassword !== password} />
                  </Grid>
                </Grid>
                {formError && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{formError}</Typography>}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button variant="contained" disabled={!canSubmit() || busy} onClick={register} sx={{ backgroundColor: COLORS.gold, '&:hover': { backgroundColor: '#9c6d09' } }}>
                    {busy ? <><CircularProgress size={18} sx={{ mr: 1 }} />Creando…</> : 'Llevame a la demo'}
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                 <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Tu solución personalizada</Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                  Esto es lo que Turnos Pro va a hacer por tu {businessType === 'barbershop' ? 'Peluquería/Barbería' : businessType === 'peluqueria' ? 'Centro de Estética' : 'negocio'}:
                </Typography>
                <Grid container spacing={2}>
                  {personalizedBenefits().map((b) => (
                    <Grid item xs={12} key={b}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ color: COLORS.success }} />
                        <Typography variant="body1">{b}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay after signup */}
      <AnimatePresence>
        {loadingOverlay && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.95)', zIndex: 1500 }}
          >
            <Container maxWidth="sm" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Creando tu agenda personalizada…</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configurando {businessType === 'barbershop' ? 'Peluquería/Barbería' : businessType === 'peluqueria' ? 'Centro de Estética' : 'negocio'} con las mejores prácticas
                </Typography>
                <Box sx={{ textAlign: 'left', mx: 'auto', maxWidth: 420 }}>
                  {checklist.map((t, i) => (
                    <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: i <= checklistIdx ? 1 : 0.3, transition: 'opacity .3s', py: 0.5 }}>
                      <CheckCircleIcon sx={{ color: i <= checklistIdx ? COLORS.success : '#bbb' }} />
                      <Typography variant="body2">{t}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default LandingPage;
