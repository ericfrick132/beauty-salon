import React from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { CheckCircle, Lock, RocketLaunch } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PlanFeatures } from '../../services/api';
import { FALLBACK_PLANS, firstPlanWith, formatPlanPrice, usePlans } from '../../utils/plans';

interface FeaturePaywallProps {
  /** Qué tiene que tener el plan para incluir la feature (para resolver "Incluido en Advance/Pro"). */
  includes: (f: PlanFeatures) => boolean;
  /** Plan de respaldo si ni /subscription/plans ni el catálogo local resuelven cuál la incluye. */
  fallbackPlanCode?: string;
  fallbackPlanName?: string;
  title: string;
  description: string;
  bullets?: string[];
  icon?: React.ReactNode;
  /** Vista previa de cómo se ve la feature: se muestra borrosa detrás del cartel (o pasarla como children). */
  preview?: React.ReactNode;
  children?: React.ReactNode;
  /** Más compacto (ej. adentro de un drawer). */
  dense?: boolean;
}

/**
 * Paywall visual de una feature que el plan no incluye: muestra una vista previa borrosa de la pantalla con el
 * cartel "Incluido en …" y el CTA a la página de planes con ese plan resaltado. La feature se vende sola.
 */
const FeaturePaywall: React.FC<FeaturePaywallProps> = ({
  includes, fallbackPlanCode, fallbackPlanName, title, description, bullets = [], icon, preview, children, dense,
}) => {
  const navigate = useNavigate();
  const { plans } = usePlans();
  const plan = firstPlanWith(plans, includes) ?? firstPlanWith(FALLBACK_PLANS, includes);
  const planCode = plan?.code ?? fallbackPlanCode ?? '';
  const planName = plan?.name ?? fallbackPlanName ?? 'un plan superior';

  return (
    <Box sx={{ position: 'relative', minHeight: dense ? 420 : 520, borderRadius: 3, overflow: 'hidden' }}>
      <Box
        aria-hidden
        sx={{ filter: 'blur(5px)', opacity: 0.6, pointerEvents: 'none', userSelect: 'none', p: dense ? 1 : 2 }}
      >
        {preview ?? children}
      </Box>
      <Box
        sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.7) 60%)',
        }}
      >
        <Paper elevation={6} sx={{ maxWidth: 440, width: '100%', p: dense ? 2.5 : 3.5, borderRadius: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}>
              {icon ?? <Lock />}
            </Box>
          </Box>
          <Chip icon={<Lock sx={{ fontSize: 16 }} />} label={`Incluido en ${planName}`} color="primary" size="small" sx={{ fontWeight: 700, mb: 1.5 }} />
          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>
          {bullets.length > 0 && (
            <Box sx={{ textAlign: 'left', mt: 2 }}>
              {bullets.map((b) => (
                <Box key={b} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 0.75 }}>
                  <CheckCircle color="success" sx={{ fontSize: 18, mt: '2px' }} />
                  <Typography variant="body2">{b}</Typography>
                </Box>
              ))}
            </Box>
          )}
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<RocketLaunch />}
            sx={{ mt: 3 }}
            onClick={() => navigate(planCode ? `/subscription/plans?highlight=${planCode}` : '/subscription/plans')}
          >
            Pasate a {planName}{plan ? ` · ${formatPlanPrice(plan)}/mes` : ''}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default FeaturePaywall;
