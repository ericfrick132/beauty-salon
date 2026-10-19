/**
 * /subscription/plans — planes freemium (Gratuito / Plus / Advance / Pro), Editorial Gazette skin.
 *
 * Aesthetic: matches the landing + /login + /register — warm cream paper, Fraunces italic display,
 * JetBrains Mono kickers, forest/coral ink, SVG grain overlay, coral-slide PillCTA, framer-motion.
 *
 * Contrato:
 *   - Planes:   GET  /subscription/plans (con el catálogo de respaldo de utils/plans). Fuera de Argentina ya
 *               vienen en la moneda de Stripe del país.
 *   - Plan:     GET  /subscription/status → planType (código efectivo; "free" si no paga), isPaid, planName.
 *   - Subir:    POST /preapproval/create { planCode, returnPath } → initPoint (débito de MP o Checkout de
 *               Stripe). Si ya tenía débito, el backend cambia el plan de esa suscripción (planChanged).
 *   - Bajar a Gratuito: POST /subscription/cancel.
 *   - ?highlight=<code> resalta un plan y lo lleva a la vista (lo usan los candados del panel y los add-ons).
 *   - ?from=<gate> (utils/planGates): de qué función bloqueada viene; arriba se lee "Para usar Cupones pasate al
 *     plan Advance".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  Check,
  EventAvailable,
  NotificationsActive,
  Payment,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { subscriptionApi, SubscriptionPlanInfo } from '../services/api';
import useTenantMoney from '../hooks/useTenantMoney';
import { useTenantWording } from '../utils/wording';
import { isPlanChanged, planChangedMessage } from '../utils/planChange';
import { bulletsByPlan, formatPlanPrice, OFFERED_PLAN_CODES, PLAN_FREE, usePlans } from '../utils/plans';
import { useSubscription } from '../contexts/SubscriptionContext';
import { gateMessage, isPlanGate } from '../utils/planGates';

interface CurrentStatus {
  isPaid: boolean;
  planType: string;
  planName: string;
  appleSubscriptionActive?: boolean;
  googlePlaySubscriptionActive?: boolean;
}

// ────────────────────── Editorial palette/fonts ──────────────────────
const palette = {
  paper: '#F4EFE6',
  paperDeep: '#EDE5D5',
  ink: '#171410',
  inkSoft: '#5C5347',
  inkFaint: '#8C8275',
  rule: 'rgba(23, 20, 16, 0.16)',
  primary: '#1E5E3F',
  primaryDeep: '#174A32',
  secondary: '#E8593C',
};

const fonts = {
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  body: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
};

const FONT_HREFS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,SOFT,wght@0,9..144,0..100,300..700;1,9..144,0..100,300..700&display=swap',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
];

function ensureFontsLoaded() {
  if (typeof document === 'undefined') return;
  for (const href of FONT_HREFS) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

// SVG grain overlay — matches the auth shell.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.09  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml;utf8,${GRAIN_SVG}")`;

// ────────────────────── Pill CTA (coral slide accent) ──────────────────────
const PillCTA: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  fullWidth?: boolean;
}> = ({ children, onClick, disabled, loading, variant = 'primary', fullWidth = true }) => {
  const isOutline = variant === 'outline';
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        width: fullWidth ? '100%' : 'auto',
        height: 52,
        padding: isOutline ? '0 28px' : 0,
        border: isOutline ? `1px solid ${palette.ink}` : 'none',
        outline: 'none',
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: disabled
          ? 'rgba(23, 20, 16, 0.08)'
          : isOutline
          ? 'transparent'
          : palette.primary,
        color: disabled
          ? 'rgba(23, 20, 16, 0.4)'
          : isOutline
          ? palette.ink
          : '#F4EFE6',
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: 14.5,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 0,
          backgroundColor: palette.secondary,
          transition: 'width 220ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          zIndex: 0,
        },
        '&:not(:disabled):hover::before': {
          width: isOutline ? 8 : 14,
        },
        '&:not(:disabled):hover': {
          backgroundColor: isOutline ? 'rgba(30, 94, 63, 0.04)' : palette.primaryDeep,
          borderColor: isOutline ? palette.primary : undefined,
        },
        '& > span': { position: 'relative', zIndex: 1 },
      }}
    >
      <span>
        {loading ? (
          <CircularProgress
            size={18}
            sx={{ color: isOutline ? palette.primary : '#F4EFE6' }}
          />
        ) : (
          children
        )}
      </span>
    </Box>
  );
};

// ────────────────────── Editorial section divider ──────────────────────
const SectionRule: React.FC<{ label: string }> = ({ label }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      my: 4,
      '&::before, &::after': {
        content: '""',
        flex: 1,
        height: '1px',
        backgroundColor: palette.rule,
      },
    }}
  >
    <Typography
      sx={{
        fontFamily: fonts.mono,
        fontSize: 10.5,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color: palette.inkFaint,
      }}
    >
      {label}
    </Typography>
  </Box>
);

/** Pie de la página de planes: moneda en la que se cobra la suscripción y ciudad, por país del negocio. */
const PLAN_FOOTER: Record<string, string> = {
  AR: 'Pesos argentinos · Buenos Aires',
  UY: 'Dólares · Montevideo',
  MX: 'Pesos mexicanos · Ciudad de México',
  ES: 'Euros · Madrid',
};

