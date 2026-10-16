import React from 'react';
import { Box, Button, Card, CardContent, Chip, LinearProgress, Typography } from '@mui/material';
import { RocketLaunch, WorkspacePremium } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PlanUsage } from '../../services/api';
import { bulletsByPlan, formatLimit, formatPlanPrice, PLAN_PLUS, usedPercent, usePlans, usePlanUsage } from '../../utils/plans';

const Meter: React.FC<{ label: string; used: number; max: number; unlimitedLabel?: string }> = ({ label, used, max, unlimitedLabel = 'Ilimitadas' }) => {
  const unlimited = max < 0;
  const pct = usedPercent(used, max);
  const color = unlimited ? 'success' : pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'primary';
  return (
    <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
        <Typography variant="body2" fontWeight={700} noWrap>
          {unlimited ? `${used} · ${unlimitedLabel}` : `${used} / ${formatLimit(max)}`}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={unlimited ? 100 : pct} color={color} sx={{ height: 8, borderRadius: 4, opacity: unlimited ? 0.35 : 1 }} />
    </Box>
  );
};

const whatsAppLine = (u: PlanUsage): string | null => {
  const limit = u.whatsAppMonthlyLimit;
  if (limit === undefined) return null;
  if (limit < 0) return 'WhatsApp: mensajes ilimitados';
  if (limit === 0) return null;
  const remaining = Math.max(0, u.whatsAppIncludedRemaining ?? limit);
  return `WhatsApp incluidos este mes: ${Math.max(0, limit - remaining)} de ${limit}`;
};

/**
 * Tarjeta del dashboard con el plan y cuánto se usó de cada límite (/subscription/usage). En Gratuito es la
 * versión completa con el CTA a mejorar; en un plan pago, una línea compacta.
 */
const PlanUsageCard: React.FC = () => {
  const navigate = useNavigate();
  const usage = usePlanUsage();
  const { plans } = usePlans();
  if (!usage) return null;
  const plus = plans.find((p) => p.code === PLAN_PLUS);
  const plusBullets = plus ? (bulletsByPlan(plans)[PLAN_PLUS] ?? []).slice(0, 4) : [];

  const commission = `Comisión por cobro online: ${usage.commissionPercent.toLocaleString('es-AR')}%`;
  const wa = whatsAppLine(usage);

  if (!usage.isFree) {
    return (
      <Card sx={{ mb: 3, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: '12px !important' }}>
          <WorkspacePremium color="primary" />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#111827' }}>Tu plan: {usage.planName}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
            {usage.maxBookingsPerMonth < 0 ? `${usage.bookingsThisMonth} reservas este mes` : `${usage.bookingsThisMonth}/${usage.maxBookingsPerMonth} reservas este mes`}
            {' · '}{commission}{wa ? ` · ${wa}` : ''}
          </Typography>
          <Button size="small" onClick={() => navigate('/subscription/plans')}>Ver planes</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <WorkspacePremium color="primary" />
          <Typography variant="h6" fontWeight={700} sx={{ color: '#111827' }}>Tu plan: {usage.planName}</Typography>
          <Chip label="NUEVO" size="small" sx={{ bgcolor: '#ffd54f', color: '#5d4000', fontWeight: 700, height: 20 }} />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<RocketLaunch />} onClick={() => navigate('/subscription/plans?highlight=plus')}>
            Mejorar plan
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Meter label="Reservas del mes" used={usage.bookingsThisMonth} max={usage.maxBookingsPerMonth} />
          <Meter label="Agendas" used={usage.activeStaff} max={usage.maxStaff} />
          <Meter label="Servicios" used={usage.activeServices} max={usage.maxServices} unlimitedLabel="Ilimitados" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {commission}{wa ? ` · ${wa}` : ''}
        </Typography>
        {plus && plusBullets.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Con {plus.name} ({formatPlanPrice(plus)}/mes): {plusBullets.join(' · ')}.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanUsageCard;
