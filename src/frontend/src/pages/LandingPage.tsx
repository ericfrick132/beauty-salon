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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  InputAdornment,
  
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuIcon from '@mui/icons-material/Menu';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import {
  CalendarMonth,
  AccessTime,
  PeopleAlt,
  BarChart,
  Payments,
  ReceiptLong,
  Star,
  WhatsApp,
  DesignServices,
} from '@mui/icons-material';
import { selfRegistrationApi } from '../services/api';

type BusinessType =
  | 'peluqueria'
  | 'barberia'
  | 'estetica'
  | 'profesionales'
  | 'salud'
  // legacy mapping still supported
  | 'barbershop'
  | 'aesthetics'
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

// Estilos por categoría (vertical) para personalizar tonos
const VERTICAL_STYLES = {
  peluqueria: { primary: '#C2185B', accent: '#E91E63', bg1: '#FFF0F5', bg2: '#FFE4EC' },
  barberia: { primary: '#3E2723', accent: '#A1887F', bg1: '#F4EEE9', bg2: '#EFE9E5' },
  estetica: { primary: '#8E24AA', accent: '#F06292', bg1: '#FBF0FF', bg2: '#F6E6FF' },
  profesionales: { primary: '#1E88E5', accent: '#42A5F5', bg1: '#EEF4FF', bg2: '#E3EEFF' },
  salud: { primary: '#00897B', accent: '#26A69A', bg1: '#E9FBF7', bg2: '#D8F7F0' },
} as const;

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