// ────────────────────── 1. SOCIAL PROOF ──────────────────────
const testimonials = [
  {
    quote:
      'Desde que uso TurnosPro las ausencias se desplomaron. La agenda se llena sola y los recordatorios laburan por mí.',
    name: 'Caro M.',
    role: 'Peluquería · Palermo',
  },
  {
    quote:
      'Cobro la seña online y dejé de perder turnos. En un mes recuperé varias veces lo que pago de suscripción.',
    name: 'Diego R.',
    role: 'Barbería · Córdoba',
  },
  {
    quote:
      'Ver los números del mes en un reporte me cambió la cabeza. Sé qué servicio rinde y cuándo agendar promos.',
    name: 'Vanina S.',
    role: 'Salón & spa · Rosario',
  },
];

const SocialProof: React.FC = () => (
  <Box sx={{ mb: 6 }}>
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: { xs: 2, md: 5 },
        borderBottom: `1px solid ${palette.rule}`,
        pb: 3,
        mb: 4,
      }}
    >
      {[
        { stat: '+1.200', label: 'negocios usan TurnosPro' },
        { stat: '−38%', label: 'menos ausencias promedio' },
        { stat: '4,9★', label: 'satisfacción de dueños' },
      ].map((item) => (
        <Box key={item.label}>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontStyle: 'italic',
              fontSize: { xs: 34, md: 42 },
              lineHeight: 1,
              color: palette.primary,
              fontVariationSettings: '"opsz" 144',
            }}
          >
            {item.stat}
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.mono,
              fontSize: 10.5,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: palette.inkFaint,
              mt: 0.75,
            }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: { xs: 2.5, md: 3.5 },
      }}
    >
      {testimonials.map((t, idx) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 + idx * 0.08 }}
        >
          <Box
            sx={{
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              border: `1px solid ${palette.rule}`,
              p: { xs: 2.5, md: 3 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              aria-hidden
              sx={{
                fontFamily: fonts.display,
                fontStyle: 'italic',
                fontSize: 40,
                lineHeight: 0.5,
                color: palette.secondary,
                mb: 1.5,
              }}
            >
              “
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.5,
                color: palette.ink,
                flex: 1,
                mb: 2.5,
              }}
            >
              {t.quote}
            </Typography>
            <Box>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: palette.ink,
                }}
              >
                {t.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.mono,
                  fontSize: 10.5,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: palette.inkFaint,
                  mt: 0.25,
                }}
              >
                {t.role}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  </Box>
);

// ────────────────────── 3. IMPACT BULLETS ──────────────────────
type ImpactBullet = { icon: React.ReactNode; title: string; copy: string };

const impactBullets: ImpactBullet[] = [
  {
    icon: <NotificationsActive />,
    title: 'Menos ausencias',
    copy: 'Recordatorios automáticos por WhatsApp, SMS y email para que el cliente no se olvide del turno.',
  },
  {
    icon: <EventAvailable />,
    title: 'Más reservas',
    copy: 'Tu agenda online abierta 24/7. Reservan solos, de noche y los fines de semana, sin que muevas un dedo.',
  },
  {
    icon: <Payment />,
    title: 'Cobrá online',
    copy: 'Seña o pago total con MercadoPago al reservar. Asegurás el turno y mejorás tu caja.',
  },
  {
    icon: <TrendingUp />,
    title: 'Reportes claros',
    copy: 'Mirá ingresos, servicios estrella y rendimiento del equipo. Decisiones con datos, no a ojo.',
  },
];

