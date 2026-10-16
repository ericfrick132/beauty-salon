import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { CheckCircle, Close, RocketLaunch } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PLAN_LIMIT_EVENT, PlanLimitError, PlanLimitKind } from '../../services/api';
import { bulletsByPlan, featuresOf, formatPlanPrice, isFeatureLimit, nextPlanFor, usedPercent, usePlans } from '../../utils/plans';
import { useTenantMoney } from '../../hooks/useTenantMoney';

const titleFor = (e: PlanLimitError, perStaff: number, nextName: string) => {
  switch (e.limit) {
    case 'bookings_per_month':
      return `Llegaste a las ${e.max} reservas del mes`;
    case 'staff':
      return `Tu plan incluye hasta ${e.max} agendas`;
    case 'coupons':
      return `Los cupones de descuento están incluidos desde ${nextName}`;
    case 'custom_fields':
      return e.max > 0
        ? `Llegaste ${e.max === 1 ? 'al campo personalizado' : `a los ${e.max} campos personalizados`} de ${e.planName}`
        : `Los campos del formulario están incluidos desde ${nextName}`;
    case 'recurring_bookings':
      return e.max > 0
        ? `Llegaste a las ${e.max} reservas recurrentes de ${e.planName}`
        : `Los turnos fijos están incluidos desde ${nextName}`;
    case 'customer_history':
      return `La ficha de clientes es del plan ${nextName}`;
    case 'tracking_pixels':
      return `El Píxel de Meta y Google Analytics son del plan ${nextName}`;
    case 'services':
    default:
      return `Tu plan incluye ${perStaff} ${perStaff === 1 ? 'servicio' : 'servicios'} por agenda`;
  }
};

/** Qué gana con la feature: se muestra cuando el backend no manda su propio mensaje. */
const pitchFor = (limit: PlanLimitKind): string | null => {
  switch (limit) {
    case 'coupons':
      return 'Creá códigos como VUELVE15 para premiar a tus clientes y llenar los horarios flojos.';
    case 'custom_fields':
      return 'Pedí en el formulario de reserva los datos que necesitás: obra social, patente, edad, lo que sea.';
    case 'recurring_bookings':
      return 'Agendá de una vez al cliente que viene todas las semanas o cada 15 días, sin cargar turno por turno.';
    case 'customer_history':
      return 'Mirá de cada cliente cuántas veces vino, cuánto gastó, cada cuánto vuelve y qué servicio prefiere.';
    case 'tracking_pixels':
      return 'Conectá tu página de reservas con Meta Ads y Google Analytics para saber qué campaña te trae turnos.';
    default:
      return null;
  }
};

/** Viñeta del plan que corresponde al límite, para mostrarla primero. */
const bulletMatch: Partial<Record<PlanLimitKind, RegExp>> = {
  coupons: /cup[oó]n/i,
  custom_fields: /campo/i,
  recurring_bookings: /recurrente/i,
  customer_history: /ficha|historial/i,
  tracking_pixels: /p[ií]xel|analytics/i,
};

const defaultNext: Partial<Record<PlanLimitKind, string>> = {
  coupons: 'Advance',
  custom_fields: 'Advance',
  recurring_bookings: 'Advance',
  customer_history: 'Pro',
  tracking_pixels: 'Pro',
};

const usedLabel = (e: PlanLimitError) => {
  switch (e.limit) {
    case 'bookings_per_month': return 'reservas este mes';
    case 'staff': return 'agendas activas';
    case 'recurring_bookings': return 'turnos fijos activos';
    case 'custom_fields': return 'campos personalizados';
    default: return 'servicios activos';
  }
};

/**
 * "Pasate de plan": se abre solo cuando el backend responde 403 PLAN_LIMIT (el interceptor de api.ts dispara
 * PLAN_LIMIT_EVENT). Muestra qué límite se tocó y el plan que lo levanta, con el CTA a la página de planes.
 */
const PlanLimitDialog: React.FC = () => {
  const navigate = useNavigate();
  const { plans } = usePlans();
  const { features } = useTenantMoney();
  const [error, setError] = useState<PlanLimitError | null>(null);

  useEffect(() => {
    const onLimit = (ev: Event) => {
      const detail = (ev as CustomEvent<PlanLimitError>).detail;
      if (detail?.code === 'PLAN_LIMIT') setError(detail);
    };
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
  }, []);

  if (!error) return null;

  const current = plans.find((p) => p.code === error.planCode);
  const perStaff = (current && featuresOf(current)?.maxServicesPerStaff) || 1;
  const next = nextPlanFor(plans, error.planCode, error.limit);
  const allNextBullets = next ? bulletsByPlan(plans, features.stripeDeposits)[next.code] ?? [] : [];
  const match = bulletMatch[error.limit];
  const relevant = match ? allNextBullets.filter((b) => match.test(b)) : [];
  const nextBullets = [...relevant, ...allNextBullets.filter((b) => !relevant.includes(b))].slice(0, 3);
  const nextName = next?.name ?? defaultNext[error.limit] ?? 'un plan superior';
  const pitch = pitchFor(error.limit);
  const showMeter = !isFeatureLimit(error.limit) && error.max > 0;
  const close = () => setError(null);
  const goToPlans = () => {
    close();
    navigate(next ? `/subscription/plans?highlight=${next.code}` : '/subscription/plans');
  };

  return (
    <Dialog open onClose={close} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <IconButton aria-label="Cerrar" onClick={close} sx={{ position: 'absolute', right: 8, top: 8 }}>
        <Close />
      </IconButton>
      <DialogContent sx={{ pt: 4 }}>
        <Chip label={`Plan ${error.planName}`} size="small" sx={{ mb: 1.5, fontWeight: 600 }} />
        <Typography variant="h6" fontWeight={800} sx={{ pr: 4, lineHeight: 1.25 }}>
          {titleFor(error, perStaff, nextName)}
        </Typography>
        {(error.message || pitch) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {error.message || pitch}
          </Typography>
        )}
        {error.message && pitch && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {pitch}
          </Typography>
        )}

        {showMeter && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{usedLabel(error)}</Typography>
              <Typography variant="caption" fontWeight={700}>{error.used}/{error.max}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={usedPercent(error.used, error.max)} color="error" sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        )}

        {next && (
          <Box sx={{ mt: 3, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'primary.main', bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={800}>Pasate a {next.name}</Typography>
              <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                {formatPlanPrice(next)}<Typography component="span" variant="caption" color="text.secondary"> /mes</Typography>
              </Typography>
            </Box>
            {next.tagline && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{next.tagline}</Typography>
            )}
            {nextBullets.map((b) => (
              <Box key={b} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
                <CheckCircle color="success" sx={{ fontSize: 18 }} />
                <Typography variant="body2">{b}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={close} color="inherit">Ahora no</Button>
        <Button variant="contained" startIcon={<RocketLaunch />} onClick={goToPlans}>
          Ver planes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanLimitDialog;
