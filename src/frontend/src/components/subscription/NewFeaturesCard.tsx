import React from 'react';
import { Box, Card, CardContent, Chip, Typography, ButtonBase } from '@mui/material';
import { CheckCircle, Lock, ChevronRight, AutoAwesome } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { firstPlanWith, FALLBACK_PLANS, NEW_FEATURES, usePlans } from '../../utils/plans';
import { checkoutPath } from '../../utils/planGates';

/**
 * "Novedades de tu plan": las features nuevas, cada una con "Incluido" o el candado y el plan que la trae.
 * Cada fila lleva a su página; si el plan no la incluye, va grisada con candado y lleva al checkout.
 */
const NewFeaturesCard: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { plans } = usePlans();
  const features = subscription?.features ?? null;
  if (!features) return null;

  return (
    <Card sx={{ mb: 3, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#111827' }}>Novedades de tu plan</Typography>
          <Chip label="Nuevo" size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#25d366', color: '#fff' }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 0.5 }}>
          {NEW_FEATURES.map((f) => {
            const included = f.includes(features);
            const plan = firstPlanWith(plans, f.includes) ?? firstPlanWith(FALLBACK_PLANS, f.includes);
            return (
              <ButtonBase
                key={f.key}
                onClick={() => navigate(included ? f.path : checkoutPath(f.limit, plan?.code))}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: 2, textAlign: 'left', justifyContent: 'flex-start', '&:hover': { bgcolor: 'action.hover' }, ...(included ? {} : { opacity: 0.6 }) }}
              >
                {included ? <CheckCircle color="success" fontSize="small" /> : <Lock color="action" fontSize="small" />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{f.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{f.pitch}</Typography>
                </Box>
                <Chip
                  size="small"
                  label={included ? 'Incluido' : `Plan ${plan?.name ?? 'superior'}`}
                  color={included ? 'success' : 'default'}
                  variant={included ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
                <ChevronRight fontSize="small" color="action" />
              </ButtonBase>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default NewFeaturesCard;