/** Las mismas tarjetas en tú con "cita" (México/España); España cobra con tarjeta (Stripe), sin Mercado Pago. */
const impactBulletsTu = (stripeDeposits: boolean, sena: string): ImpactBullet[] => [
  {
    icon: <NotificationsActive />,
    title: 'Menos ausencias',
    copy: 'Recordatorios automáticos por WhatsApp, SMS y email para que el cliente no se olvide de su cita.',
  },
  {
    icon: <EventAvailable />,
    title: 'Más reservas',
    copy: 'Tu agenda online abierta 24/7. Reservan solos, de noche y los fines de semana, sin que muevas un dedo.',
  },
  {
    icon: <Payment />,
    title: 'Cobra online',
    copy: stripeDeposits
      ? `${sena[0].toUpperCase()}${sena.slice(1)} o pago total con tarjeta al reservar. Aseguras la cita y mejoras tu caja.`
      : `${sena[0].toUpperCase()}${sena.slice(1)} o pago total con Mercado Pago al reservar. Aseguras la cita y mejoras tu caja.`,
  },
  {
    icon: <TrendingUp />,
    title: 'Reportes claros',
    copy: 'Mira ingresos, servicios estrella y rendimiento del equipo. Decisiones con datos, no a ojo.',
  },
];

const ImpactBullets: React.FC<{ bullets?: ImpactBullet[] }> = ({ bullets = impactBullets }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
      gap: { xs: 3, md: 3.5 },
      mb: 6,
    }}
  >
    {bullets.map((b, idx) => (
      <motion.div
        key={b.title}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 + idx * 0.07 }}
      >
        <Box sx={{ borderTop: `2px solid ${palette.ink}`, pt: 2.25 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: palette.secondary,
              backgroundColor: 'rgba(232, 89, 60, 0.08)',
              mb: 1.75,
              '& svg': { fontSize: 22 },
            }}
          >
            {b.icon}
          </Box>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: 21,
              color: palette.ink,
              letterSpacing: '-0.01em',
              mb: 0.75,
            }}
          >
            {b.title}
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: 1.55,
              color: palette.inkSoft,
            }}
          >
            {b.copy}
          </Typography>
        </Box>
      </motion.div>
    ))}
  </Box>
);