// Variants for scroll-reveal and staggered children
const revealContainer = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// Animated number for stats
const AnimatedCounter: React.FC<{ value: number; prefix?: string; suffix?: string; duration?: number }> = ({ value, prefix = '', suffix = '', duration = 1.8 }) => {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString('es-AR'));
  const [display, setDisplay] = React.useState('0');

  React.useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(String(v)));
    return () => { controls.stop(); unsub(); };
  }, [value, duration, motionValue, rounded]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
    >
      {prefix}{display}{suffix}
    </motion.span>
  );
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const businessNameInputRef = useRef<HTMLInputElement | null>(null);
  type VerticalPref = 'peluqueria' | 'barberia' | 'estetica' | 'profesionales' | 'salud';
  const [verticalPref, setVerticalPref] = useState<VerticalPref | null>(null);
  const [verticalDialogOpen, setVerticalDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [problems, setProblems] = useState<MainProblem[]>([]);
  const [businessOptionIndex, setBusinessOptionIndex] = useState<number | null>(null);

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
    // Load user vertical preference from localStorage
    const pref = (localStorage.getItem('tp_vertical_pref') as VerticalPref | null);
    if (pref && ['peluqueria','barberia','estetica','profesionales','salud'].includes(pref)) {
      setVerticalPref(pref);
    } else {
      setVerticalDialogOpen(true);
    }
  }, []);

  const activeVertical = useMemo<VerticalPref>(() => {
    // Prefer stored preference, else derive from selected business type
    if (verticalPref) return verticalPref;
    switch (businessType) {
      case 'peluqueria': return 'peluqueria';
      case 'barberia':
      case 'barbershop': return 'barberia';
      case 'estetica':
      case 'aesthetics': return 'estetica';
      case 'salud': return 'salud';
      case 'profesionales': return 'profesionales';
      default: return 'peluqueria';
    }
  }, [verticalPref, businessType]);

  const themeStyle = VERTICAL_STYLES[activeVertical];

  const verticalCopy = useMemo(() => {
    const map: Record<VerticalPref, { title: string; subtitle: string }> = {
      peluqueria: { title: 'Tu agenda siempre llena, sin WhatsApp', subtitle: 'Reservas online, recordatorios y señas para peluquerías.' },
      barberia: { title: 'Más cortes, menos ausencias', subtitle: 'Agenda online, recordatorios y cobro de señas para barberías.' },
      estetica: { title: 'Agenda relajada para estética', subtitle: 'Tus clientas reservan 24/7; vos te enfocás en atender.' },
      profesionales: { title: 'Tu agenda profesional en orden', subtitle: 'Reservas, recordatorios y cobros simples en un solo lugar.' },
      salud: { title: 'Turnos claros para tus pacientes', subtitle: 'Agenda online con recordatorios y seguimiento de pacientes.' },
    };
    return map[activeVertical];
  }, [activeVertical]);

  // Assets por vertical (landscape para hero, square para tarjetas)
  const imageAssets = {
    peluqueria: {
      hero: '/assets/images-landing/vista-lateral-novia-feliz-con-telefono-inteligente.jpg',
      square: '/assets/images-landing/cliente-de-angulo-bajo-en-peluqueria-mirando-el-telefono.jpg',
    },
    barberia: {
      hero: '/assets/images-landing/vista-frontal-del-concepto-de-barberia.jpg',
      square: '/assets/images-landing/vista-frontal-del-concepto-de-barberia.jpg',
    },
    estetica: {
      hero: '/assets/images-landing/mujer-con-un-pincel-de-maquillaje-en-el-espejo.jpg',
      square: '/assets/images-landing/mujer-con-un-pincel-de-maquillaje-en-el-espejo.jpg',
    },
    profesionales: {
      hero: '/assets/images-landing/colegas-trabajando-juntos-en-el-proyecto.jpg',
      square: '/assets/images-landing/colegas-felices-de-trabajar-juntos.jpg',
    },
    salud: {
      hero: '/assets/images-landing/psicologo-de-sexo-masculino-confiado-que-se-sienta-en-silla-delante-de-su-paciente-femenino.jpg',
      square: '/assets/images-landing/vista-lateral-del-paciente-haciendo-ejercicios-supervisados-por-el-medico.jpg',
    },
  } as const;

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
    // Inject landing specific keyframes once
    const id = 'tp-landing-animations';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      @keyframes tpGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes tpFloatSlow { 0% { transform: translateY(0px); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0px); } }
      @keyframes tpPulseGlow { 0% { box-shadow: 0 0 0 0 rgba(0,0,0,0.15); } 70% { box-shadow: 0 0 0 14px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
    `;
    document.head.appendChild(style);
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
    setBusinessOptionIndex(null);
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

  const handleSelectBusiness = (bt: BusinessType, idx?: number) => {
    setBusinessType(bt);
    if (typeof idx === 'number') setBusinessOptionIndex(idx);
    trackEvent('business_type_selected', { businessType: bt });
    // En mobile, enfocar y hacer scroll al campo nombre al expandirse
    if (isMobile) {
      setTimeout(() => {
        const input = businessNameInputRef.current;
        if (input) {
          try { input.focus({ preventScroll: true }); } catch {}
          try { input.setSelectionRange(0, input.value.length); } catch {}
          const container = input.closest('.MuiGrid-item') || input.parentElement || undefined as any;
          try { container && (container as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        }
      }, 350); // esperar a que termine el Collapse
    }
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
      case 'barberia':
        return 'barbershop';
      case 'peluqueria':
        return 'peluqueria';
      case 'aesthetics':
      case 'estetica':
      case 'salud':
        return 'aesthetics';
      case 'profesionales':
        return 'other';
      default:
        return 'barbershop';
    }
  };

  const passwordOk = useMemo(() => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password), [password]);
  const emailOk = useMemo(() => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email), [email]);
  const submitIssues = useMemo(() => {
    const issues: string[] = [];
    if (!businessType) issues.push('Elegí el tipo de negocio');
    if (!emailOk) issues.push('Ingresá un email válido');
    if (!passwordOk) issues.push('La contraseña no cumple los requisitos');
    if (confirmPassword !== password) issues.push('La confirmación no coincide');
    if (businessName.trim().length < 2) issues.push('Escribí el nombre de tu local');
    if (subdomain.trim().length < 3) issues.push('El subdominio debe tener al menos 3 letras');
    return issues;
  }, [businessType, emailOk, passwordOk, confirmPassword, password, businessName, subdomain]);

  const canStep1Continue = () => {
    return !!businessType && businessName.trim().length >= 2 && subdomain.trim().length >= 3 && subAvailable !== false;
  };

  const canSubmit = () => {
    // No bloqueamos por disponibilidad aquí; se validará en el backend
    return (
      businessType !== null &&
      emailOk &&
      passwordOk &&
      password === confirmPassword &&
      businessName.trim().length >= 2 &&
      subdomain.trim().length >= 3
    );
  };

  const API_BASE = (process.env.REACT_APP_API_URL as string) || '/api';
  const [plans, setPlans] = useState<any[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch public plans (AllowAnonymous)
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/subscription-plans?isActive=true`);
        if (!res.ok) throw new Error('HTTP');
        const data = await res.json();
        setPlans(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (e) {
        setPlansError('No se pudieron cargar los planes');
      }
    })();
  }, [API_BASE]);

  const rootDomain = useMemo(() => {
    const host = window.location.hostname;
    return host.includes('localhost') || host.includes('127.0.0.1') ? 'localhost:3001' : 'turnos-pro.com';
  }, []);

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
      case 'barberia':
        bullets.push(
          'Reducí 70% las inasistencias con recordatorios',
          'Reservas corte + barba online 24/7',
          'Cobrá señas por Mercado Pago'
        );
        break;
      case 'peluqueria':
        bullets.push(
          'Coordiná tratamientos largos sin fricción',
          'Recordatorios automáticos reducen 70% las faltas',
          'Historial de clientes y servicios'
        );
        break;
      case 'aesthetics':
      case 'estetica':
        bullets.push(
          'Agenda sin WhatsApp: reservas 24/7',
          'Cobrá señas para terapias premium',
          'Seguimiento de clientes frecuentes'
        );
        break;
      case 'salud':
        bullets.push(
          'Agenda online con recordatorios a pacientes',
          'Historial y notas por paciente',
          'Cobro de señas para primeras consultas'
        );
        break;
      case 'profesionales':
        bullets.push(
          'Reservas 24/7 desde tu link',
          'Recordatorios por WhatsApp y Email',
          'Cobro de señas y reportes simples'
        );
        break;
      default:
        bullets.push(
          'Reservas 24/7 desde cualquier dispositivo',
          'Recordatorios por WhatsApp y Email',
          'Cobro de señas por Mercado Pago'
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
      {/* Vertical Selector Dialog */}
      <Dialog open={verticalDialogOpen} onClose={() => setVerticalDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>¿Qué tipo de negocio tenés?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Esto nos ayuda a personalizar la experiencia.</Typography>
          <Grid container spacing={1}>
            {[
              { key: 'peluqueria', title: 'Peluquería' },
              { key: 'barberia', title: 'Barbería' },
              { key: 'estetica', title: 'Estética' },
              { key: 'profesionales', title: 'Profesionales' },
              { key: 'salud', title: 'Salud' },
            ].map((v) => (
              <Grid item xs={12} key={v.key}>
                <Button
                  fullWidth
                  variant={verticalPref === (v.key as VerticalPref) ? 'contained' : 'outlined'}
                  onClick={() => {
                    const k = v.key as VerticalPref;
                    setVerticalPref(k);
                    localStorage.setItem('tp_vertical_pref', k);
                    setVerticalDialogOpen(false);
                  }}
                >
                  {v.title}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
      {/* Login Redirect Dialog */}
      <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Ingresar al panel</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Poné tu email de administrador y te llevamos a tu cuenta.</Typography>
          {loginError && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>{loginError}</Typography>
          )}
          <TextField
            autoFocus
            fullWidth
            type="email"
            label="Tu email"
            value={loginEmail}
            onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setLoginDialogOpen(false)} sx={{ mr: 1 }} disabled={loginBusy}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(loginEmail) || loginBusy}
              onClick={async () => {
                try {
                  setLoginBusy(true);
                  setLoginError('');
                  const res = await fetch(`${API_BASE}/public/tenant-by-email?email=${encodeURIComponent(loginEmail)}`);
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.error || 'No encontramos una cuenta con ese email');
                  }
                  const data = await res.json();
                  const sub = data?.subdomain;
                  const domain = data?.domain || (window.location.hostname.includes('localhost') ? 'localhost:3001' : 'turnos-pro.com');
                  if (!sub) throw new Error('No se pudo resolver el subdominio');
                  const protocol = window.location.hostname.includes('localhost') ? 'http:' : 'https:';
                  window.location.href = `${protocol}//${sub}.${domain}/login`;
                } catch (e) {
                  const msg = (e as any)?.message || 'No pudimos redirigirte. Probá de nuevo.';
                  setLoginError(msg);
                } finally {
                  setLoginBusy(false);
                }
              }}
            >
              {loginBusy ? <><CircularProgress size={18} sx={{ mr: 1 }} />Buscando…</> : 'Ingresar'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <AppBar position="sticky" color="default" elevation={0} sx={{ backgroundColor: COLORS.white, borderBottom: '1px solid #eee', color: '#1a1a1a' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: themeStyle.primary }}>
            Turnos Pro
          </Typography>
          {/* Desktop nav */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, alignItems: 'center' }}>
            <Button color="inherit" sx={{ color: '#1a1a1a' }} href="#features">Características</Button>
            <Button color="inherit" sx={{ color: '#1a1a1a' }} href="#precios">Precios</Button>
            <Button color="inherit" sx={{ color: '#1a1a1a' }} href="#faq">FAQ</Button>
            <Button color="inherit" sx={{ color: '#1a1a1a' }} onClick={() => setLoginDialogOpen(true)}>Ingresar</Button>
            <Button
              variant="contained"
              onClick={openStepper}
              sx={{
                backgroundColor: themeStyle.accent,
                color: COLORS.white,
                '&:hover': { backgroundColor: '#9c6d09', transform: 'translateY(-2px)' },
                transition: 'all .3s'
              }}
            >
              Probá GRATIS 30 días
            </Button>
          </Box>
          {/* Mobile nav trigger */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center' }}>
            <Button
              size="small"
              variant="contained"
              onClick={openStepper}
              sx={{
                mr: 1.5,
                backgroundColor: themeStyle.accent,
                color: COLORS.white,
                px: 1.5,
                '&:hover': { backgroundColor: '#9c6d09' }
              }}
            >
              Probar gratis
            </Button>
            <IconButton aria-label="menu" onClick={() => setMobileNavOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        <Box role="presentation" sx={{ width: 260 }} onClick={() => setMobileNavOpen(false)}>
          <List>
            {[
              { label: 'Características', href: '#features' },
              { label: 'Precios', href: '#precios' },
              { label: 'FAQ', href: '#faq' },
            ].map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton component="a" href={item.href}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton onClick={openStepper}>
                <ListItemText primary="Probá GRATIS 30 días" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setVerticalDialogOpen(true); }}>
                <ListItemText primary="Cambiar sector" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setLoginDialogOpen(true)}>
                <ListItemText primary="Ingresar" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Hero */}
      <Box sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${themeStyle.bg1}, ${themeStyle.bg2}, ${COLORS.white})`,
        backgroundSize: '200% 200%',
        animation: 'tpGradientShift 12s ease infinite',
      }}>
        <Box aria-hidden sx={{
          position: 'absolute', top: { xs: '8%', md: '12%' }, left: { xs: '-40px', md: '2%' },
          width: { xs: 160, md: 260 }, height: { xs: 160, md: 260 }, borderRadius: '50%',
          filter: 'blur(40px)', opacity: 0.14, zIndex: 0,
          background: themeStyle.accent,
          transform: `translateY(${parallax * 0.4}px)`,
          animation: 'tpFloatSlow 10s ease-in-out infinite',
        }} />
        <Box aria-hidden sx={{
          position: 'absolute', bottom: { xs: '-40px', md: '0' }, right: { xs: '-40px', md: '4%' },
          width: { xs: 200, md: 320 }, height: { xs: 200, md: 320 }, borderRadius: '50%',
          filter: 'blur(50px)', opacity: 0.12, zIndex: 0,
          background: themeStyle.primary,
          transform: `translateY(${parallax * -0.2}px)`,
          animation: 'tpFloatSlow 12s ease-in-out infinite',
        }} />
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 14 } }}>
          <motion.div {...heroMotion}>
            <Chip label="✨ Sin datos de pago requeridos" sx={{ mb: 2, backgroundColor: COLORS.white }} />
            <Typography variant="h1" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 800, lineHeight: 1.2, color: COLORS.black }}>
              {verticalCopy.title}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2, maxWidth: 720, color: '#333', fontSize: { xs: 16, md: undefined } }}>
              {verticalCopy.subtitle}
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
              <Button size={isMobile ? 'medium' : 'large'} fullWidth={isMobile} variant="contained" onClick={openStepper} endIcon={<ArrowForwardIcon />} sx={{
                backgroundColor: themeStyle.accent,
                color: COLORS.white,
                px: 3,
                py: { xs: 1.1, sm: 1.2 },
                '&:hover': { backgroundColor: '#9c6d09', transform: 'translateY(-2px)' },
                transition: 'all .3s',
                animation: 'tpPulseGlow 2.8s ease-out infinite'
              }}>
                Probá GRATIS 30 días
              </Button>
              <Typography variant="body2" sx={{ color: '#666', textAlign: { xs: 'center', sm: 'left' } }}>Tu tiempo, nuestra prioridad</Typography>
            </Box>
            {/* Hero image personalized by vertical */}
            <Box sx={{ mt: 4 }}>
              {(() => {
                const selected = verticalPref || 'peluqueria';
                const heroSrc = (imageAssets as any)[selected].hero as string;
                return (
                  <motion.img
                    src={heroSrc}
                    srcSet={`${heroSrc} 600w, ${heroSrc} 1200w, ${heroSrc} 1800w`}
                    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 90vw, 920px"
                    alt="Imagen de referencia del negocio"
                    style={{ width: '100%', maxWidth: 920, display: 'block', borderRadius: 16, objectFit: 'cover' }}
                    loading="eager"
                    decoding="async"
                    initial={{ opacity: 0, scale: 0.98, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    whileHover={{ scale: 1.01 }}
                  />
                );
              })()}
            </Box>
          </motion.div>

          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: `translateY(${parallax}px)` }} />
        </Container>
      </Box>

      {/* Stats with counters */}
      <Section>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Grid container spacing={3}>
            {[
              { value: 12000, prefix: '+', suffix: '', label: 'negocios nos recomiendan' },
              { value: 82, prefix: '', suffix: '%', label: 'menos inasistencias' },
              { value: 24, prefix: '', suffix: '/7', label: 'reservas online' },
            ].map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <motion.div variants={revealItem}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <CardContent>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.primaryGreen }}>
                        <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Section>

      {/* Features */}
      <Section id="features" bg={COLORS.lightGray}>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Todo lo que tu negocio necesita</Typography>
          <Grid container spacing={3}>
            {[
              { icon: <CalendarMonth color="primary" />, title: 'Tu agenda', desc: 'Definí días y horarios; bloqueá almuerzos y días off.' },
              { icon: <WhatsApp sx={{ color: '#25D366' }} />, title: 'WhatsApp', desc: 'Tus clientes reciben un recordatorio un día antes de su cita.' },
              { icon: <Payments color="primary" />, title: 'Cobro de señas', desc: 'Para reservar, pagan la seña que vos definas.' },
              { icon: <PeopleAlt color="primary" />, title: 'Staff', desc: 'Administrá todo el staff desde un mismo panel.' },
              { icon: <DesignServices color="primary" />, title: 'Servicios personalizados', desc: 'Creá tus servicios para barbería, estética o lo que hagas.' },
              { icon: <AccessTime color="primary" />, title: 'Recordatorios automáticos', desc: 'Reducí inasistencias con WhatsApp y Email.' },
            ].map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <motion.div variants={revealItem} whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ mb: 1 }}>{f.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
          </Grid>
        </motion.div>
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>Otras funciones</AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {[
                { icon: <PeopleAlt color="primary" />, title: 'Gestión de Clientes', desc: 'Historial y fichas detalladas' },
                { icon: <BarChart color="primary" />, title: 'Reportes en Tiempo Real', desc: 'Decisiones con datos claros' },
                { icon: <ReceiptLong color="primary" />, title: 'Facturación AFIP', desc: 'Emití facturas con un click' },
              ].map((f) => (
                <Grid item xs={12} sm={6} md={4} key={f.title}>
                  <motion.div whileHover={{ y: -3 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ mb: 1 }}>{f.icon}</Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{f.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Section>

      {/* Para quién es */}
      <Section>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>¿Para quién es?</Typography>
          <Grid container spacing={3}>
          {[ 
            { key: 'peluqueria', title: '💇‍♀️ Peluquería', desc: 'Color, corte, peinado y más' },
            { key: 'barberia', title: '🧔 Barbería', desc: 'Cortes, barba y afeitado' },
            { key: 'estetica', title: '💅 Estética', desc: 'Uñas, faciales, pestañas, spa' },
            { key: 'salud', title: '🏥 Salud', desc: 'Consultorios, kinesiología, terapias' },
            { key: 'profesionales', title: '📚 Profesionales', desc: 'Clases, asesorías y servicios' },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.key}>
              <motion.div variants={revealItem} whileHover={{ scale: 1.01 }}>
              <Card>
                <Box sx={{ p: 1 }}>
                  {(() => {
                    const sq = (imageAssets as any)[item.key].square as string;
                    return (
                      <img
                        src={sq}
                        srcSet={`${sq} 300w, ${sq} 600w, ${sq} 900w`}
                        sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        alt={item.title}
                        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 12 }}
                        loading="lazy"
                        decoding="async"
                      />
                    );
                  })()}
                </Box>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </CardContent>
              </Card>
              </motion.div>
            </Grid>
          ))}
          </Grid>
        </motion.div>
      </Section>

      {/* Beneficios */}
      <Section bg={COLORS.lightGray}>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        <Grid container spacing={3}>
          {[
            ['🚀 Mayor Productividad', 'Automatizá la gestión de turnos y enfocate en lo importante'],
            ['😊 Satisfacción del Cliente', 'Reservas fáciles y rápidas desde cualquier dispositivo'],
            ['⏰ Ahorro de Tiempo', 'Menos coordinación manual, más ventas'],
          ].map(([t, d]) => (
            <Grid item xs={12} md={4} key={t}>
              <motion.div variants={revealItem} whileHover={{ y: -4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{t}</Typography>
                    <Typography variant="body2" color="text.secondary">{d}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
        </motion.div>
      </Section>

      {/* Trust */}
      <Section>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        <Grid container spacing={3}>
          {[
            '600+ empresas confían en nosotros',
            '5/5 estrellas en Google (+145 reseñas)',
            '50.000+ usuarios activos',
            'Soporte en español',
          ].map((t) => (
            <Grid item xs={12} sm={6} md={3} key={t}>
              <motion.div variants={revealItem}>
                <Card sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Star sx={{ color: COLORS.gold }} />
                    <Typography variant="body2" sx={{ mt: 1 }}>{t}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
        </motion.div>
      </Section>

      {/* Testimonios */}
      <Section bg={COLORS.lightGray}>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Lo que dicen nuestros clientes</Typography>
          <Grid container spacing={3}>
          {[
            ['Gaby Conde', 'Esteticista', 'Me cambió totalmente el trabajo, te ahorra tiempo y problema con el tema de las señas'],
            ['Angie Aicardi', '', 'Mis turnos incrementaron, ya que los clientes sacan turnos las 24hs'],
            ['Erica Rodriguez', '', 'Es la solución a tu negocio, súper recomendable'],
          ].map(([name, role, quote]) => (
            <Grid item xs={12} md={4} key={name}>
              <motion.div variants={revealItem} whileHover={{ y: -3 }}>
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
              </motion.div>
            </Grid>
          ))}
          </Grid>
        </motion.div>
      </Section>

      {/* Precios */}
      <Section id="precios">
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Precios simples</Typography>
          <Grid container spacing={3}>
          {(plans.length > 0 ? plans : []).map((plan) => (
            <Grid item xs={12} md={4} key={plan.code}>
              <motion.div variants={revealItem} whileHover={{ y: -4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="overline">{plan.name}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {new Intl.NumberFormat('es-AR', { style: 'currency', currency: plan.currency || 'ARS', maximumFractionDigits: 0 }).format(plan.price || 0)} / mes
                    </Typography>
                    {plan.description && (
                      <Typography variant="body2" color="text.secondary">{plan.description}</Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button fullWidth variant="outlined" onClick={openStepper}>Probar</Button>
                  </CardActions>
                </Card>
              </motion.div>
            </Grid>
          ))}
          {plans.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">{plansError || 'Cargando planes...'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          </Grid>
        </motion.div>
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
              backgroundColor: themeStyle.accent,
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
                    { key: 'peluqueria', title: '💇‍♀️ Peluquería', sub: 'Color, corte, peinado' },
                    { key: 'barberia', title: '🧔 Barbería', sub: 'Corte + barba' },
                    { key: 'estetica', title: '💅 Estética', sub: 'Uñas, faciales, pestañas' },
                    { key: 'salud', title: '🏥 Salud', sub: 'Consultorios y terapias' },
                    { key: 'profesionales', title: '📚 Profesionales', sub: 'Clases, asesorías y servicios' },
                  ].map((opt, idx) => (
                    <Grid item xs={12} sm={6} key={`${opt.title}-${idx}`}>
                      <Card onClick={() => { handleSelectBusiness(opt.key as BusinessType, idx); setVerticalPref(opt.key as VerticalPref); localStorage.setItem('tp_vertical_pref', opt.key as VerticalPref); }} sx={{ cursor: 'pointer', border: businessOptionIndex === idx ? `2px solid ${themeStyle.primary}` : '1px solid #eee' }}>
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{opt.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{opt.sub}</Typography>
                        </CardContent>
                      </Card>
                      {/* Mobile: Campo y continuar debajo de la opción seleccionada */}
                      {isMobile && (
                        <Collapse in={businessOptionIndex === idx} timeout={300} unmountOnExit>
                          <Box sx={{ mt: 1 }}>
                            <TextField
                              fullWidth
                              label="Como se llama tu local?"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              inputRef={businessNameInputRef}
                              error={subAvailable === false && businessName.trim().length > 0}
                              helperText={
                                checkingSub
                                  ? 'Validando nombre…'
                                  : businessName.trim().length < 2
                                  ? 'Escribí al menos 2 caracteres'
                                  : subdomain.trim().length < 3
                                  ? 'El subdominio debe tener al menos 3 letras'
                                  : subAvailable === false
                                  ? 'Ese nombre ya está en uso. Probá con otra variante.'
                                  : subdomain
                                  ? `Tu URL será: https://${subdomain}.${rootDomain}`
                                  : ' '
                              }
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    {checkingSub ? (
                                      <CircularProgress size={16} />
                                    ) : subAvailable === true ? (
                                      <CheckCircleIcon color="success" fontSize="small" />
                                    ) : subAvailable === false ? (
                                      <WarningAmberIcon color="warning" fontSize="small" />
                                    ) : null}
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                disabled={!canStep1Continue()}
                                onClick={() => {
                                  trackEvent('step_completed', { step: 1 });
                                  autoAdvance();
                                }}
                                sx={{ backgroundColor: themeStyle.accent, '&:hover': { backgroundColor: '#9c6d09' } }}
                              >
                                Continuar
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>
                      )}
                    </Grid>
                  ))}
                </Grid>
                {/* Desktop/Tablet: campo y continuar al final, no inline */}
                {!isMobile && (
                  <AnimatePresence>
                    {businessType && (
                      <motion.div
                        key="business-name-desktop"
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
                                  : businessName.trim().length < 2
                                  ? 'Escribí al menos 2 caracteres'
                                  : subdomain.trim().length < 3
                                  ? 'El subdominio debe tener al menos 3 letras'
                                  : subAvailable === false
                                  ? 'Ese nombre ya está en uso. Probá con otra variante.'
                                  : subdomain
                                  ? `Tu URL será: https://${subdomain}.${rootDomain}`
                                  : ' '
                              }
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    {checkingSub ? (
                                      <CircularProgress size={16} />
                                    ) : subAvailable === true ? (
                                      <CheckCircleIcon color="success" fontSize="small" />
                                    ) : subAvailable === false ? (
                                      <WarningAmberIcon color="warning" fontSize="small" />
                                    ) : null}
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                        </Grid>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                {!isMobile && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant="contained" disabled={!canStep1Continue()} onClick={() => { trackEvent('step_completed', { step: 1 }); autoAdvance(); }}>
                      Continuar
                    </Button>
                  </Box>
                )}
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
                    <Button variant="contained" disabled={!canSubmit() || busy} onClick={register} sx={{ backgroundColor: themeStyle.accent, '&:hover': { backgroundColor: '#9c6d09' } }}>
                      {busy ? <><CircularProgress size={18} sx={{ mr: 1 }} />Creando…</> : 'Llevame a la demo'}
                    </Button>
                </Box>
                {!canSubmit() && !busy && (
                  <Box sx={{ mt: 1 }}>
                    {submitIssues.map((txt) => (
                      <Typography key={txt} variant="caption" color="error" display="block">
                        • {txt}
                      </Typography>
                    ))}
                    {subAvailable === false && (
                      <Typography variant="caption" color="warning.main" display="block">
                        • Ese subdominio ya está en uso. Podés intentar otra variante.
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />
                
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>💰 Vas a ahorrar:</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 800 }}>{formatNumberAr(savingsCalc.hours)} hs/sem</Typography><Typography variant="caption" color="text.secondary">en coordinación</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 800 }}>${formatNumberAr(savingsCalc.pesos)}/mes</Typography><Typography variant="caption" color="text.secondary">en inasistencias</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} md={4}><Card><CardContent><Typography variant="h6" sx={{ fontWeight: 800 }}>{savingsCalc.percent}%</Typography><Typography variant="caption" color="text.secondary">más turnos 24/7</Typography></CardContent></Card></Grid>
                </Grid>
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
