/**
 * /subscription/plans — Editorial Gazette redesign.
 *
 * Aesthetic: matches the landing + /login + /register pages — warm cream
 * paper, Fraunces italic display, JetBrains Mono kickers, forest/coral ink.
 * Replaces the prior generic Material card grid which was visually
 * disconnected from the rest of the app.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import {
  AllInclusive,
  Assessment,
  Close,
  Email,
  Groups,
  LocationOn,
  Palette,
  Payment,
  People,
  QrCode2,
  Sms,
  Storefront,
  WhatsApp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../services/api';

interface Plan {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isPopular: boolean;
  trialDays: number;
}

interface SubscriptionStatus {
  isActive: boolean;
  planType: string;
  planName: string;
  expiresAt?: string;
  monthlyAmount: number;
  daysRemaining: number;
  isTrialPeriod: boolean;
  trialEndsAt?: string;
  qrCodeData?: string;
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

// ────────────────────── Feature row ──────────────────────
const FeatureRow: React.FC<{
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
}> = ({ icon, text, highlight }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.75,
      py: 1.25,
      borderBottom: `1px dashed ${palette.rule}`,
      '&:last-of-type': { borderBottom: 'none' },
    }}
  >
    <Box
      sx={{
        width: 30,
        height: 30,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: highlight ? palette.secondary : palette.primary,
        backgroundColor: highlight
          ? 'rgba(232, 89, 60, 0.08)'
          : 'rgba(30, 94, 63, 0.08)',
        borderRadius: 0,
        '& svg': { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontFamily: fonts.body,
        fontSize: 14,
        color: palette.ink,
        fontWeight: highlight ? 600 : 400,
      }}
    >
      {text}
    </Typography>
  </Box>
);

const includedFeatures = [
  { icon: <AllInclusive />, text: 'Reservas ilimitadas' },
  { icon: <Storefront />, text: 'Servicios ilimitados' },
  { icon: <Groups />, text: 'Empleados ilimitados' },
  { icon: <People />, text: 'Clientes ilimitados' },
  { icon: <Payment />, text: 'Pagos online con MercadoPago' },
  { icon: <Palette />, text: 'Branding personalizado' },
  { icon: <Sms />, text: 'Notificaciones SMS' },
  { icon: <Email />, text: 'Email automático' },
  { icon: <Assessment />, text: 'Reportes y analytics' },
  { icon: <LocationOn />, text: 'Múltiples sucursales' },
];

// ────────────────────── Page ──────────────────────
const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    ensureFontsLoaded();
    fetchPlans();
    checkSubscriptionStatus();
  }, []);

  const fetchPlans = async () => {
    try {
      const hardcoded: Plan[] = [
        {
          code: 'basic',
          name: 'Plan Básico',
          description: 'Todo lo esencial para que tu agenda corra sola.',
          price: 15000,
          currency: 'ARS',
          isPopular: false,
          trialDays: 0,
        },
        {
          code: 'premium',
          name: 'Plan Premium',
          description: 'Suma WhatsApp con 100 mensajes incluidos por mes.',
          price: 20000,
          currency: 'ARS',
          isPopular: true,
          trialDays: 0,
        },
      ];
      setPlans(hardcoded);

      try {
        const response = await api.get('/subscription/plans');
        if (response.data && response.data.length > 0) setPlans(response.data);
      } catch {
        // hardcoded is the safe fallback
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscription/status');
      setCurrentStatus(response.data);
      if (response.data.qrCodeData && !response.data.isActive) {
        setQrCode(response.data.qrCodeData);
        setShowQrModal(true);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSubscribe = async (planCode: string) => {
    setSubscribing(planCode);
    setError(null);
    try {
      const response = await api.post('/subscription/subscribe', { planCode });
      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      } else if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
        setShowQrModal(true);
      } else {
        setError('No se pudo generar el link de pago. Probá de nuevo en un momento.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error procesando el pago. Probá nuevamente.');
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.paper,
        }}
      >
        <CircularProgress sx={{ color: palette.primary }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: palette.paper,
        fontFamily: fonts.body,
        color: palette.ink,
        position: 'relative',
        minHeight: '100vh',
        // Counter the AdminLayout's outer padding so the page reads as a
        // full editorial spread rather than a card-on-canvas.
        mx: { xs: -2, md: -3 },
        my: { xs: -2, md: -3 },
        px: { xs: 3, md: 6 },
        py: { xs: 4, md: 6 },
      }}
    >
      {/* Grain overlay */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRAIN_URL,
          backgroundSize: '220px 220px',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Masthead */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${palette.rule}`,
              pb: 1.5,
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: palette.inkFaint,
              }}
            >
              Sección · Suscripción
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: palette.inkFaint,
              }}
            >
              Planes &amp; precios
            </Typography>
          </Box>

          {/* Editorial header */}
          <Box sx={{ maxWidth: 720, mb: 4 }}>
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 10.5,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: palette.secondary,
                mb: 1.5,
                '&::before': {
                  content: '""',
                  display: 'inline-block',
                  width: 20,
                  height: '1px',
                  backgroundColor: palette.secondary,
                  verticalAlign: 'middle',
                  mr: 1.25,
                },
              }}
            >
              Crónica · Suscripción mensual
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: fonts.display,
                fontWeight: 400,
                fontStyle: 'italic',
                fontSize: { xs: 44, sm: 64 },
                lineHeight: 0.98,
                letterSpacing: '-0.025em',
                color: palette.ink,
                mb: 2,
                fontVariationSettings: '"opsz" 144, "SOFT" 30',
                '& .upright': { fontStyle: 'normal', fontWeight: 500 },
              }}
            >
              <span className="upright">Elegí</span> el plan que
              <br />
              acompaña tu negocio.
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontStyle: 'italic',
                fontSize: 17,
                lineHeight: 1.5,
                color: palette.inkSoft,
                maxWidth: 540,
              }}
            >
              {currentStatus?.isTrialPeriod
                ? `Te quedan ${currentStatus.daysRemaining} días de prueba — activá tu suscripción para que la agenda no se corte.`
                : 'Precios simples, todo incluido. Sin tarjetas escondidas.'}
            </Typography>
          </Box>

          {currentStatus?.isActive && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: 0,
                border: `1px solid ${palette.primary}`,
                backgroundColor: 'rgba(30, 94, 63, 0.06)',
                fontFamily: fonts.body,
                color: palette.ink,
                '& .MuiAlert-icon': { color: palette.primary },
              }}
            >
              <strong>Plan actual:</strong> {currentStatus.planName}
              {currentStatus.isTrialPeriod && (
                <> — período de prueba (quedan {currentStatus.daysRemaining} días)</>
              )}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{
                mb: 3,
                borderRadius: 0,
                border: `1px solid ${palette.secondary}`,
                backgroundColor: 'rgba(232, 89, 60, 0.08)',
                fontFamily: fonts.body,
                color: palette.ink,
                '& .MuiAlert-icon': { color: palette.secondary },
              }}
            >
              {error}
            </Alert>
          )}

          {/* Plans column-spread */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: { xs: 3, md: 4 },
              alignItems: 'stretch',
              mt: 2,
            }}
          >
            {plans.map((plan, idx) => {
              const isPopular = plan.isPopular;
              const isCurrent =
                currentStatus?.planType === plan.code && currentStatus?.isActive;
              return (
                <motion.div
                  key={plan.code}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + idx * 0.08 }}
                  style={{ height: '100%' }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      height: '100%',
                      backgroundColor: isPopular
                        ? '#FFFFFF'
                        : 'rgba(255, 255, 255, 0.45)',
                      border: `1px solid ${isPopular ? palette.ink : palette.rule}`,
                      padding: { xs: '32px 28px', md: '40px 36px' },
                      display: 'flex',
                      flexDirection: 'column',
                      // Editorial tab on the popular plan, similar to the
                      // testimonial card that escapes the gutter on /register.
                      '&::before': isPopular
                        ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '4px',
                            height: '100%',
                            backgroundColor: palette.secondary,
                          }
                        : undefined,
                      boxShadow: isPopular
                        ? '0 22px 40px -28px rgba(0,0,0,0.45)'
                        : 'none',
                    }}
                  >
                    {isPopular && (
                      <Typography
                        sx={{
                          fontFamily: fonts.mono,
                          fontSize: 10,
                          letterSpacing: '0.26em',
                          textTransform: 'uppercase',
                          color: palette.secondary,
                          mb: 2,
                        }}
                      >
                        ★ Edición recomendada
                      </Typography>
                    )}

                    <Typography
                      sx={{
                        fontFamily: fonts.mono,
                        fontSize: 10.5,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: palette.inkFaint,
                        mb: 1,
                      }}
                    >
                      {plan.code === 'premium' ? 'Premium · WhatsApp incluido' : 'Esencial · Todo lo del día a día'}
                    </Typography>

                    <Typography
                      component="h2"
                      sx={{
                        fontFamily: fonts.display,
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: { xs: 36, md: 44 },
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        color: palette.ink,
                        mb: 1.5,
                        fontVariationSettings: '"opsz" 144, "SOFT" 30',
                      }}
                    >
                      {plan.name}
                    </Typography>

                    {plan.description && (
                      <Typography
                        sx={{
                          fontFamily: fonts.display,
                          fontStyle: 'italic',
                          fontSize: 15.5,
                          color: palette.inkSoft,
                          mb: 3,
                          lineHeight: 1.5,
                        }}
                      >
                        {plan.description}
                      </Typography>
                    )}

                    {/* Price */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                      <Typography
                        sx={{
                          fontFamily: fonts.display,
                          fontWeight: 500,
                          fontSize: { xs: 52, md: 64 },
                          lineHeight: 1,
                          letterSpacing: '-0.03em',
                          color: palette.primary,
                          fontVariationSettings: '"opsz" 144',
                        }}
                      >
                        {formatPrice(plan.price)}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: fonts.mono,
                          fontSize: 11,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: palette.inkFaint,
                        }}
                      >
                        / mes
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        height: '1px',
                        backgroundColor: palette.rule,
                        my: 3,
                      }}
                    />

                    {/* Features list */}
                    <Box sx={{ flex: 1 }}>
                      {includedFeatures.map((f) => (
                        <FeatureRow key={f.text} icon={f.icon} text={f.text} />
                      ))}
                      <FeatureRow
                        icon={<WhatsApp />}
                        text={
                          plan.code === 'premium'
                            ? 'WhatsApp · 100 mensajes incluidos / mes'
                            : 'Notificaciones WhatsApp (no incluido)'
                        }
                        highlight={plan.code === 'premium'}
                      />
                    </Box>

                    {plan.code === 'premium' && (
                      <Typography
                        sx={{
                          fontFamily: fonts.mono,
                          fontSize: 10.5,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: palette.inkFaint,
                          mt: 1.5,
                          mb: 3,
                        }}
                      >
                        Después del 100, $50 por mensaje extra
                      </Typography>
                    )}

                    <Box sx={{ mt: 3 }}>
                      <PillCTA
                        variant={isPopular ? 'primary' : 'outline'}
                        disabled={subscribing !== null || isCurrent}
                        loading={subscribing === plan.code}
                        onClick={() => handleSubscribe(plan.code)}
                      >
                        {isCurrent ? 'Plan actual' : 'Contratar →'}
                      </PillCTA>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </Box>

          <SectionRule label="— Detalle del consumo de WhatsApp —" />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 6,
            }}
          >
            {[
              {
                kicker: '01',
                title: '100 mensajes incluidos',
                copy: 'Ya entran sin costo extra en el plan Premium. Recordatorios, confirmaciones y promos.',
              },
              {
                kicker: '02',
                title: '$50 por mensaje extra',
                copy: 'Pasado el cupo, cada mensaje adicional se factura al cierre del mes. Sin sorpresas.',
              },
              {
                kicker: '03',
                title: 'Cobro al cierre',
                copy: 'Vemos tu consumo, te lo informamos y se suma a la suscripción del mes siguiente.',
              },
            ].map((item) => (
              <Box
                key={item.kicker}
                sx={{
                  borderTop: `2px solid ${palette.ink}`,
                  pt: 2.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: 56,
                    lineHeight: 0.85,
                    color: palette.secondary,
                    fontVariationSettings: '"opsz" 144',
                    mb: 1.5,
                  }}
                >
                  {item.kicker}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontWeight: 500,
                    fontSize: 20,
                    color: palette.ink,
                    mb: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    color: palette.inkSoft,
                  }}
                >
                  {item.copy}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: `1px solid ${palette.rule}`,
              pt: 1.5,
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.22em',
              color: palette.inkFaint,
              textTransform: 'uppercase',
            }}
          >
            <span>© TurnosPro {new Date().getFullYear()}</span>
            <span>Pesos argentinos · Buenos Aires</span>
          </Box>
        </motion.div>
      </Container>

      {/* QR Payment Modal */}
      <Dialog
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: palette.paper,
            borderRadius: 0,
            border: `1px solid ${palette.ink}`,
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: fonts.display, fontWeight: 500, color: palette.ink }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Completá tu pago</span>
            <IconButton onClick={() => setShowQrModal(false)} sx={{ color: palette.ink }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <QrCode2 sx={{ fontSize: 48, color: palette.primary, mb: 2 }} />
            <Typography
              sx={{
                fontFamily: fonts.display,
                fontStyle: 'italic',
                fontSize: 22,
                color: palette.ink,
                mb: 1,
              }}
            >
              Escaneá el código con MercadoPago
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: palette.inkSoft,
                mb: 3,
              }}
            >
              Abrí MercadoPago en el celular y escaneá este QR para terminar la suscripción.
            </Typography>
            {qrCode && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <img
                  src={qrCode}
                  alt="QR Code para pago"
                  style={{ maxWidth: '300px', width: '100%' }}
                />
              </Box>
            )}
            <Alert
              severity="info"
              sx={{
                borderRadius: 0,
                fontFamily: fonts.body,
                border: `1px solid ${palette.rule}`,
                backgroundColor: 'rgba(30, 94, 63, 0.06)',
                '& .MuiAlert-icon': { color: palette.primary },
              }}
            >
              Una vez completado el pago la suscripción se activa sola.
            </Alert>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPlans;