// ────────────────────── Page ──────────────────────
const SubscriptionPlans: React.FC = () => {
  const { plans, loading } = usePlans();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');
  const from = searchParams.get('from');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(null);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const { refresh: refreshSubscription } = useSubscription();
  // Argentina se ve como siempre; fuera de AR cambia la pasarela (Stripe), la moneda y el tono (tú en MX/ES).
  const { features, country } = useTenantMoney();
  const w = useTenantWording();
  const billsWithStripe = features.platformBilling === 'stripe';

  useEffect(() => {
    ensureFontsLoaded();
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setCurrentStatus(await subscriptionApi.status());
    } catch {
      /* sin sesión o sin red: se muestran los planes sin marcar el actual */
    }
  };

  // ?highlight=<code>: llevar el plan a la vista una vez cargado.
  useEffect(() => {
    if (!loading && highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, highlight]);

  const handleSubscribe = async (planCode: string) => {
    setSubscribing(planCode);
    setError(null);
    setSuccess(null);
    try {
      const data = await subscriptionApi.checkout(planCode);
      // Ya tenía el débito automático: el backend cambió el plan de esa misma suscripción (no hay link de pago).
      if (isPlanChanged(data)) {
        setSuccess(planChangedMessage(data));
        await checkSubscriptionStatus();
        refreshSubscription();
        return;
      }
      const url: string | undefined = data?.initPoint || data?.paymentUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError(data?.error || w.t('No se pudo generar el link de pago. Probá de nuevo en un momento.', 'No se pudo generar el enlace de pago. Inténtalo de nuevo en un momento.'));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || w.t('Error procesando el pago. Probá nuevamente.', 'Error procesando el pago. Inténtalo de nuevo.'));
    } finally {
      setSubscribing(null);
    }
  };

  const handleDowngrade = async () => {
    setCancelling(true);
    setError(null);
    setSuccess(null);
    try {
      await subscriptionApi.cancel();
      setConfirmDowngrade(false);
      setSuccess(w.t('Listo, cancelamos tu plan pago. Quedás en Gratuito.', 'Listo, cancelamos tu plan de pago. Quedas en Gratuito.'));
      await checkSubscriptionStatus();
      refreshSubscription();
    } catch (err: any) {
      setConfirmDowngrade(false);
      setError(err.response?.data?.error || w.t('No pudimos cancelar el plan. Probá de nuevo o escribinos.', 'No pudimos cancelar el plan. Inténtalo de nuevo o escríbenos.'));
    } finally {
      setCancelling(false);
    }
  };

  const bullets = useMemo(() => bulletsByPlan(plans, features.stripeDeposits), [plans, features.stripeDeposits]);
  const freePlan = plans.find((p) => p.code === PLAN_FREE);
  const highlightedPlan = highlight ? plans.find((p) => p.code === highlight) ?? null : null;
  const currentCode = currentStatus ? (currentStatus.isPaid ? currentStatus.planType : PLAN_FREE) : null;
  // Plan pago viejo (pro, promo, 6meses, 12meses): ya no se ofrece pero lo mantiene.
  const isLegacy = !!currentStatus?.isPaid && !OFFERED_PLAN_CODES.includes(currentStatus.planType);
  // Compras en la app de iOS/Android: se cancelan desde la tienda, no desde acá.
  const storeManaged = !!(currentStatus?.appleSubscriptionActive || currentStatus?.googlePlaySubscriptionActive);

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper }}>
        <CircularProgress sx={{ color: palette.primary }} />
      </Box>
    );
  }

  const ctaFor = (plan: SubscriptionPlanInfo) => {
    const isCurrent = currentCode === plan.code;
    if (isCurrent) return { label: 'Tu plan actual', disabled: true, onClick: undefined };
    if (plan.price <= 0) {
      if (!currentStatus?.isPaid) return { label: 'Tu plan actual', disabled: true, onClick: undefined };
      return {
        label: `Pasarme a ${plan.name}`,
        disabled: subscribing !== null || storeManaged,
        onClick: () => setConfirmDowngrade(true),
      };
    }
    return { label: `Pasarme a ${plan.name}`, disabled: subscribing !== null, onClick: () => handleSubscribe(plan.code) };
  };

  const alertSx = (color: string, bg: string) => ({
    mb: 3,
    borderRadius: 0,
    border: `1px solid ${color}`,
    backgroundColor: bg,
    fontFamily: fonts.body,
    color: palette.ink,
    '& .MuiAlert-icon': { color },
  });

  return (
    <Box
      sx={{
        backgroundColor: palette.paper,
        fontFamily: fonts.body,
        color: palette.ink,
        position: 'relative',
        minHeight: '100vh',
        // Counter the AdminLayout's outer padding so the page reads as a full editorial spread.
        mx: { xs: -2, md: -3 },
        my: { xs: -2, md: -3 },
        px: { xs: 2, sm: 3, md: 6 },
        py: { xs: 4, md: 6 },
        overflowX: 'hidden',
      }}
    >
      {/* Grain overlay */}
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0, backgroundImage: GRAIN_URL, backgroundSize: '220px 220px', opacity: 0.07, pointerEvents: 'none', zIndex: 0 }}
      />

      <Container maxWidth="lg" disableGutters sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Masthead */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${palette.rule}`, pb: 1.5, mb: 4 }}>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.inkFaint }}>
              Sección · Planes
            </Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.inkFaint }}>
              Planes &amp; precios
            </Typography>
          </Box>

          {/* ───────── HEADLINE ───────── */}
          <Box sx={{ maxWidth: 760, mb: 4 }}>
            <Typography
              sx={{
                fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: palette.secondary, mb: 1.5,
                '&::before': { content: '""', display: 'inline-block', width: 20, height: '1px', backgroundColor: palette.secondary, verticalAlign: 'middle', mr: 1.25 },
              }}
            >
              Gratis para siempre · Sin tarjeta
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: fonts.display, fontWeight: 400, fontStyle: 'italic', fontSize: { xs: 40, sm: 60 }, lineHeight: 0.98,
                letterSpacing: '-0.025em', color: palette.ink, mb: 2, fontVariationSettings: '"opsz" 144, "SOFT" 30',
                '& .upright': { fontStyle: 'normal', fontWeight: 500 },
              }}
            >
              <span className="upright">{w.t('Empezá gratis.', 'Empieza gratis.')}</span>
              <br />
              {w.t('Pasate de plan cuando crezcas.', 'Cambia de plan cuando crezcas.')}
            </Typography>
            <Typography sx={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: palette.inkSoft, maxWidth: 580 }}>
              {w.t(
                'Con el plan Gratuito ya recibís reservas online y cobrás. Cuando necesites más reservas, agendas, recordatorios o WhatsApp, elegí el plan que te queda. Cancelás cuando quieras.',
                'Con el plan Gratuito ya recibes reservas online y cobras. Cuando necesites más reservas, agendas, recordatorios o WhatsApp, elige el plan que te queda. Cancelas cuando quieras.')}
            </Typography>
          </Box>

          {isLegacy && currentStatus && (
            <Alert severity="success" sx={alertSx(palette.primary, 'rgba(30, 94, 63, 0.06)')}>
              {w.t(
                `Tenés el plan ${currentStatus.planName} (anterior), con todo incluido. Lo mantenés mientras siga activo; si te pasás a otro plan, ya no se puede volver.`,
                `Tienes el plan ${currentStatus.planName} (anterior), con todo incluido. Lo mantienes mientras siga activo; si cambias a otro plan, ya no se puede volver.`)}
            </Alert>
          )}

          {isPlanGate(from) && highlightedPlan && currentCode !== highlightedPlan.code && (
            <Alert severity="info" sx={alertSx(palette.primary, 'rgba(30, 94, 63, 0.06)')}>
              <strong>{w.t(gateMessage(from, highlightedPlan.name), gateMessage(from, highlightedPlan.name, true))}</strong>
            </Alert>
          )}

          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)} sx={alertSx(palette.primary, 'rgba(30, 94, 63, 0.06)')}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={alertSx(palette.secondary, 'rgba(232, 89, 60, 0.08)')}>
              {error}
            </Alert>
          )}

          {/* ───────── PRICING TIERS ───────── */}
          <SectionRule label={w.t('— Elegí tu plan —', '— Elige tu plan —')} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: { xs: 2.5, md: 3 },
              alignItems: 'stretch',
              mt: 1,
              mb: 2,
            }}
          >
            {plans.map((plan, idx) => {
              const isPopular = plan.isPopular;
              const isCurrent = currentCode === plan.code;
              const isHighlighted = highlight === plan.code;
              const emphasized = isPopular || isHighlighted;
              const cta = ctaFor(plan);

              return (
                <motion.div
                  key={plan.code}
                  ref={isHighlighted ? highlightRef : undefined}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + idx * 0.08 }}
                  style={{ height: '100%' }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      height: '100%',
                      backgroundColor: emphasized ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                      border: `${isHighlighted ? 2 : 1}px solid ${isHighlighted ? palette.secondary : isPopular ? palette.ink : palette.rule}`,
                      padding: { xs: '28px 22px', md: '32px 24px' },
                      display: 'flex',
                      flexDirection: 'column',
                      '&::before': isPopular
                        ? { content: '""', position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: palette.secondary }
                        : undefined,
                      boxShadow: emphasized ? '0 22px 40px -28px rgba(0,0,0,0.45)' : 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minHeight: 22, mb: 1.5 }}>
                      {isPopular && (
                        <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.secondary }}>
                          ★ Más elegido
                        </Typography>
                      )}
                      {isCurrent && (
                        <Typography
                          sx={{
                            fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase',
                            color: '#F4EFE6', backgroundColor: palette.primary, px: 1, py: 0.25, borderRadius: 999,
                          }}
                        >
                          Tu plan actual
                        </Typography>
                      )}
                    </Box>

                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 400, fontSize: { xs: 34, md: 38 }, lineHeight: 1,
                        letterSpacing: '-0.02em', color: palette.ink, mb: 1, fontVariationSettings: '"opsz" 144, "SOFT" 30',
                      }}
                    >
                      {plan.name}
                    </Typography>

                    {(plan.tagline || plan.description) && (
                      <Typography sx={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 15, color: palette.inkSoft, mb: 2.5, lineHeight: 1.45, minHeight: { lg: 44 } }}>
                        {plan.tagline || plan.description}
                      </Typography>
                    )}

                    {/* Price */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography
                        sx={{
                          fontFamily: fonts.display, fontWeight: 500, fontSize: { xs: 44, md: 42 }, lineHeight: 1,
                          letterSpacing: '-0.03em', color: palette.primary, fontVariationSettings: '"opsz" 144',
                        }}
                      >
                        {formatPlanPrice(plan)}
                      </Typography>
                      <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.inkFaint }}>
                        / mes
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.inkFaint, minHeight: 18 }}>
                      {plan.price <= 0 ? 'Gratis para siempre · Sin tarjeta' : w.t('Mes a mes · cancelás cuando quieras', 'Mes a mes · cancelas cuando quieras')}
                    </Typography>

                    <Box sx={{ height: '1px', backgroundColor: palette.rule, my: 2.5 }} />

                    {/* Bullets */}
                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, flex: 1 }}>
                      {(bullets[plan.code] ?? []).map((b, i) => {
                        const lead = i === 0 && b.startsWith('Todo lo del plan');
                        return (
                          <Box component="li" key={b} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 0.75 }}>
                            <Check sx={{ fontSize: 18, mt: '2px', color: lead ? palette.secondary : palette.primary, flexShrink: 0 }} />
                            <Typography sx={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.4, color: palette.ink, fontWeight: lead ? 600 : 400 }}>
                              {b}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    <Box sx={{ mt: 3 }}>
                      <PillCTA
                        variant={emphasized && !isCurrent ? 'primary' : 'outline'}
                        disabled={cta.disabled}
                        loading={subscribing === plan.code}
                        onClick={cta.onClick}
                      >
                        {cta.label}
                      </PillCTA>
                      <Typography
                        sx={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.inkFaint, textAlign: 'center', mt: 1.5, minHeight: 14 }}
                      >
                        {plan.price > 0
                          ? billsWithStripe ? 'Pago seguro con Stripe' : 'Débito automático con MercadoPago'
                          : storeManaged && currentStatus?.isPaid ? 'Tu plan se gestiona desde la tienda del celular' : ''}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </Box>

          <Typography sx={{ fontFamily: fonts.body, fontSize: 12.5, color: palette.inkFaint, textAlign: 'center', mt: 2.5, mb: 6 }}>
            {w.t(
              'La comisión se cobra solo sobre los cobros online de reservas. Los planes pagos se cobran por mes desde el día que los activás.',
              'La comisión se cobra solo sobre los cobros online de reservas. Los planes de pago se cobran por mes desde el día que los activas.')}
          </Typography>

          <SectionRule label="— Por qué TurnosPro —" />

          {/* ───────── IMPACT BULLETS + SOCIAL PROOF ───────── */}
          <ImpactBullets bullets={w.usesTu ? impactBulletsTu(features.stripeDeposits, w.sena) : impactBullets} />
          <SocialProof />

          {/* ───────── TRUST FOOTER ───────── */}
          <Box
            sx={{
              display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${palette.rule}`, pt: 1.5, fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em',
              color: palette.inkFaint, textTransform: 'uppercase',
            }}
          >
            <span>© TurnosPro {new Date().getFullYear()} · {PLAN_FOOTER[country.code] ?? 'Pesos argentinos · Buenos Aires'}</span>
            <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
              {[{ href: '/privacidad', label: 'Privacidad' }, { href: '/terminos', label: 'Términos' }].map((l) => (
                <Box
                  key={l.href}
                  component="a"
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ color: palette.inkFaint, textDecoration: 'none', borderBottom: '1px solid transparent', pb: '1px', '&:hover': { color: palette.secondary, borderColor: palette.secondary } }}
                >
                  {l.label}
                </Box>
              ))}
            </Box>
          </Box>
        </motion.div>
      </Container>

      {/* Bajar a Gratuito = cancelar el plan pago */}
      <Dialog open={confirmDowngrade} onClose={() => !cancelling && setConfirmDowngrade(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{w.t('¿Pasarte a Gratuito?', '¿Cambiar a Gratuito?')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {(() => {
              const f = freePlan?.features;
              const bookings = f && f.maxBookingsPerMonth > 0 ? f.maxBookingsPerMonth : 100;
              const pct = f ? f.commissionPercent : 5;
              return w.t(
                `Vas a quedar en Gratuito con ${bookings} reservas por mes y ${pct}% por cobro. Cancelamos tu débito automático y no se te cobra más.`,
                `Vas a quedar en Gratuito con ${bookings} reservas por mes y ${pct}% por cobro. Cancelamos tu cobro automático y no se te cobra más.`);
            })()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDowngrade(false)} disabled={cancelling}>{w.t('Seguir con mi plan', 'Seguir con mi plan')}</Button>
          <Button color="error" variant="contained" onClick={handleDowngrade} disabled={cancelling}>
            {cancelling ? <CircularProgress size={18} color="inherit" /> : w.t('Pasarme a Gratuito', 'Cambiar a Gratuito')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPlans;
