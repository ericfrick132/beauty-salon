/**
 * /empezar — paso día 0 después del alta: la prueba gratis arranca dejando la tarjeta en
 * Mercado Pago (preapproval con free_trial). MP no cobra hasta que termina la prueba y después
 * renueva solo cada mes.
 *
 * Se entra con ?nuevo=1 desde el registro (título de bienvenida) o rebotando desde cualquier
 * pantalla privada mientras no haya tarjeta. La tarjeta es OBLIGATORIA: no hay forma de
 * postergarla, la prueba entera está detrás de dejarla (ver useCardGate).
 *
 * Flujo: elegir plan → POST /preapproval/create { planCode, returnPath } → init_point de MP →
 * vuelve a /subscription/success?flow=trial → onboarding (o panel si ya lo completó).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import api, { tenantApi } from '../services/api';

interface Plan {
  code: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  isPopular?: boolean;
  trialDays?: number;
}

interface SubscriptionStatus {
  isActive: boolean;
  isTrialPeriod: boolean;
  daysRemaining: number;
  trialEndsAt?: string | null;
  planType?: string;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : null;

const fmtPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0 }).format(amount);

const ActivateSubscription: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isFreshSignup = params.has('nuevo');

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [onboardingDone, setOnboardingDone] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  // Adónde seguir después de la tarjeta (o al saltearla): onboarding si falta, si no el panel.
  const nextPath = onboardingDone ? '/dashboard' : '/completar-perfil';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, plansRes, preRes, cfgRes] = await Promise.allSettled([
          api.get('/subscription/status'),
          api.get('/subscription/plans'),
          api.get('/preapproval/status'),
          tenantApi.getConfig(),
        ]);
        if (cancelled) return;

        const cfg = cfgRes.status === 'fulfilled' ? (cfgRes.value as any) : null;
        const done = !!cfg?.onboardingCompletedAt;
        setOnboardingDone(done);

        // Ya dejó la tarjeta: acá no hay nada que hacer.
        if (preRes.status === 'fulfilled' && preRes.value.data?.hasActivePreapproval) {
          navigate(done ? '/dashboard' : '/completar-perfil', { replace: true });
          return;
        }

        // Red de contención: un cliente con plan activo (pagó por plataforma, transferencia o
        // manual) no tiene por qué ver esta pantalla. Si llegó acá por un rebote equivocado,
        // lo devolvemos al panel en vez de decirle que se le terminó una prueba que no tiene.
        const paid = statusRes.status === 'fulfilled' ? statusRes.value.data : null;
        if (paid?.isActive && !paid?.isTrialPeriod) {
          navigate(done ? '/dashboard' : '/completar-perfil', { replace: true });
          return;
        }

        let st: SubscriptionStatus | null = statusRes.status === 'fulfilled' ? statusRes.value.data : null;
        if (!st && statusRes.status === 'rejected' && (statusRes.reason as any)?.response?.status === 404) {
          // Sin fila de suscripción todavía: la creamos como hace el panel.
          try {
            await api.post('/subscription/initialize-trial');
            st = (await api.get('/subscription/status')).data;
          } catch {
            st = null;
          }
        }
        setStatus(st);

        const list: Plan[] = plansRes.status === 'fulfilled' && Array.isArray(plansRes.value.data)
          ? plansRes.value.data.filter((p: Plan) => p.price > 0 && p.code !== 'demo')
          : [];
        setPlans(list);
        const preferred = list.find((p) => p.isPopular) ?? list.find((p) => p.code === 'pro') ?? list[0];
        setSelected(preferred?.code ?? 'pro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const trialDaysLeft = useMemo(() => {
    if (status?.trialEndsAt) {
      return Math.max(0, Math.ceil((new Date(status.trialEndsAt).getTime() - Date.now()) / 86_400_000));
    }
    return status?.isTrialPeriod ? Math.max(0, status.daysRemaining ?? 0) : 0;
  }, [status]);
  const firstChargeDate = fmtDate(status?.trialEndsAt);
  const expired = trialDaysLeft <= 0;
  const selectedPlan = plans.find((p) => p.code === selected);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      const res = await api.post('/preapproval/create', {
        planCode: selected || 'pro',
        returnPath: '/subscription/success?flow=trial',
      });
      const initPoint: string | undefined = res.data?.initPoint;
      if (!res.data?.success || !initPoint) {
        throw new Error(res.data?.error || 'No pudimos iniciar el pago. Intentá de nuevo.');
      }
      window.location.href = initPoint;
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'No pudimos iniciar el pago. Intentá de nuevo.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const title = expired
    ? 'Tu prueba gratis terminó'
    : isFreshSignup
      ? `Activá tu prueba gratis de ${trialDaysLeft} días`
      : `Activá tu prueba gratis: te quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? 'día' : 'días'}`;

  const subtitle = expired
    ? 'Dejá tu tarjeta en Mercado Pago para seguir usando TurnosPro. Se cobra el plan que elijas y se renueva solo cada mes. Cancelás cuando quieras.'
    : `Hoy no se te cobra nada${firstChargeDate ? `: el primer débito es el ${firstChargeDate}` : ''}. Después se renueva solo. Cancelás cuando quieras.`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.16em', color: 'primary.main', fontWeight: 600 }}
          >
            {isFreshSignup ? 'Bienvenido a TurnosPro' : 'Prueba gratis'}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mt: 1, mb: 1.5 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            {subtitle}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {plans.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(plans.length, 2)}, 1fr)`, md: `repeat(${Math.min(plans.length, 4)}, 1fr)` },
              gap: 2,
              mb: 3,
            }}
          >
            {plans.map((plan) => {
              const active = plan.code === selected;
              return (
                <Card
                  key={plan.code}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(plan.code)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelected(plan.code);
                  }}
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    border: 2,
                    borderColor: active ? 'primary.main' : 'divider',
                    boxShadow: active ? 4 : 0,
                    transition: 'border-color 150ms, box-shadow 150ms',
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  {plan.isPopular && (
                    <Chip
                      label="Más elegido"
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 10, right: 10 }}
                    />
                  )}
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, my: 0.5 }}>
                      {fmtPrice(plan.price, plan.currency)}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {' '}
                        /mes
                      </Typography>
                    </Typography>
                    {plan.description && (
                      <Typography variant="body2" color="text.secondary">
                        {plan.description}
                      </Typography>
                    )}
                    {active && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, color: 'primary.main' }}>
                        <CheckCircleIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Seleccionado
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Vas a activar el plan mensual. Podés cambiarlo cuando quieras desde tu panel.
          </Alert>
        )}

        <Card sx={{ maxWidth: 560, mx: 'auto' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {!expired && (
              <Box sx={{ mb: 2.5 }}>
                {[
                  `${trialDaysLeft} ${trialDaysLeft === 1 ? 'día' : 'días'} gratis desde hoy`,
                  firstChargeDate
                    ? `Primer cobro el ${firstChargeDate}${selectedPlan ? `: ${fmtPrice(selectedPlan.price, selectedPlan.currency)}` : ''}`
                    : 'Primer cobro recién al terminar la prueba',
                  'Cancelás cuando quieras desde tu panel',
                ].map((line) => (
                  <Box key={line} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                    <Typography variant="body2">{line}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={starting}
              onClick={start}
              sx={{ py: 1.5, fontWeight: 700 }}
            >
              {starting ? (
                <CircularProgress size={22} color="inherit" />
              ) : expired ? (
                'Activar mi suscripción'
              ) : (
                `Empezar gratis · ${trialDaysLeft} ${trialDaysLeft === 1 ? 'día' : 'días'}`
              )}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
              <LockOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Te lleva a Mercado Pago para autorizar el débito automático. Volvés acá al terminar.
              </Typography>
            </Box>

          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ActivateSubscription;
