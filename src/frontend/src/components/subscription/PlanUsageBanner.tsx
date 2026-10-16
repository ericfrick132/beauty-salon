import React, { useState } from 'react';
import { Alert, Box, Button, IconButton, LinearProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { isAdminLike } from '../../utils/permissions';
import { usedPercent, usePlanUsage } from '../../utils/plans';

const DISMISS_KEY = 'tp_plan_banner_dismissed';

/**
 * Aviso fino arriba del panel para los negocios en Gratuito: cuántas reservas del mes usaron y un atajo a
 * mejorar el plan. Ámbar desde el 80 %, rojo al llegar al tope (ahí no se puede cerrar: sus clientes ya no
 * pueden reservar online). Se cierra por sesión.
 */
const PlanUsageBanner: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const canManage = isAdminLike(role);
  const usage = usePlanUsage(canManage);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (!canManage || !usage || !usage.isFree || pathname.startsWith('/subscription')) return null;
  const max = usage.maxBookingsPerMonth;
  if (max < 0) return null;

  const used = usage.bookingsThisMonth;
  const pct = usedPercent(used, max);
  const atLimit = used >= max;
  const severity = atLimit ? 'error' : pct >= 80 ? 'warning' : 'info';
  if (dismissed && !atLimit) return null;
  // En el dashboard ya está la tarjeta de uso: el aviso solo aparece cuando se acerca al tope.
  if (pathname.startsWith('/dashboard') && severity === 'info') return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* sin storage: solo por ahora */ }
    setDismissed(true);
  };

  return (
    <Alert
      severity={severity}
      variant={atLimit ? 'standard' : 'outlined'}
      sx={{ mb: 2, py: 0, alignItems: 'center', '& .MuiAlert-message': { py: 1, flex: 1, minWidth: 0 } }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            variant={atLimit ? 'contained' : 'text'}
            color={atLimit ? 'error' : 'inherit'}
            onClick={() => navigate('/subscription/plans?highlight=plus')}
            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Mejorar plan
          </Button>
          {!atLimit && (
            <IconButton size="small" aria-label="Cerrar" onClick={dismiss}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      }
    >
      {atLimit ? (
        <>
          <strong>Llegaste al tope de {max} reservas:</strong> tus clientes no pueden reservar online hasta el mes que
          viene o hasta que mejores tu plan.
        </>
      ) : (
        <>
          <strong>Plan {usage.planName}</strong> · {used}/{max} reservas este mes
        </>
      )}
      <LinearProgress
        variant="determinate"
        value={pct}
        color={severity === 'info' ? 'primary' : severity}
        sx={{ mt: 0.75, height: 4, borderRadius: 2, maxWidth: 320 }}
      />
    </Alert>
  );
};

export default PlanUsageBanner;
