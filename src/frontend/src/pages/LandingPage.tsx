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
  Snackbar,
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
// GSAP core + plugins
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
// React integration for GSAP hook
// @ts-ignore
import { useGSAP } from '@gsap/react';
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

// SplitText (premium) no se importa para evitar fallos de build.
// Se usa un fallback que simula el revelado por palabra.
let SplitTextRef: any = null; // reservado si el usuario lo injerta globalmente

// Registrar plugins GSAP (después de imports para cumplir import/first)
gsap.registerPlugin(ScrollTrigger, TextPlugin, useGSAP as any);

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
  primary: '#2563EB',      // blue-600
  accent: '#10B981',       // emerald-500
  text: '#0F172A',         // slate-900
  subtext: '#475569',      // slate-600
  surface: '#FFFFFF',
  background: '#F8FAFC',
  success: '#16A34A',
  // Backwards-compat aliases used in this file
  black: '#0F172A',
  white: '#FFFFFF',
  primaryGreen: '#10B981',
  lightGray: '#F1F5F9',    // slate-100
  gold: '#F59E0B',         // amber-500
};

// MercadoPago brand color
const MP_BLUE = '#00b1ea';

// Estilos por categoría (vertical) para personalizar tonos
const VERTICAL_STYLES = {
  peluqueria: { primary: COLORS.primary, accent: COLORS.accent, bg1: COLORS.background, bg2: COLORS.surface },
  barberia: { primary: COLORS.primary, accent: COLORS.accent, bg1: COLORS.background, bg2: COLORS.surface },
  estetica: { primary: COLORS.primary, accent: COLORS.accent, bg1: COLORS.background, bg2: COLORS.surface },
  profesionales: { primary: COLORS.primary, accent: COLORS.accent, bg1: COLORS.background, bg2: COLORS.surface },
  salud: { primary: COLORS.primary, accent: COLORS.accent, bg1: COLORS.background, bg2: COLORS.surface },
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

// Lazy import heavy animations (confetti, particles) only when needed
const loadHeavy = () => import('./landing/HeavyAnimations');

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

// Basic text splitter fallback when SplitText plugin is unavailable
const splitTextWords = (el: HTMLElement) => {
  const words = el.textContent?.split(/\s+/) || [];
  el.innerHTML = words
    .map((w) => `<span class="split-word" style="display:inline-block; white-space:pre">${w} </span>`)
    .join('');
  return Array.from(el.querySelectorAll('.split-word')) as HTMLElement[];
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
  const navbarRef = useRef<HTMLDivElement | null>(null);
  const heroTitleRef = useRef<HTMLHeadingElement | null>(null);
  const heroBadgeRef = useRef<HTMLDivElement | null>(null);
  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const heroStatsRef = useRef<HTMLDivElement | null>(null);

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
  const [videoOpen, setVideoOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

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

  // Floating toast and scroll progress
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const p = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const names = ['Barbería Los Amigos', 'Peluquería Glam', 'Estética Mía', 'Kine Jorge'];
    const timer = window.setInterval(() => {
      const msg = `${names[Math.floor(Math.random() * names.length)]} se registró hace 1 min`;
      setToastMsg(msg);
      setToastOpen(true);
    }, 35000);
    return () => { window.removeEventListener('scroll', onScroll); window.clearInterval(timer); };
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

  type StatSpec = { value: number; label: string; prefix?: string; suffix?: string };
  // Copy por vertical para el HERO (enfatiza MercadoPago)
  const heroCopy = useMemo<{ badge: string; h1: string; subtitle: string; stat: StatSpec }>(() => {
    const c: Record<VerticalPref, { badge: string; h1: string; subtitle: string; stat: StatSpec }> = {
      peluqueria: {
        badge: '🎯 82% menos inasistencias con señas',
        h1: 'Cobrá señas. Eliminá faltas.',
        subtitle: 'MercadoPago integrado. Tus clientas pagan la seña online y quedan confirmadas automáticamente.',
        stat: { value: 3500000, prefix: '$', label: 'En señas cobradas/mes' },
      },
      barberia: {
        badge: '💈 +600 barberías cobrando automático',
        h1: 'Tu barbería cobrando señas 24/7',
        subtitle: 'Los clientes reservan y pagan la seña por MercadoPago. Sin WhatsApp, sin drama.',
        stat: { value: 95, suffix: '%', label: 'Reducción en no-shows' },
      },
      estetica: {
        badge: '💅 80% menos cancelaciones',
        h1: 'Reservas con seña, sin excusas',
        subtitle: 'Confirmación automática con MercadoPago y recordatorios por WhatsApp.',
        stat: { value: 10000, prefix: '+', label: 'Reservas confirmadas/mes' },
      },
      profesionales: {
        badge: '📚 Agenda profesional bajo control',
        h1: 'Cobrás anticipado. Atendés mejor.',
        subtitle: 'Señas por MercadoPago + recordatorios + agenda inteligente.',
        stat: { value: 24, suffix: '/7', label: 'Reservas online' },
      },
      salud: {
        badge: '🏥 Consultas confirmadas al instante',
        h1: 'Señas para reducir inasistencias',
        subtitle: 'MercadoPago + recordatorios automáticos para pacientes.',
        stat: { value: 82, suffix: '%', label: 'Menos no-shows' },
      },
    };
    return c[activeVertical];
  }, [activeVertical]);

  // Assets por vertical (usa archivos reales en public/assets/images-landing)
  // Si faltan imágenes específicas para alguna vertical, se reusa una genérica.
  const imageAssets = {
    peluqueria: {
      hero: '/assets/images-landing/peluqueria.jpg',
      square: '/assets/images-landing/peluqueria1.jpg',
    },
    barberia: {
      hero: '/assets/images-landing/barberia.jpg',
      square: '/assets/images-landing/barberia2.jpg',
    },
    estetica: {
      hero: '/assets/images-landing/estetica.jpg',
      square: '/assets/images-landing/estetica.jpg',
    },
    profesionales: {
      hero: '/assets/images-landing/estetica.jpg',
      square: '/assets/images-landing/estetica.jpg',
    },
    salud: {
      hero: '/assets/images-landing/estetica.jpg',
      square: '/assets/images-landing/estetica.jpg',
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

  // Si el usuario injerta SplitText global (window.SplitText), lo registramos.
  useEffect(() => {
    try {
      // @ts-ignore
      const maybe = (window as any)?.SplitText;
      if (maybe) {
        SplitTextRef = maybe;
        gsap.registerPlugin(maybe);
      }
    } catch {}
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
      .animated-element { will-change: transform, opacity; }
      .price-card { perspective: 1000px; }
      .price-card-inner { position: relative; transform-style: preserve-3d; transition: transform .6s; }
      .price-card:hover .price-card-inner { transform: rotateY(180deg); }
      .price-face { position:absolute; inset:0; backface-visibility:hidden; }
      .price-back { transform: rotateY(180deg); }
      .magnetic { position: relative; overflow: hidden; }
      .magnetic .magnet { position: absolute; inset: 0; pointer-events: none; transform: translate(0,0); }
      .link-underline { background-image: linear-gradient(currentColor, currentColor); background-position: 0% 100%; background-repeat: no-repeat; background-size: 0% 2px; transition: background-size .3s; }
      .link-underline:hover { background-size: 100% 2px; }
      .tilt { transform: perspective(800px) rotateX(0) rotateY(0); transition: transform .2s ease; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    setProgress(((activeStep + 1) / TOTAL_STEPS) * 100);
  }, [activeStep]);

  // NAVBAR animations: logo, items stagger, CTA pulse + background on scroll
  useGSAP(() => {
    // Stagger menu items on mount
    gsap.from('.nav-item', { y: -20, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out' });
    gsap.from('.nav-logo', { x: -30, opacity: 0, duration: 0.6, ease: 'power2.out' });
    gsap.from('.nav-cta', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });

    // Background opacity change on scroll
    if (navbarRef.current) {
      const el = navbarRef.current;
      gsap.to(el, {
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'saturate(180%) blur(8px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        scrollTrigger: {
          trigger: document.body,
          start: 'top -10',
          end: '+=1',
          scrub: true,
        },
      });
    }
  }, []);

  // HERO: Split text reveal, floating badge, parallax/zoom image, counters
  useGSAP(() => {
    // Text reveal
    if (heroTitleRef.current) {
      const el = heroTitleRef.current;
      let targets: HTMLElement[] = [];
      if (SplitTextRef) {
        // @ts-ignore
        const split = new SplitTextRef(el, { type: 'words' });
        targets = split.words as HTMLElement[];
      } else {
        targets = splitTextWords(el);
      }
      gsap.fromTo(
        targets,
        { y: 24, opacity: 0, rotateX: -30 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.1 }
      );
    }

    // Floating badge motion
    if (heroBadgeRef.current) {
      gsap.to(heroBadgeRef.current, { y: -10, repeat: -1, yoyo: true, ease: 'sine.inOut', duration: 1.6 });
      gsap.to(heroBadgeRef.current, { x: 6, rotate: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut', duration: 2.2 });
    }

    // Parallax + zoom on hero image
    if (heroImgRef.current) {
      gsap.fromTo(
        heroImgRef.current,
        { scale: 0.98, y: 12, opacity: 0 },
        {
          scale: 1.03,
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: heroImgRef.current, start: 'top 80%' },
        }
      );
    }

    // Counter animation for hero stats (if present)
    if (heroStatsRef.current) {
      const nodes = Array.from(heroStatsRef.current.querySelectorAll('.counter')) as HTMLElement[];
      nodes.forEach((n) => {
        const target = Number(n.dataset.target || '0');
        gsap.fromTo(
          n,
          { textContent: 0 },
          {
            textContent: target,
            duration: 2,
            ease: 'power2.inOut',
            snap: { textContent: target > 1000 ? 100 : 1 },
            scrollTrigger: { trigger: n, start: 'top 90%', once: true },
            onUpdate() {
              const v = Math.ceil(Number((this as any).targets()[0].textContent));
              const pfx = n.dataset.prefix || '';
              const sfx = n.dataset.suffix || '';
              if (pfx === '$') {
                n.innerHTML = pfx + v.toLocaleString('es-AR') + sfx;
              } else {
                n.innerHTML = pfx + v.toLocaleString('es-AR') + sfx;
              }
            },
          }
        );
      });
    }
  }, []);

  // Micro-interactions: magnetic buttons and tilt cards
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    // Tilt effect on cards
    const tilts = Array.from(document.querySelectorAll('.tilt')) as HTMLElement[];
    tilts.forEach((el) => {
      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (py - 0.5) * -8; // rotateX
        const ry = (px - 0.5) * 8; // rotateY
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      };
      const onLeave = () => { el.style.transform = 'perspective(800px) rotateX(0) rotateY(0)'; };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      cleanups.push(() => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); });
    });
    // Magnetic hover
    const mags = Array.from(document.querySelectorAll('.magnetic')) as HTMLElement[];
    mags.forEach((btn) => {
      const magnet = btn.querySelector('.magnet') as HTMLElement | null;
      const onMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
        btn.style.transform = `translate(${x}px, ${y}px)`;
        if (magnet) magnet.style.transform = `translate(${x * 2}px, ${y * 2}px)`;
      };
      const onLeave = () => { btn.style.transform = 'translate(0,0)'; if (magnet) magnet.style.transform = 'translate(0,0)'; };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      cleanups.push(() => { btn.removeEventListener('mousemove', onMove); btn.removeEventListener('mouseleave', onLeave); });
    });
    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

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

  // MercadoPago payment flow timeline (plays in its section)
  const paymentFlowTl = useRef<gsap.core.Timeline | null>(null);
  const initPaymentFlow = () => {
    if (paymentFlowTl.current) return;
    paymentFlowTl.current = gsap
      .timeline({ repeat: -1, repeatDelay: 2 })
      .set('.phone-mockup', { x: -40, opacity: 0 })
      .to('.phone-mockup', { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
      .to('.payment-icon', { scale: 1.2, color: MP_BLUE, duration: 0.4, ease: 'back.out(1.7)' }, '<0.1')
      .to('.checkmark', { scale: 1, opacity: 1, rotate: 360, duration: 0.6, ease: 'power4.out' })
      .to('.client-avatar', { boxShadow: '0 0 20px #4caf50', borderColor: '#4caf50', duration: 0.6 }, '<')
      .add(() => {
        // Use promise chain to avoid async callback type mismatch
        loadHeavy()
          .then((mod) => {
            mod.launchConfetti?.({ particleCount: 80 });
          })
          .catch(() => {});
      });
  };

  // Start MercadoPago flow timeline when section enters viewport
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: '#mercadopago',
      start: 'top 70%',
      once: true,
      onEnter: () => initPaymentFlow(),
    });
    return () => { try { st.kill(); } catch {} };
  }, []);

  // ScrollTrigger batch for feature cards
  useEffect(() => {
    ScrollTrigger.batch('.feature-card', {
      onEnter: (els: Element[]) => {
        gsap.fromTo(
          els as any,
          { y: 100, opacity: 0, rotateX: -90 },
          { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out' }
        );
      },
      once: true,
    });
    // No cleanup global para no afectar otros triggers
    return () => {};
  }, []);

  // Final CTA: confetti on enter + countdown + glitch/scramble effect
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: '#final-cta',
      onEnter: async () => {
        try { const mod = await loadHeavy(); mod.launchConfetti?.({ particleCount: 120 }); } catch {}
        // Text reveal effect
        const el = document.querySelector('.glitch-text');
        if (el) {
          try {
            const txt = (el as HTMLElement).textContent ?? '';
            gsap.to(el, { duration: 0.8, text: txt });
          } catch {
            // fallback pulse
            gsap.fromTo(el, { opacity: 0.6 }, { opacity: 1, duration: 0.8 });
          }
        }
      },
      once: true,
      start: 'top 80%',
    });

    // Countdown 24h rolling
    const countdownEl = document.getElementById('cta-countdown');
    let stop = false;
    const end = Date.now() + 24 * 60 * 60 * 1000;
    const tick = () => {
      if (stop) return;
      const rem = Math.max(0, end - Date.now());
      const hh = String(Math.floor(rem / 3600000)).padStart(2, '0');
      const mm = String(Math.floor((rem % 3600000) / 60000)).padStart(2, '0');
      const ss = String(Math.floor((rem % 60000) / 1000)).padStart(2, '0');
      if (countdownEl) countdownEl.textContent = `${hh}:${mm}:${ss}`;
      requestAnimationFrame(tick);
    };
    tick();
    return () => { stop = true; try { trigger.kill(); } catch {} };
  }, []);

  // Animate testimonial star ratings on scroll
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.stars-fill')) as HTMLElement[];
    els.forEach((el) => {
      gsap.fromTo(
        el,
        { width: 0 },
        { width: '100%', duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }
      );
    });
    return () => {};
  }, []);

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
      <AppBar ref={navbarRef as any} position="sticky" color="default" elevation={0} sx={{ backgroundColor: COLORS.white, borderBottom: '1px solid #eee', color: '#1a1a1a', transition: 'background .3s, box-shadow .3s, backdrop-filter .3s' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography className="nav-logo" variant="h6" sx={{ fontWeight: 800, color: themeStyle.primary }}>
            Turnos Pro
          </Typography>
          {/* Desktop nav */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, alignItems: 'center' }}>
            <Button className="nav-item" color="inherit" sx={{ color: '#1a1a1a' }} href="#features">Características</Button>
            <Button className="nav-item" color="inherit" sx={{ color: '#1a1a1a' }} href="#precios">Precios</Button>
            <Button className="nav-item" color="inherit" sx={{ color: '#1a1a1a' }} href="#faq">FAQ</Button>
            <Button className="nav-item" color="inherit" sx={{ color: '#1a1a1a' }} onClick={() => setLoginDialogOpen(true)}>Ingresar</Button>
            {/* Vertical selector */}
            <TextField
              className="nav-item"
              select
              size="small"
              value={activeVertical}
              onChange={(e) => { const v = e.target.value as any; setVerticalPref(v); localStorage.setItem('tp_vertical_pref', v); }}
              SelectProps={{ native: true }}
              sx={{ minWidth: 160 }}
            >
              {['peluqueria','barberia','estetica','salud','profesionales'].map((v) => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
              ))}
            </TextField>
            <Button
              className="nav-cta magnetic"
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
              <span className="magnet" />
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
            <Chip ref={heroBadgeRef as any} label={heroCopy.badge} sx={{ mb: 2, backgroundColor: COLORS.white }} />
            <Typography ref={heroTitleRef as any} variant="h1" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 800, lineHeight: 1.2, color: COLORS.black }}>
              {heroCopy.h1}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2, maxWidth: 720, color: '#333', fontSize: { xs: 16, md: undefined } }}>
              {heroCopy.subtitle}
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
                    ref={heroImgRef as any}
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
            {/* Hero stats with GSAP counters */}
            <Box ref={heroStatsRef as any} className="hero-stats" sx={{ mt: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography className="counter" data-prefix={heroCopy.stat.prefix || ''} data-suffix={heroCopy.stat.suffix || ''} data-target={heroCopy.stat.value} variant="h5" sx={{ fontWeight: 800 }}>
                  0
                </Typography>
                <Typography variant="caption" color="text.secondary">{heroCopy.stat.label}</Typography>
              </Box>
              <Box>
                <Typography className="counter" data-target={12000} data-prefix="+" variant="h5" sx={{ fontWeight: 800 }}>0</Typography>
                <Typography variant="caption" color="text.secondary">Negocios activos</Typography>
              </Box>
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

      {/* Métricas animadas */}
      <Section>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>Números que cuentan</Typography>
          <Grid container spacing={3}>
            {[
              { value: 12000, label: 'Negocios activos', prefix: '+' },
              { value: 3500000, label: 'En señas cobradas/mes', prefix: '$' },
              { value: 82, label: 'Menos no-shows', suffix: '%' },
              { value: 24, label: 'Reservas online', suffix: '/7' },
            ].map((m) => (
              <Grid item xs={6} md={3} key={m.label}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography className="counter" data-target={m.value} data-prefix={m.prefix || ''} data-suffix={m.suffix || ''} variant="h4" sx={{ fontWeight: 800 }}>
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{m.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Section>

      {/* Cómo funciona */}
      <Section>
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>Cómo funciona</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List>
                {[
                  { key: 'step-crear', title: 'Creá tu cuenta', desc: 'Ingresá el nombre de tu negocio y subdominio' },
                  { key: 'step-mp', title: 'Conectá MercadoPago', desc: 'Un click para vincular tu cuenta y cobrar señas' },
                  { key: 'step-compartir', title: 'Compartí tu link', desc: 'Tus clientes reservan y pagan la seña 24/7' },
                ].map((s, i) => (
                  <ListItemButton key={s.key} onClick={() => {
                    if (i === 0) gsap.from('.form-demo', { scale: 0, duration: 0.5, ease: 'back.out(2)' });
                    if (i === 1) gsap.to('.mp-logo', { rotation: 360, scale: 1.2, duration: 0.6, ease: 'back.out(2)' });
                    if (i === 2) gsap.from('.share-icons > *', { x: -100, opacity: 0, stagger: 0.1, duration: 0.4, ease: 'power2.out' });
                  }}>
                    <ListItemText primary={s.title} secondary={s.desc} />
                  </ListItemButton>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Card className="form-demo" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Tu negocio</Typography>
                    <TextField fullWidth size="small" placeholder="Como se llama tu local?" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
                  <img className="mp-logo" alt="MercadoPago" src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.23.1/mercadopago/logo__large.png" style={{ height: 28 }} />
                  <Typography variant="body2">Conectado</Typography>
                </Box>
                <Box className="share-icons" sx={{ display: 'flex', gap: 1 }}>
                  <Chip label="WhatsApp" />
                  <Chip label="Instagram" />
                  <Chip label="Link directo" />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </motion.div>
      </Section>

      {/* MercadoPago destacado */}
      <Section id="mercadopago">
        <motion.div variants={revealContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="overline" sx={{ color: MP_BLUE }}>MercadoPago</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                Cobrá señas automáticamente con MercadoPago
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Configurá el monto de seña y confirmá turnos al instante. Sin comisiones extra por turno.
              </Typography>
              <Grid container spacing={1}>
                {[
                  'QR en recepción para pagar',
                  'Links de pago por WhatsApp',
                  'Cobro recurrente mensual',
                  'Sin comisiones extras',
                  'Cliente habilitado al instante',
                  'Reportes de cobros',
                ].map((t) => (
                  <Grid item xs={12} sm={6} key={t}>
                    <Box className="tilt" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                      <CheckCircleIcon sx={{ color: COLORS.success }} />
                      <Typography variant="body2">{t}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: 280, height: 560, borderRadius: 36, border: '2px solid #eee', p: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', position: 'relative' }}>
                  <Box className="phone-mockup" sx={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', background: '#fafafa', position: 'relative' }}>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Avatar className="client-avatar" sx={{ width: 32, height: 32, border: '2px solid transparent' }}>A</Avatar>
                        <Typography variant="body2">Agos reservó Corte + Color</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Payments className="payment-icon" sx={{ color: '#555' }} />
                        <Typography variant="body2">Seña solicitada: $2.000</Typography>
                      </Box>
                      <Card sx={{ mt: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2">Checkout MercadoPago</Typography>
                          <LinearProgress variant="determinate" value={70} sx={{ my: 1 }} />
                          <Box className="checkmark" sx={{ width: 36, height: 36, borderRadius: '50%', background: '#e8f5e9', color: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0)', opacity: 0 }}>
                            ✓
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  </Box>
                  {/* floating confetti area handled by HeavyAnimations */}
                </Box>
              </Box>
            </Grid>
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
                  <Card className="feature-card tilt" sx={{ height: '100%' }}>
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
                    <Box className="stars" sx={{ mt: 1, position: 'relative', width: 120, height: 20 }}>
                      <Box sx={{ position: 'absolute', inset: 0, color: '#ddd' }}>
                        {Array.from({ length: 5 }).map((_, i) => (<Star key={i} fontSize="small" />))}
                      </Box>
                      <Box className="stars-fill" sx={{ position: 'absolute', inset: 0, width: 0, overflow: 'hidden', color: '#FFD700' }}>
                        {Array.from({ length: 5 }).map((_, i) => (<Star key={i} fontSize="small" />))}
                      </Box>
                    </Box>
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
          {(plans.length > 0 ? plans.slice(0,3) : [
            { code: 'trial', name: 'PRUEBA', price: 0, currency: 'ARS', description: 'Gratis 30 días' },
            { code: 'pro', name: 'PROFESIONAL', price: 0, currency: 'ARS', description: 'Plan recomendado' },
            { code: 'premium', name: 'PREMIUM', price: 0, currency: 'ARS', description: 'Para equipos grandes' },
          ]).map((plan, idx) => (
            <Grid item xs={12} md={4} key={plan.code}>
              <motion.div variants={revealItem} whileHover={{ y: -4 }}>
                <Box className="price-card">
                  <Card className="price-card-inner" sx={{ borderRadius: 2, position: 'relative' }}>
                    {/* Front */}
                    <Box className="price-face" sx={{ p: 2 }}>
                      <Typography variant="overline">{plan.name}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {idx === 0 ? 'Gratis 30 días' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: plan.currency || 'ARS', maximumFractionDigits: 0 }).format(plan.price || 0) + ' / mes'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>✨ MercadoPago incluido sin costo extra</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button className="magnetic" fullWidth variant="contained" onClick={openStepper}>Empezar</Button>
                      </Box>
                      {idx === 1 && (
                        <Chip label="POPULAR" color="warning" size="small" sx={{ position: 'absolute', top: 8, right: 8, boxShadow: '0 0 16px rgba(255,215,0,0.6)' }} />
                      )}
                    </Box>
                    {/* Back */}
                    <Box className="price-face price-back" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {['Reservas 24/7','WhatsApp automático','Señas por MercadoPago','Reportes en vivo','Sin comisiones por turno'].map((f) => (
                        <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                          <Typography variant="body2">{f}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                </Box>
              </motion.div>
            </Grid>
          ))}
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

      {/* Final CTA */}
      <Section id="final-cta" bg={COLORS.primaryGreen}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" className="glitch-text" sx={{ color: COLORS.white, fontWeight: 800 }}>
              Tu competencia ya cobra señas automáticamente
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.white }}>
              Oferta termina en: <span id="cta-countdown">23:59:47</span>
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

      {/* Floating elements */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 1, zIndex: 2000 }}>
        <Button
          variant="contained"
          startIcon={<WhatsApp />}
          onClick={() => window.open('https://wa.me/5491123456789?text=Quiero%20probar%20Turnos%20Pro', '_blank')}
          sx={{
            background: '#25D366', color: '#fff',
            animation: 'tpFloatSlow 6s ease-in-out infinite',
            '&:hover': { background: '#1EBE57' },
          }}
        >
          WhatsApp
        </Button>
        <IconButton
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{ position: 'relative', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" stroke="#eee" strokeWidth="4" fill="none" />
            <circle cx="18" cy="18" r="16" stroke={theme.palette.primary.main} strokeWidth="4" fill="none" strokeDasharray="100" strokeDashoffset={`${100 - Math.round(scrollProgress)}%`} />
          </svg>
        </IconButton>
      </Box>

      {/* Demo video modal */}
      <Dialog open={videoOpen} onClose={() => setVideoOpen(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
            <iframe
              title="Demo Turnos Pro"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Social proof toast */}
      <Snackbar open={toastOpen} onClose={() => setToastOpen(false)} autoHideDuration={5000} message={toastMsg} />
    </Box>
  );
};

export default LandingPage;
